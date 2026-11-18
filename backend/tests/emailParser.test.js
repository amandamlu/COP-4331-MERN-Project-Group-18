const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEmail } = require('../services/emailParser');

test('parses the original application confirmation from a Gmail forward', () => {
  const result = parseEmail({
    subject: 'Fwd: Fwd: Application received',
    body: [
      'Forwarding this for my records.',
      '---------- Forwarded message ---------',
      'From: Hiring <hiring@example.test>',
      'Date: Tue, Nov 17, 2026 at 9:30 AM',
      'Subject: Application received',
      'To: Student <student@example.test>',
      '',
      'Thanks for applying to Example Robotics for the Software Engineering Intern position. We received your application.',
    ].join('\n'),
  });

  assert.deepEqual(result, {
    event: 'application_confirmation', status: 'Applied',
    company: 'Example Robotics', role: 'Software Engineering Intern', referenceNumber: null, requiresReview: false,
  });
});

test('parses an Outlook interview forward with labeled fields', () => {
  const result = parseEmail({
    subject: 'FW: Interview invitation',
    body: '________________________________\r\nFrom: Recruiting <team@example.test>\r\nSent: Tuesday\r\nTo: Student\r\nSubject: Interview invitation\r\n\r\nWe would like to schedule an interview.\r\nCompany: Example Robotics\r\nPosition: Software Engineering Intern',
  });

  assert.deepEqual(result, {
    event: 'interview_invitation', status: 'Interviewing',
    company: 'Example Robotics', role: 'Software Engineering Intern', referenceNumber: null, requiresReview: false,
  });
});

test('uses the rejection when the message also thanks the applicant', () => {
  const result = parseEmail({
    subject: 'Update on your application',
    body: 'Thank you for applying to Example Robotics for the Software Engineering Intern role. We have decided to move forward with other candidates.',
  });

  assert.equal(result.status, 'Rejected');
  assert.equal(result.event, 'rejection');
  assert.equal(result.requiresReview, false);
});

test('finds an explicit offer in the body', () => {
  const result = parseEmail({
    subject: 'Congratulations!',
    body: 'We are pleased to offer you the Data Science Intern position at Example Robotics.',
  });

  assert.deepEqual(result, {
    event: 'offer', status: 'Offer',
    company: 'Example Robotics', role: 'Data Science Intern', referenceNumber: null, requiresReview: false,
  });
});

test('keeps missing company and role null even when a status is clear', () => {
  const result = parseEmail({ subject: 'Interview invitation', body: 'We would like to schedule an interview.' });

  assert.deepEqual(result, {
    event: 'interview_invitation', status: 'Interviewing', company: null, role: null,
    referenceNumber: null, requiresReview: true,
  });
});

test('does not treat a company name in a confirmation subject as a role', () => {
  const result = parseEmail({
    subject: 'Application received — Example Robotics',
    body: 'Thank you for applying to Example Robotics. The recruiting team received your application.',
  });

  assert.deepEqual(result, {
    event: 'application_confirmation', status: 'Applied',
    company: 'Example Robotics', role: null, referenceNumber: null, requiresReview: true,
  });
});

test('marks conflicting statuses and company names for review', () => {
  const result = parseEmail({
    subject: 'Internship offer',
    body: 'Company: Example Robotics\nCompany: Example Labs\nPosition: Robotics Intern\nWe have decided to move forward with other candidates.',
  });

  assert.equal(result.event, null);
  assert.equal(result.status, null);
  assert.equal(result.company, null);
  assert.equal(result.role, 'Robotics Intern');
  assert.equal(result.requiresReview, true);
});

test('ignores earlier application messages in a reply thread', () => {
  const result = parseEmail({
    subject: 'Re: Interview invitation',
    body: 'We will not be moving forward with your application.\n\nOn Tue, Applicant wrote:\n> We invite you to interview.',
  });

  assert.equal(result.status, 'Rejected');
  assert.equal(result.requiresReview, true);
});

test('does not classify nonhiring applications or career newsletters', () => {
  for (const email of [
    { subject: 'Application received', body: 'We received your application for a library card.' },
    { subject: 'Job offer scams to watch for', body: 'Read our guide for job applicants.' },
    { subject: 'Interview invitation tips', body: 'Our guide explains how to prepare for your internship interview.' },
    { subject: 'Discount offer', body: 'Thank you for joining our mailing list.' },
    {},
  ]) {
    const result = parseEmail(email);
    assert.equal(result.event, null);
    assert.equal(result.status, null);
    assert.equal(result.requiresReview, true);
  }
});

test('extracts a labeled application reference from the current email', () => {
  const result = parseEmail({
    subject: 'Interview invitation',
    body: 'Application reference number: ar-4821\n\nOn Tue, Applicant wrote:\n> Application ID: old-001',
  });

  assert.equal(result.referenceNumber, 'AR-4821');
});

test('conflicting application reference numbers require review', () => {
  const result = parseEmail({
    subject: 'Interview invitation',
    body: 'Company: Example Robotics\nPosition: Robotics Intern\nApplication ID #ABC-123\nApplication ID #ABC-456',
  });

  assert.equal(result.referenceNumber, null);
  assert.equal(result.requiresReview, true);
});
