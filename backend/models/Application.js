
// to use it in a controller:
// const Application = require('../models/Application');

const mongoose = require('mongoose');

const STATUS_VALUES = [
  'Applied',
  'Interviewing',
  'Offer',
  'Rejected',
  'Withdrawn',
];

// Matches YYYY-MM-DD, the format used in the seeded Applications collection
const DATE_STRING = /^\d{4}-\d{2}-\d{2}$/;

const applicationSchema = new mongoose.Schema(
  {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // change to match the name used in your User model
      required: [true, 'UserId is required'],
      index: true,
    },
    Company: {
      type: String,
      required: [true, 'Company is required'],
      trim: true,
    },
    Role: {
      type: String,
      required: [true, 'Role is required'],
      trim: true,
    },
    Location: {
      type: String,
      trim: true,
    },
    Status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: STATUS_VALUES,
        message: '{VALUE} is not a valid status',
      },
      default: 'Applied',
    },
    SalaryHourly: {
      type: Number,
      min: [0, 'SalaryHourly cannot be negative'],
    },
    DateApplied: {
      type: String,
      match: [DATE_STRING, 'DateApplied must be in YYYY-MM-DD format'],
    },
    JobLink: {
      type: String,
      trim: true,
    },
    Notes: {
      type: String,
      trim: true,
    },
    LastUpdated: {
      type: String,
      match: [DATE_STRING, 'LastUpdated must be in YYYY-MM-DD format'],
    },
  },
  {
    // Use the existing collection name instead of Mongoose's default "applications"
    collection: 'Applications',
    versionKey: false,
  }
);

module.exports = mongoose.model('Application', applicationSchema);
