const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['flood', 'fire', 'accident', 'storm', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Incident', incidentSchema);
