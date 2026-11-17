const { convert } = require('html-to-text');
const EmailForwardingAddress = require('../models/EmailForwardingAddress');
const EmailImport = require('../models/EmailImport');
const User = require('../models/User');
const { parseEmail } = require('./emailParser');

const MAX_BODY_LENGTH = 100_000;

async function resolveImportOwner(recipients) {
  if (!Array.isArray(recipients)) return null;

  const addresses = recipients
    .filter((recipient) => typeof recipient === 'string')
    .map((recipient) => recipient.trim().toLowerCase());
  if (addresses.length === 0) return null;

  // The manual forwarding workflow requires exactly one active tracker address in To.
  const matches = await EmailForwardingAddress.find({
    Address: { $in: addresses },
    Enabled: true,
  }).select('UserId').limit(2);
  if (matches.length !== 1) return null;

  const { UserId } = matches[0];
  return (await User.exists({ _id: UserId })) ? UserId : null;
}

async function savePendingImport({ userId, emailId, email }) {
  const body = email.text?.trim() || (email.html ? convert(email.html, { wordwrap: false }) : '');
  const bodyText = body.slice(0, MAX_BODY_LENGTH);
  const bodyTruncated = body.length > MAX_BODY_LENGTH;
  const parsed = parseEmail({ subject: email.subject, body: bodyText });
  if (bodyTruncated) parsed.requiresReview = true;
  const importedAt = new Date();
  await EmailImport.init();

  try {
    const result = await EmailImport.updateOne(
      { ResendEmailId: emailId },
      {
        $setOnInsert: {
          UserId: userId,
          From: email.from,
          Subject: email.subject,
          BodyText: bodyText,
          BodyTruncated: bodyTruncated,
          Parsed: parsed,
          Status: 'pending',
          CreatedAt: importedAt,
          LastUpdated: importedAt,
        },
      },
      // Repeated deliveries must leave the original record and its timestamps intact.
      { upsert: true, runValidators: true, timestamps: false },
    );
    return result.upsertedCount === 1;
  } catch (error) {
    if (error.code === 11000 && await EmailImport.exists({ ResendEmailId: emailId })) {
      return false;
    }
    throw error;
  }
}

module.exports = { resolveImportOwner, savePendingImport };
