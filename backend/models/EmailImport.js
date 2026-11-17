const mongoose = require('mongoose');

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
