const mongoose = require('mongoose');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactSchema = new mongoose.Schema(
  {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'UserId is required'],
      index: true,
    },
    ApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'ApplicationId is required'],
      index: true,
    },
    CompanyId: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Company', 
      index: true,
    }, 
    Name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    Role: { type: String, trim: true },
    Company: { type: String, trim: true },
    Email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [EMAIL_RE, 'Email must be a valid email address'],
    },
    Phone: { type: String, trim: true },
    NextFollowUp: {
      type: String, // stored as "YYYY-MM-DD" to match the seeded data
      match: [DATE_RE, 'NextFollowUp must be in YYYY-MM-DD format'],
    },
  },
  {
    collection: 'Contacts', // match the existing, seeded collection name
    versionKey: false,      // no __v, so documents match the seeded shape

    timestamps: {
      createdAt: false, 
      updatedAt: 'LastUpdated',
    },
  }
);

module.exports = mongoose.model('Contact', contactSchema);