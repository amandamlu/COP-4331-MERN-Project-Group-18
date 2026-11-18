const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Application = require('../models/Application');
const EmailImport = require('../models/EmailImport');
const User = require('../models/User');
const emailRoutes = require('../routes/email');

const owner = new mongoose.Types.ObjectId();
const otherOwner = new mongoose.Types.ObjectId();
const parsed = { company: 'Example Robotics', role: 'Engineering Intern', status: 'Interviewing', requiresReview: false };

function makeImport(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(), UserId: owner, Status: 'pending',
    Subject: 'Interview invitation', BodyText: 'We would like to schedule an interview.',
    CreatedAt: new Date(), LastUpdated: new Date(), Parsed: parsed, ...overrides,
  };
}

function makeApplication(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(), UserId: owner, Status: 'Applied',
    Company: parsed.company, Role: parsed.role, Notes: 'Keep these notes', ...overrides,
  };
}

async function fixture(t, imports, applications = []) {
  const jwtSecret = 'email-review-test-secret';
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = jwtSecret;
  t.after(() => {
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });

  const client = new mongoose.mongo.MongoClient('mongodb://127.0.0.1');
  const session = client.startSession();
  t.after(() => session.endSession());
  const state = { imports, applications, failApproval: false };
  const find = (filter, records) => records.filter((record) =>
    Object.entries(filter).every(([field, value]) => String(record[field] ?? null) === String(value ?? null)));

  t.mock.method(User.collection, 'findOne', async ({ _id }) =>
    [owner, otherOwner].some((id) => id.equals(_id)) ? { _id } : null);
  t.mock.method(EmailImport.collection, 'findOne', async (filter) => find(filter, state.imports)[0] ?? null);
  t.mock.method(EmailImport.collection, 'find', (filter, options) => ({
    toArray: async () => find(filter, state.imports).slice(options.skip, options.skip + options.limit)
      .map(({ BodyText, ...row }) => options.projection?.BodyText === 0 ? row : { ...row, BodyText }),
  }));
  t.mock.method(EmailImport.collection, 'countDocuments', async (filter) => find(filter, state.imports).length);
  t.mock.method(EmailImport.collection, 'findOneAndUpdate', async (filter, { $set }, options) => {
    const record = find(filter, state.imports)[0];
    if (!record) return null;
    if ($set.Status === 'approved') {
      assert.equal(options.session, session);
      if (state.failApproval) throw new Error('Simulated failure saving approval');
    }
    const updated = { ...record, ...$set };
    state.imports = state.imports.map((row) => row === record ? updated : row);
    return updated;
  });
  t.mock.method(Application.collection, 'findOne', async (filter, options) => {
    assert.equal(options.session, session);
    return find(filter, state.applications)[0] ?? null;
  });
  t.mock.method(Application.collection, 'find', (filter) => ({ toArray: async () => find(filter, state.applications) }));
  t.mock.method(Application.collection, 'insertOne', async (record, options) => {
    assert.equal(options.session, session);
    state.applications = [...state.applications, record];
    return { acknowledged: true, insertedId: record._id };
  });
  t.mock.method(Application.collection, 'findOneAndUpdate', async (filter, { $set }, options) => {
    assert.equal(options.session, session);
    const record = find(filter, state.applications)[0];
    if (!record) return null;
    const updated = { ...record, ...$set };
    state.applications = state.applications.map((row) => row === record ? updated : row);
    return updated;
  });
  t.mock.method(mongoose.connection, 'transaction', async (fn) => {
    const snapshot = { imports: state.imports, applications: state.applications };
    try {
      return await fn(session);
    } catch (error) {
      Object.assign(state, snapshot);
      throw error;
    }
  });

  const app = express();
  app.use(express.json());
  app.use('/api/email', emailRoutes);
  app.use((error, req, res, next) => res.status(500).json({ error: 'Internal server error.' }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  async function request(path = '', { method = 'GET', body, userId = owner } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (userId) headers.authorization = `Bearer ${jwt.sign({}, jwtSecret, { subject: String(userId) })}`;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/email/imports${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, body: await response.json() };
  }

  return { state, request };
}

test('lists only this user’s pending imports and protects all import operations', async (t) => {
  const mine = makeImport();
  const theirs = makeImport({ UserId: otherOwner });
  const { request } = await fixture(t, [mine, theirs, makeImport({ Status: 'dismissed' })]);
  assert.equal((await request('', { userId: null })).status, 401);
  assert.equal((await request('', { userId: new mongoose.Types.ObjectId() })).status, 401);
  const result = await request();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.body.total, 1);
  assert.equal(result.body.data[0]._id, String(mine._id));
  assert.equal(result.body.data[0].BodyText, undefined);
  assert.equal((await request(`/${mine._id}`)).body.BodyText, mine.BodyText);
  const otherPath = `/${theirs._id}`;
  assert.equal((await request(otherPath)).status, 404);
  assert.equal((await request(otherPath, { method: 'PATCH', body: { role: 'Senior Intern' } })).status, 404);
  assert.equal((await request(`${otherPath}/approve`, { method: 'POST' })).status, 404);
  assert.equal((await request(`${otherPath}/dismiss`, { method: 'POST' })).status, 404);
});

test('supports correcting a legacy import and creates one application across approval retries', async (t) => {
  const record = makeImport({ Parsed: undefined, BodyText: 'We would like to schedule an interview.' });
  const { request, state } = await fixture(t, [record]);
  const path = `/${record._id}`;
  const detail = await request(path);
  assert.equal(detail.body.Parsed.status, 'Interviewing');
  assert.equal(detail.body.Match.action, 'review');
  assert.equal((await request(`${path}/approve`, { method: 'POST' })).status, 422);
  assert.equal((await request(path, { method: 'PATCH', body: { UserId: otherOwner } })).status, 400);
  assert.equal((await request(path, { method: 'PATCH', body: { dateApplied: '2026-02-30' } })).status, 400);
  assert.equal((await request(path, { method: 'PATCH', body: { status: 'Hired' } })).status, 400);

  const edit = await request(path, { method: 'PATCH', body: {
    company: ' Example Robotics ', role: 'Engineering Intern', status: 'Applied',
    dateApplied: '2026-11-17', referenceNumber: 'APP-100',
  } });
  assert.equal(edit.body.Match.action, 'create');
  const approval = await request(`${path}/approve`, { method: 'POST' });
  assert.equal(approval.status, 200);
  assert.equal(approval.body.import.Status, 'approved');
  assert.equal(approval.body.application.Company, 'Example Robotics');
  assert.equal(approval.body.application.DateApplied, '2026-11-17');
  assert.equal(approval.body.application.ReferenceNumber, 'APP-100');
  const retry = await request(`${path}/approve`, { method: 'POST' });
  assert.equal(retry.body.application._id, approval.body.application._id);
  assert.equal(state.applications.length, 1);
  assert.equal((await request()).body.total, 0);
});

test('updates only the selected matching application and preserves unrelated fields', async (t) => {
  const record = makeImport();
  const first = makeApplication();
  const second = makeApplication({ DateApplied: '2026-11-12' });
  const theirs = makeApplication({ UserId: otherOwner });
  const { request, state } = await fixture(t, [record], [first, second, theirs]);
  const path = `/${record._id}/approve`;
  const ambiguous = await request(path, { method: 'POST' });
  assert.equal(ambiguous.status, 409);
  assert.equal(ambiguous.body.match.candidateIds.length, 2);
  assert.equal((await request(path, { method: 'POST', body: { applicationId: theirs._id } })).status, 404);
  const approved = await request(path, { method: 'POST', body: { applicationId: second._id } });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.application.Status, 'Interviewing');
  assert.equal(approved.body.application.Notes, second.Notes);
  assert.equal(approved.body.application.DateApplied, second.DateApplied);
  assert.equal(state.applications[0].Status, 'Applied');
  assert.equal(state.applications[2].Status, 'Applied');
});

test('approves the current update suggestion with an empty request body', async (t) => {
  const existing = makeApplication();
  const record = makeImport({ Match: { action: 'update', applicationId: existing._id } });
  const { request, state } = await fixture(t, [record], [existing]);
  const path = `/${record._id}/approve`;

  const approved = await request(path, { method: 'POST', body: {} });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.import.Status, 'approved');
  assert.equal(approved.body.application._id, String(existing._id));
  assert.equal(approved.body.application.Status, 'Interviewing');

  const retry = await request(path, { method: 'POST', body: {} });
  assert.equal(retry.body.application._id, approved.body.application._id);
  assert.equal(state.applications.length, 1);
});

test('rejects a stale target and rolls back a failed approval write', async (t) => {
  const stale = makeImport({ Match: { action: 'update', applicationId: new mongoose.Types.ObjectId() } });
  const record = makeImport();
  const { request, state } = await fixture(t, [stale, record]);
  assert.equal((await request(`/${stale._id}/approve`, { method: 'POST' })).status, 409);
  state.failApproval = true;
  assert.equal((await request(`/${record._id}/approve`, { method: 'POST' })).status, 500);
  assert.equal(state.applications.length, 0);
  assert.equal(state.imports[1].Status, 'pending');
  state.failApproval = false;
  assert.equal((await request(`/${record._id}/approve`, { method: 'POST' })).status, 200);
  assert.equal(state.applications.length, 1);
});

test('dismissal is safe to retry and precludes approval', async (t) => {
  const record = makeImport();
  const { request, state } = await fixture(t, [record], [makeApplication()]);
  const path = `/${record._id}`;
  assert.equal((await request(`${path}/dismiss`, { method: 'POST' })).body.Status, 'dismissed');
  assert.equal((await request(`${path}/dismiss`, { method: 'POST' })).status, 200);
  assert.equal((await request(`${path}/approve`, { method: 'POST' })).status, 409);
  assert.equal(state.applications.length, 1);
  assert.equal(state.applications[0].Status, 'Applied');
});
