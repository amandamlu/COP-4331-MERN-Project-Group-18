const mongoose = require('mongoose');
const Application = require('../models/Application');
const EmailImport = require('../models/EmailImport');
const User = require('../models/User');
const applicationService = require('../services/applicationService');
const { matchEmailToApplication, getStatusAction } = require('../services/emailApplicationMatcher');
const { parseEmail } = require('../services/emailParser');

const STATUS_VALUES = new Set(Application.schema.path('Status').enumValues);
const EDIT_LIMITS = { company: 200, role: 200, status: 30, referenceNumber: 80, dateApplied: 10 };

class EmailImportError extends Error {
  constructor(status, message, match) {
    super(message);
    this.status = status;
    this.match = match;
  }
}

async function requireImportUser(req, res, next) {
  res.set('Cache-Control', 'no-store');
  if (!mongoose.isObjectIdOrHexString(req.user.sub) || !await User.exists({ _id: req.user.sub })) {
    throw new EmailImportError(401, 'Invalid user identity.');
  }
  next();
}

function handleImportError(error, req, res, next) {
  if (!(error instanceof EmailImportError)) return next(error);
  return res.status(error.status).json({ error: error.message, match: error.match });
}

function importFilter(req) {
  const { id } = req.params;
  if (!mongoose.isObjectIdOrHexString(id)) throw new EmailImportError(400, 'Invalid email import ID.');
  return { _id: id, UserId: req.user.sub };
}

async function getImport(filter, session) {
  const record = await EmailImport.findOne(filter).session(session).lean();
  if (!record) throw new EmailImportError(404, 'Email import not found.');
  return record;
}

function parseStoredImport(record) {
  if (record.Parsed) return record.Parsed;
  const parsed = parseEmail({ subject: record.Subject, body: record.BodyText });
  if (record.BodyTruncated) parsed.requiresReview = true;
  return parsed;
}

function currentMatch(record, parsed, session) {
  return matchEmailToApplication({
    userId: record.UserId, parsed, session,
    bodyTruncated: Boolean(record.BodyTruncated && parsed.requiresReview),
  });
}

function readBody(body, allowedFields) {
  body = body ?? {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new EmailImportError(400, 'Expected a JSON object.');
  }
  if (Object.keys(body).some((field) => !allowedFields.includes(field))) {
    throw new EmailImportError(400, 'Request contains unsupported fields.');
  }
  return body;
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function listImports(req, res) {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isInteger(limit) ||
      limit < 1 || limit > 100 || !Number.isSafeInteger(skip)) {
    throw new EmailImportError(400, 'Use a positive page and a limit between 1 and 100.');
  }

  const filter = { UserId: req.user.sub, Status: 'pending' };
  const [data, total] = await Promise.all([
    EmailImport.find(filter).select('-BodyText').sort({ CreatedAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    EmailImport.countDocuments(filter),
  ]);
  return res.json({ data, total, page, limit });
}

async function getImportDetails(req, res) {
  const record = await getImport(importFilter(req));
  if (record.Status !== 'pending') return res.json(record);
  const parsed = parseStoredImport(record);
  return res.json({ ...record, Parsed: parsed, Match: await currentMatch(record, parsed) });
}

async function editImport(req, res) {
  const filter = importFilter(req);
  const edits = Object.entries(readBody(req.body, Object.keys(EDIT_LIMITS)));
  if (!edits.length) throw new EmailImportError(400, 'Provide at least one field to edit.');

  const record = await getImport(filter);
  if (record.Status !== 'pending') throw new EmailImportError(409, 'Only pending imports can be edited.');
  const parsed = { ...parseStoredImport(record) };

  for (const [field, input] of edits) {
    const value = typeof input === 'string' ? input.trim() : input;
    if (value !== null && (typeof value !== 'string' || !value || value.length > EDIT_LIMITS[field])) {
      throw new EmailImportError(400, `${field} must be null or a nonempty string of at most ${EDIT_LIMITS[field]} characters.`);
    }
    if (field === 'status' && value !== null && !STATUS_VALUES.has(value)) {
      throw new EmailImportError(400, 'Invalid application status.');
    }
    if (field === 'dateApplied' && value !== null && !validDate(value)) {
      throw new EmailImportError(400, 'dateApplied must be a valid date in YYYY-MM-DD format.');
    }
    parsed[field] = value;
  }

  parsed.requiresReview = !parsed.company || !parsed.role || !parsed.status;
  const match = await currentMatch(record, parsed);
  const updated = await EmailImport.findOneAndUpdate(
    { ...filter, Status: 'pending', LastUpdated: record.LastUpdated ?? null },
    { $set: { Parsed: parsed, Match: match } },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!updated) throw new EmailImportError(409, 'The import changed. Refresh it and try again.');
  return res.json(updated);
}

function getApprovalChoice(body) {
  const choice = readBody(body, ['applicationId', 'action']);
  const selectsApplication = Object.hasOwn(choice, 'applicationId');
  const selectsCreate = Object.hasOwn(choice, 'action');
  if ((selectsApplication && (selectsCreate || !mongoose.isObjectIdOrHexString(choice.applicationId))) ||
      (selectsCreate && choice.action !== 'create')) {
    throw new EmailImportError(400, 'Specify a valid applicationId or action "create", or send an empty object.');
  }
  return choice;
}

async function applyToApplication(userId, parsed, match, choice, session) {
  if (choice.action === 'create' || (!choice.applicationId && match.action === 'create')) {
    if (match.action !== 'create' && match.reason !== 'company_only_match') {
      throw new EmailImportError(409, 'Review the existing application matches before creating a record.', match);
    }
    const fields = { Company: parsed.company, Role: parsed.role, Status: parsed.status };
    if (parsed.referenceNumber) fields.ReferenceNumber = parsed.referenceNumber;
    if (parsed.dateApplied) fields.DateApplied = parsed.dateApplied;
    const application = await applicationService.createApplication(userId, fields, session);
    return { application, action: 'create' };
  }

  const applicationId = choice.applicationId ?? (['update', 'none'].includes(match.action) ? match.applicationId : null);
  if (!applicationId) throw new EmailImportError(409, 'Review the suggestion and choose an application or explicitly create one.', match);
  const application = await Application.findOne({ _id: applicationId, UserId: userId }).session(session).lean();
  if (!application) throw new EmailImportError(404, 'Application not found.');

  const candidateIds = [match.applicationId, ...(match.candidateIds ?? [])];
  if (!candidateIds.some((candidate) => String(candidate) === String(application._id))) {
    throw new EmailImportError(409, 'The selected application is no longer a match.', match);
  }

  const action = getStatusAction(application.Status, parsed.status);
  if (action === 'review') throw new EmailImportError(409, 'The current application status prevents this change. Refresh the import and review the status.', match);
  if (action === 'none') return { application, action };

  const updated = await applicationService.updateApplication(userId, application._id, { Status: parsed.status }, session);
  if (!updated) throw new EmailImportError(409, 'The application changed. Refresh it and try again.', match);
  return { application: updated, action };
}

async function approveImport(req, res) {
  const filter = importFilter(req);
  const choice = getApprovalChoice(req.body);

  const result = await mongoose.connection.transaction(async (session) => {
    const record = await getImport(filter, session);
    if (record.Status === 'approved') {
      const application = record.ApplicationId
        ? await Application.findOne({ _id: record.ApplicationId, UserId: filter.UserId }).session(session).lean()
        : null;
      return { import: record, application };
    }
    if (record.Status !== 'pending') throw new EmailImportError(409, 'Only pending imports can be approved.');

    const parsed = parseStoredImport(record);
    if (!parsed.company?.trim() || !parsed.role?.trim() || !STATUS_VALUES.has(parsed.status) ||
        (parsed.dateApplied != null && !validDate(parsed.dateApplied))) {
      throw new EmailImportError(422, 'Confirm the company, role, status, and any application date before approval.');
    }
    if (parsed.requiresReview) throw new EmailImportError(409, 'Confirm the extracted fields with PATCH before approving.');

    const match = await currentMatch(record, parsed, session);
    const priorMatch = record.Match;
    if (!choice.applicationId && !choice.action && priorMatch &&
        ((priorMatch.applicationId && String(priorMatch.applicationId) !== String(match.applicationId)) ||
         (priorMatch.action === 'create' && match.action !== 'create'))) {
      throw new EmailImportError(409, 'The suggested application changed. Review the current match and confirm your choice.', match);
    }
    const { application, action } = await applyToApplication(filter.UserId, parsed, match, choice, session);
    const appliedMatch = { ...match, action, applicationId: application._id };
    const updated = await EmailImport.findOneAndUpdate(
      { ...filter, Status: 'pending' },
      { $set: { Status: 'approved', ApplicationId: application._id, Parsed: parsed, Match: appliedMatch } },
      { returnDocument: 'after', runValidators: true, session },
    ).lean();
    if (!updated) throw new EmailImportError(409, 'The import changed. Refresh it and try again.');
    return { import: updated, application };
  });

  return res.json(result);
}

async function dismissImport(req, res) {
  const filter = importFilter(req);
  readBody(req.body, []);
  const dismissed = await EmailImport.findOneAndUpdate(
    { ...filter, Status: 'pending' },
    { $set: { Status: 'dismissed' } },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (dismissed) return res.json(dismissed);

  const record = await getImport(filter);
  if (record.Status === 'dismissed') return res.json(record);
  throw new EmailImportError(409, 'Only pending imports can be dismissed.');
}

module.exports = { requireImportUser, handleImportError, listImports, getImportDetails, editImport, approveImport, dismissImport };
