const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    description: {
      type: String,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },

    // 🔽 NEW FIELDS FOR VERIFICATION 🔽

    // How many people confirmed this incident is real
    confirmations: {
      type: Number,
      default: 0,
    },

    // How many people marked it as fake
    flags: {
      type: Number,
      default: 0,
    },

    // Which users have already confirmed (to avoid multiple votes)
    confirmVoters: {
      type: [String],
      default: [],
    },

    // Which users have already flagged (to avoid multiple votes)
    flagVoters: {
      type: [String],
      default: [],
    },

    // Current verification status of the incident
    // unverified  = not enough info yet
    // verified    = trusted by multiple people
    // suspicious  = many people think it's fake
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'suspicious'],
      default: 'unverified',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model('Incident', incidentSchema);
