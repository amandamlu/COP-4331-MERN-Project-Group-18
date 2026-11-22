const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const EmailImport = require('../models/EmailImport');
const { matchEmailToApplication } = require('../services/emailApplicationMatcher');
const { savePendingImport } = require('../services/emailImportService');

const owner = new mongoose.Types.ObjectId();
const anotherUser = new mongoose.Types.ObjectId();
const parsed = { company: 'Example Robotics', role: 'Software Engineering Intern', status: 'Interviewing' };

function application(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(), UserId: owner,
    Company: parsed.company, Role: parsed.role, Status: 'Applied', ...overrides,
  };
}

function stubApplications(t, applications) {
  t.mock.method(Application.collection, 'find', (filter) => {
    assert.deepEqual(filter, { UserId: owner });
    return { toArray: async () => applications.filter((app) => app.UserId.equals(filter.UserId)) };
  });
}

test('suggests a new application when there are no matches for the owner', async (t) => {
  stubApplications(t, [application({ UserId: anotherUser })]);
  const result = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, status: 'Applied' } });

  assert.deepEqual(result, { action: 'create', reason: 'no_match', proposedStatus: 'Applied' });
});

test('matches legacy applications by normalized company and role', async (t) => {
  const existing = application({ Company: '  EXAMPLE ROBOTICS ', Role: 'Software-Engineering  Intern' });
  stubApplications(t, [existing]);
  const result = await matchEmailToApplication({ userId: owner, parsed });

  assert.deepEqual(result, {
    action: 'update', reason: 'company_and_role', applicationId: existing._id,
    currentStatus: 'Applied', proposedStatus: 'Interviewing',
  });
});

test('a reference can identify an application even when the email omits the role', async (t) => {
  const existing = application({ ReferenceNumber: ' ar-123 ', Status: 'Interviewing' });
  stubApplications(t, [existing, application()]);
  const result = await matchEmailToApplication({ userId: owner, parsed: {
    ...parsed, role: null, referenceNumber: 'AR-123', status: 'Rejected', requiresReview: true,
  } });

  assert.equal(result.action, 'update');
  assert.equal(result.reason, 'reference_number');
  assert.equal(result.applicationId, existing._id);
  assert.equal(result.proposedStatus, 'Rejected');
});

test('multiple exact matches and company-only matches require review', async (t) => {
  const first = application();
  const second = application();
  stubApplications(t, [first, second, application({ UserId: anotherUser })]);

  const duplicate = await matchEmailToApplication({ userId: owner, parsed });
  assert.equal(duplicate.action, 'review');
  assert.equal(duplicate.reason, 'multiple_matches');
  assert.deepEqual(duplicate.candidateIds, [first._id, second._id]);

  const companyOnly = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, role: null } });
  assert.equal(companyOnly.action, 'review');
  assert.equal(companyOnly.reason, 'company_only_match');
});

test('a conflicting reference never selects an existing record for update', async (t) => {
  stubApplications(t, [application({ ReferenceNumber: 'OTHER-123' })]);
  const result = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, referenceNumber: 'AR-123' } });

  assert.equal(result.action, 'review');
  assert.equal(result.reason, 'reference_conflict');
});

test('a stale confirmation and a rejection after an offer require review', async (t) => {
  const existing = application({ Status: 'Offer' });
  stubApplications(t, [existing]);
  for (const status of ['Applied', 'Rejected']) {
    const result = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, status } });
    assert.equal(result.action, 'review');
    assert.equal(result.reason, 'status_change_requires_review');
    assert.equal(result.currentStatus, 'Offer');
  }

  const repeated = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, status: 'Offer' } });
  assert.equal(repeated.action, 'none');
  assert.equal(repeated.reason, 'status_unchanged');
});

test('a truncated body or missing status cannot produce an update suggestion', async (t) => {
  stubApplications(t, [application({ ReferenceNumber: 'AR-123' })]);
  const result = await matchEmailToApplication({ userId: owner, bodyTruncated: true, parsed: {
    ...parsed, company: null, role: null, referenceNumber: 'AR-123',
  } });
  assert.equal(result.action, 'review');

  const unknown = await matchEmailToApplication({ userId: owner, parsed: { ...parsed, status: null } });
  assert.equal(unknown.action, 'review');
});

test('stores the suggestion when a new email arrives and keeps the import pending', async (t) => {
  const existing = application({ ReferenceNumber: 'AR-123' });
  stubApplications(t, [existing]);
  t.mock.method(EmailImport, 'init', async () => {});
  t.mock.method(EmailImport.collection, 'updateOne', async (filter, update) => {
    assert.deepEqual(filter, { ResendEmailId: 'fixture-45' });
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    assert.equal(update.$setOnInsert.Status, 'pending');
    assert.equal(update.$setOnInsert.Parsed.referenceNumber, 'AR-123');
    assert.deepEqual(update.$setOnInsert.Match.applicationId, existing._id);
    assert.equal(update.$setOnInsert.Match.action, 'update');
    assert.equal(update.$setOnInsert.Match.proposedStatus, 'Interviewing');
    return { upsertedCount: 1 };
  });

  assert.equal(await savePendingImport({ userId: owner, emailId: 'fixture-45', email: {
    subject: 'Interview invitation',
    text: 'Company: Example Robotics\nRole: Software Engineering Intern\nApplication ID: AR-123',
  } }), true);
});
