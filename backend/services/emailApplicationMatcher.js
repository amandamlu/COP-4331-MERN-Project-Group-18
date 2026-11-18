const { isObjectIdOrHexString } = require('mongoose');
const Application = require('../models/Application');

const VALID_STATUSES = new Set(Application.schema.path('Status').enumValues);
const FORWARD_TRANSITIONS = new Map([
  ['Applied', new Set(['Interviewing', 'Offer', 'Rejected'])],
  ['Interviewing', new Set(['Offer', 'Rejected'])],
]);

function normalizeName(value) {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}+#&]+/gu, ' ')
    .trim();
}

function normalizeReference(value) {
  return typeof value === 'string' ? value.normalize('NFKC').trim().toUpperCase() : '';
}

function getStatusAction(currentStatus, proposedStatus) {
  if (!VALID_STATUSES.has(proposedStatus)) return 'review';
  if (currentStatus === proposedStatus) return 'none';
  return FORWARD_TRANSITIONS.get(currentStatus)?.has(proposedStatus) ? 'update' : 'review';
}

async function matchEmailToApplication({ userId, parsed, bodyTruncated = false, session }) {
  if (!isObjectIdOrHexString(userId)) throw new TypeError('A valid application owner is required');

  const company = normalizeName(parsed.company);
  const role = normalizeName(parsed.role);
  const reference = normalizeReference(parsed.referenceNumber);
  const proposedStatus = VALID_STATUSES.has(parsed.status) ? parsed.status : null;
  const needsReview = bodyTruncated || (parsed.requiresReview && company && role);

  const review = (reason, candidates = []) => ({
    action: 'review', reason, proposedStatus, candidateIds: candidates.map(({ _id }) => _id),
  });
  if (!company && !reference) return review('missing_company_or_reference');

  const applications = await Application.find({ UserId: userId })
    .select('Company Role Status ReferenceNumber')
    .session(session)
    .lean();

  function matched(application, reason) {
    const currentStatus = application.Status;
    const result = { applicationId: application._id, currentStatus, proposedStatus };
    if (!proposedStatus || needsReview) {
      return { ...result, ...review('uncertain_email_details') };
    }
    const action = getStatusAction(currentStatus, proposedStatus);
    if (action === 'none') return { ...result, action, reason: 'status_unchanged' };
    if (action === 'review') {
      return { ...result, ...review('status_change_requires_review') };
    }
    return { ...result, action: 'update', reason };
  }

  const sameCompany = (application) => normalizeName(application.Company) === company;
  const sameRole = (application) => normalizeName(application.Role) === role;

  if (reference) {
    const byReference = applications.filter((app) => normalizeReference(app.ReferenceNumber) === reference);
    if (byReference.length) {
      const compatible = byReference.filter((app) => (!company || sameCompany(app)) && (!role || sameRole(app)));
      if (compatible.length === 1) return matched(compatible[0], 'reference_number');
      return compatible.length > 1
        ? review('multiple_matches', compatible)
        : review('reference_conflict', byReference);
    }
  }

  const byCompany = company ? applications.filter(sameCompany) : [];
  const exact = role ? byCompany.filter(sameRole) : [];
  const [application] = exact;
  if (exact.length > 1) return review('multiple_matches', exact);
  if (application) {
    if (reference && normalizeReference(application.ReferenceNumber)) {
      return review('reference_conflict', exact);
    }
    return matched(application, 'company_and_role');
  }
  if (byCompany.length) return review('company_only_match', byCompany);
  if (!company || !role || !proposedStatus || needsReview) return review('uncertain_email_details');

  return { action: 'create', reason: 'no_match', proposedStatus };
}

module.exports = { matchEmailToApplication, getStatusAction };
