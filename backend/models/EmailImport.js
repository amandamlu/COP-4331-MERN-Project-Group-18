const mongoose = require('mongoose');

const parsedEmailSchema = new mongoose.Schema(
  {
    event: String,
    status: String,
    company: String,
    role: String,
    referenceNumber: String,
    dateApplied: String,
    requiresReview: Boolean,
  },
  { _id: false },
);

const applicationMatchSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['create', 'update', 'review', 'none'] },
    reason: String,
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    candidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
    currentStatus: String,
    proposedStatus: String,
  },
  { _id: false },
);

const emailImportSchema = new mongoose.Schema(
  {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ResendEmailId: { type: String, required: true, unique: true },
    From: { type: String, default: '' },
    Subject: { type: String, default: '' },
    BodyText: { type: String, default: '' },
    BodyTruncated: { type: Boolean, default: false },
    Parsed: parsedEmailSchema,
    Match: applicationMatchSchema,
    ApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    Status: { type: String, enum: ['pending', 'approved', 'dismissed'], default: 'pending' },
  },
  {
    collection: 'EmailImports',
    versionKey: false,
    timestamps: { createdAt: 'CreatedAt', updatedAt: 'LastUpdated' },
  },
);

emailImportSchema.index({ UserId: 1, Status: 1, CreatedAt: -1 });

module.exports = mongoose.model('EmailImport', emailImportSchema);
