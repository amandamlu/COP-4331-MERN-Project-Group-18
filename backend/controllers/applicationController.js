const mongoose = require('mongoose');
const Application = require('../models/Application');
const Contact = require('../models/Contact');

// Fields a client may set. UserId is excluded on purpose: it always comes
// from the verified token, never from the request body.
const ALLOWED_FIELDS = [
  'Company',
  'Role',
  'Location',
  'Status',
  'SalaryHourly',
  'DateApplied',
  'JobLink',
  'Notes',
];

const SORTABLE_FIELDS = [
  'Company',
  'Role',
  'Status',
  'SalaryHourly',
  'DateApplied',
  'LastUpdated',
];

const STATUS_VALUES = Application.schema.path('Status').enumValues;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Pick allowed fields from the body and trim strings
const pickFields = (body = {}) => {
  const data = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
    }
  }
  return data;
};

const handleError = (err, res, label) => {
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Validation failed.', details });
  }
  console.error(`${label} error:`, err);
  return res.status(500).json({ error: 'Server error.' });
};

const invalidId = (id) => !mongoose.isValidObjectId(id);

// POST /api/applications
exports.createApplication = async (req, res) => {
  try {
    const data = pickFields(req.body);

    if (!data.Company || !data.Role) {
      return res.status(400).json({ error: 'Company and Role are required.' });
    }

    data.UserId = req.user.id;

    const application = await Application.create(data);
    return res.status(201).json(application);
  } catch (err) {
    return handleError(err, res, 'createApplication');
  }
};

// GET /api/applications
// Query params (all optional):
//   q                  text search across Company, Role, Location, Notes
//   status             one or more statuses, comma-separated (e.g. Applied,Interviewing)
//   company, location  case-insensitive partial match
//   minSalary, maxSalary   hourly salary range
//   appliedFrom, appliedTo DateApplied range, YYYY-MM-DD (inclusive)
//   sortBy, order      sort field (see SORTABLE_FIELDS) and asc|desc (default LastUpdated desc)
//   page, limit        pagination (default 1 and 20, max limit 100)
exports.getApplications = async (req, res) => {
  try {
    const {
      q, status, company, location,
      minSalary, maxSalary, appliedFrom, appliedTo,
      sortBy, order,
    } = req.query;

    const filter = { UserId: req.user.id };

    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ Company: rx }, { Role: rx }, { Location: rx }, { Notes: rx }];
    }

    if (status) {
      const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
      const bad = statuses.filter((s) => !STATUS_VALUES.includes(s));
      if (bad.length) {
        return res.status(400).json({
          error: `Invalid status: ${bad.join(', ')}.`,
          allowed: STATUS_VALUES,
        });
      }
      filter.Status = { $in: statuses };
    }

    if (company) filter.Company = new RegExp(escapeRegex(company.trim()), 'i');
    if (location) filter.Location = new RegExp(escapeRegex(location.trim()), 'i');

    if (minSalary !== undefined || maxSalary !== undefined) {
      filter.SalaryHourly = {};
      if (minSalary !== undefined) {
        if (Number.isNaN(Number(minSalary))) {
          return res.status(400).json({ error: 'minSalary must be a number.' });
        }
        filter.SalaryHourly.$gte = Number(minSalary);
      }
      if (maxSalary !== undefined) {
        if (Number.isNaN(Number(maxSalary))) {
          return res.status(400).json({ error: 'maxSalary must be a number.' });
        }
        filter.SalaryHourly.$lte = Number(maxSalary);
      }
    }

    // Dates are stored as YYYY-MM-DD strings, so string comparison sorts correctly
    const dateRx = /^\d{4}-\d{2}-\d{2}$/;
    if (appliedFrom || appliedTo) {
      filter.DateApplied = {};
      if (appliedFrom) {
        if (!dateRx.test(appliedFrom)) {
          return res.status(400).json({ error: 'appliedFrom must be YYYY-MM-DD.' });
        }
        filter.DateApplied.$gte = appliedFrom;
      }
      if (appliedTo) {
        if (!dateRx.test(appliedTo)) {
          return res.status(400).json({ error: 'appliedTo must be YYYY-MM-DD.' });
        }
        filter.DateApplied.$lte = appliedTo;
      }
    }

    const sortField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : 'LastUpdated';
    const sortDir = order === 'asc' ? 1 : -1;

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

    const [data, total] = await Promise.all([
      Application.find(filter)
        .sort({ [sortField]: sortDir, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Application.countDocuments(filter),
    ]);

    return res.status(200).json({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return handleError(err, res, 'getApplications');
  }
};

// GET /api/applications/stats
exports.getApplicationStats = async (req, res) => {
  try {
    const userId = req.user.sub; 

    const stats = await Application.aggregate([
      {
        $match: {
          UserId: new mongoose.Types.ObjectId(userId)
        }
      }, 

      {
        $group: {
          _id: '$Status', 
          count: {$sum: 1}
        }
      }
    ]);

    const applicationsByStatus = {
      Applied: 0, 
      Interviewing: 0, 
      Offer: 0, 
      Rejected: 0, 
      Withdrawn: 0
    };

    for (const stat of stats) {
      if (Object.hasOwn(applicationsByStatus, stat._id)) {
        applicationsByStatus[stat._id] = stat.count;
      }
    }

    const totalApplications = Object.values(
      applicationsByStatus
    ).reduce((sum, count) => sum + count, 0);
    

    return res.status(200).json({
      totalApplications, 
      interviewing: applicationsByStatus.Interviewing, 
      offers: applicationsByStatus.Offer, 
      applicationsByStatus
    });


  } catch (err) {
    return handleError(err, res, 'getApplicationStats'); 
  }
}

// GET /api/applications/:id
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ error: 'Invalid application id.' });

    const application = await Application.findOne({ _id: id, UserId: req.user.id });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    return res.status(200).json(application);
  } catch (err) {
    return handleError(err, res, 'getApplicationById');
  }
};

// PATCH /api/applications/:id
exports.updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ error: 'Invalid application id.' });

    const updates = pickFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }
    if ('Company' in updates && !updates.Company) {
      return res.status(400).json({ error: 'Company cannot be blank.' });
    }
    if ('Role' in updates && !updates.Role) {
      return res.status(400).json({ error: 'Role cannot be blank.' });
    }

    const application = await Application.findOneAndUpdate(
      { _id: id, UserId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    return res.status(200).json(application);
  } catch (err) {
    return handleError(err, res, 'updateApplication');
  }
};

// DELETE /api/applications/:id
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    if (invalidId(id)) return res.status(400).json({ error: 'Invalid application id.' });

    const application = await Application.findOneAndDelete({ _id: id, UserId: req.user.id });
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    // Remove the contacts that belonged to this application so none are orphaned
    const { deletedCount } = await Contact.deleteMany({
      ApplicationId: id,
      UserId: req.user.id,
    });

    return res.status(200).json({
      message: 'Application deleted.',
      id,
      contactsDeleted: deletedCount,
    });
  } catch (err) {
    return handleError(err, res, 'deleteApplication');
  }
};