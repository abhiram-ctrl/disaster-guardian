const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/risk/check  body: { lat, lng }
router.post("/check", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      return res.status(400).json({ message: "lat/lng invalid" });
    }

    const all = await Incident.find();
    let nearby = 0;
    let high = 0;
    const radiusKm = 5;

    all.forEach((inc) => {
      const d = distanceKm(latNum, lngNum, inc.lat, inc.lng);
      if (d <= radiusKm) {
        nearby++;
        if (inc.severity === "high") high++;
      }
    });

    let risk = "Low";
    if (nearby >= 8 || high >= 3) risk = "Critical";
    else if (nearby >= 5 || high >= 1) risk = "High";
    else if (nearby >= 2) risk = "Moderate";

    res.json({ riskLevel: risk, nearbyCount: nearby, highCount: high });
  } catch (err) {
    console.error("Risk check error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
