const mongoose = require('mongoose');
const Application = require('../models/Application');
const Contact = require('../models/Contact');

// Fields a client may set. UserId and ApplicationId are excluded on purpose:
// UserId comes from the token and ApplicationId from the URL.
const ALLOWED_FIELDS = ['Name', 'Role', 'Company', 'Email', 'Phone', 'NextFollowUp'];

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

// Confirms the application in the URL exists AND belongs to the logged-in user.
// Sends the error response itself and returns null when it doesn't.
const loadOwnedApplication = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid application id.' });
    return null;
  }
  const application = await Application.findOne({ _id: id, UserId: req.user.id }).select('_id');
  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
    return null;
  }
  return application;
};

// This gets contacts BASED on the application associated
// GET /api/applications/:id/contacts
exports.getContacts = async (req, res) => {
  try {
    const application = await loadOwnedApplication(req, res);
    if (!application) return;

    const data = await Contact.find({
      ApplicationId: application._id,
      UserId: req.user.id,
    }).sort({ Name: 1 });

    return res.status(200).json({ data, total: data.length });
  } catch (err) {
    return handleError(err, res, 'getContacts');
  }
};

// POST /api/applications/:id/contacts
exports.createContact = async (req, res) => {
  try {
    const application = await loadOwnedApplication(req, res);
    if (!application) return;

    const data = pickFields(req.body);
    if (!data.Name) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    data.UserId = req.user.id;
    data.ApplicationId = application._id;

    const contact = await Contact.create(data);
    return res.status(201).json(contact);
  } catch (err) {
    return handleError(err, res, 'createContact');
  }
};

// PATCH /api/applications/:id/contacts/:contactId
exports.updateContact = async (req, res) => {
  try {
    const application = await loadOwnedApplication(req, res);
    if (!application) return;

    const { contactId } = req.params;
    if (!mongoose.isValidObjectId(contactId)) {
      return res.status(400).json({ error: 'Invalid contact id.' });
    }

    const updates = pickFields(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }
    if ('Name' in updates && !updates.Name) {
      return res.status(400).json({ error: 'Name cannot be blank.' });
    }

    // Matching on ApplicationId too means a contact can't be reached
    // through a different application's URL.
    const contact = await Contact.findOneAndUpdate(
      { _id: contactId, ApplicationId: application._id, UserId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });

    return res.status(200).json(contact);
  } catch (err) {
    return handleError(err, res, 'updateContact');
  }
};

// DELETE /api/applications/:id/contacts/:contactId
exports.deleteContact = async (req, res) => {
  try {
    const application = await loadOwnedApplication(req, res);
    if (!application) return;

    const { contactId } = req.params;
    if (!mongoose.isValidObjectId(contactId)) {
      return res.status(400).json({ error: 'Invalid contact id.' });
    }

    const contact = await Contact.findOneAndDelete({
      _id: contactId,
      ApplicationId: application._id,
      UserId: req.user.id,
    });
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });

    return res.status(200).json({ message: 'Contact deleted.', id: contactId });
  } catch (err) {
    return handleError(err, res, 'deleteContact');
  }
};

/*
- This section will work with returning ALL contacts
- Will be a separate section in the website
*/

// GET /api/contacts
exports.getAllContacts = async (req, res) => {
  try {
    const userId = req.user.id; 

    const {q, company, role} = req.query; 

    const filter = {
      UserId: userId
    }; 

    // Search across contact fields
    if (typeof q === 'string' && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const search = new RegExp(escaped, 'i'); 

      filter.$or = [
        {Name: search}, 
        {Company: search}, 
        {Role: search}, 
        {Email: search}
      ]; 
    }

    if (typeof company === 'string' && company.trim()) {
      const escaped = company.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.Company = new RegExp(escaped, 'i'); 
    }

    if (typeof role === 'string' && role.trim()) {
      const escaped = role.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.Role = new RegExp(escaped, 'i'); 
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1), 
      100
    ); 

    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .populate('ApplicationId', 'Company Role Status')
        .sort({Name: 1, _id: 1})
        .skip((page -1) * limit)
        .limit(limit),

      Contact.countDocuments(filter)
    ]); 

    return res.status(200).json({
      data: contacts, 
      page, 
      limit, 
      total, 
      totalPages: Math.ceil(total/limit)
    }); 

  } catch (err) {
    console.error('getAllContacts error:', err); 

    return res.status(500).json({
      error: 'Server error.'
    }); 
  }
}; 