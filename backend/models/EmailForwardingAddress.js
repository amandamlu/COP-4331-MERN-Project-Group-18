const mongoose = require('mongoose');

const emailForwardingAddressSchema = new mongoose.Schema(
  {
    UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    Address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    Enabled: {
      type: Boolean,
      default: true,
    },
  },
  { collection: 'EmailForwardingAddresses', versionKey: false },
);

module.exports = mongoose.model('EmailForwardingAddress', emailForwardingAddressSchema);
