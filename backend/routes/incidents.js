const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

// GET ALL INCIDENTS
router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
  } catch (err) {
    console.error("Error fetching incidents:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE INCIDENT
router.post("/", async (req, res) => {
  try {
    const { type, severity, lat, lng, description } = req.body;

    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res
        .status(400)
        .json({ message: "lat/lng must be valid numbers" });
    }

    const incident = new Incident({
      type,
      severity,
      lat: latNum,
      lng: lngNum,
      description,
      isSimulation: false,
    });

    const saved = await incident.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating incident:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- SIMULATION ROUTES (before /:id!) ---

// SEED SIMULATIONS
router.post("/seed", async (req, res) => {
  try {
    const { type = "flood" } = req.body;

    const baseLat = 16.5449;
    const baseLng = 81.5212;

    const docs = [];
    const count = type === "earthquake" ? 20 : 30;

    for (let i = 0; i < count; i++) {
      const offsetLat = (Math.random() - 0.5) * 0.3;
      const offsetLng = (Math.random() - 0.5) * 0.3;
      const severities = ["low", "medium", "high"];
      const severity = severities[Math.floor(Math.random() * 3)];

      docs.push({
        type,
        severity,
        lat: baseLat + offsetLat,
        lng: baseLng + offsetLng,
        description:
          type === "flood"
            ? "Simulated flood hotspot in Bhimavaram"
            : "Simulated earthquake hotspot in Bhimavaram",
        isSimulation: true,
      });
    }

    const created = await Incident.insertMany(docs);
    res.json({ count: created.length, message: "Simulation seeded" });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// CLEAR ALL SIMULATION INCIDENTS
router.delete("/clear-simulations", async (req, res) => {
  try {
    const deleted = await Incident.deleteMany({ isSimulation: true });
    res.json({
      deletedCount: deleted.deletedCount,
      message: "Simulation incidents cleared",
    });
  } catch (err) {
    console.error("Clear simulations error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- VOTING / VERIFICATION ---

router.post("/:id/vote", async (req, res) => {
  try {
    const { userId, vote } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) return res.status(404).json({ message: "Not found" });

    if (
      incident.confirmVoters.includes(userId) ||
      incident.flagVoters.includes(userId)
    ) {
      return res.json({ message: "Already voted", incident });
    }

    if (vote === "confirm") {
      incident.confirmations++;
      incident.confirmVoters.push(userId);
    } else if (vote === "flag") {
      incident.flags++;
      incident.flagVoters.push(userId);
    }

    if (incident.confirmations >= 3 && incident.flags === 0) {
      incident.verificationStatus = "verified";
    } else if (incident.flags >= 2 && incident.confirmations === 0) {
      incident.verificationStatus = "suspicious";
    } else {
      incident.verificationStatus = "unverified";
    }

    await incident.save();
    res.json({ message: "Vote saved", incident });
  } catch (err) {
    console.error("Vote error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE INCIDENT BY ID (for admin)
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Incident.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Not found" });
    }
    res.json({ message: "Incident deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
