const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
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

    // Voting / verification
    confirmations: {
      type: Number,
      default: 0,
    },
    flags: {
      type: Number,
      default: 0,
    },
    confirmVoters: {
      type: [String],
      default: [],
    },
    flagVoters: {
      type: [String],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "verified", "suspicious"],
      default: "unverified",
    },

    // NEW: mark which incidents are from simulation
    isSimulation: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Incident", incidentSchema);
