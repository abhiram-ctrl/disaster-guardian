// backend/routes/routeSafety.js

const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

// Safe parser for coordinates (accepts number or string)
function parseCoord(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  return NaN;
}

// Distance between 2 points using Haversine (km)
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate sample points along the route (straight line)
function getRouteSamplePoints(start, end, steps = 20) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 -> 1
    const lat = start.lat + (end.lat - start.lat) * t;
    const lng = start.lng + (end.lng - start.lng) * t;
    points.push({ lat, lng });
  }
  return points;
}

// POST /api/route/check
// body: { start: { lat, lng }, end: { lat, lng } }
router.post("/check", async (req, res) => {
  try {
    const { start, end } = req.body || {};

    const sLat = parseCoord(start?.lat);
    const sLng = parseCoord(start?.lng);
    const eLat = parseCoord(end?.lat);
    const eLng = parseCoord(end?.lng);

    if ([sLat, sLng, eLat, eLng].some((v) => Number.isNaN(v))) {
      return res
        .status(400)
        .json({ message: "Invalid route coordinates (lat/lng)." });
    }

    const incidents = await Incident.find();

    if (!incidents.length) {
      return res.json({
        riskLevel: "Safe",
        totalIncidentsOnRoute: 0,
        highSeverityOnRoute: 0,
        message: "No incidents in the system. Route currently looks safe.",
      });
    }

    const samples = getRouteSamplePoints(
      { lat: sLat, lng: sLng },
      { lat: eLat, lng: eLng },
      25
    );
    const radiusKm = 5; // consider incidents within 5km of route

    const incidentIdsNearRoute = new Set();
    const highIncidentIds = new Set();

    const sampleSummaries = samples.map((pt) => {
      let nearbyCount = 0;
      let highCount = 0;

      incidents.forEach((inc) => {
        const d = distanceKm(pt.lat, pt.lng, inc.lat, inc.lng);
        if (d <= radiusKm) {
          nearbyCount++;
          incidentIdsNearRoute.add(String(inc._id));
          if (inc.severity === "high") {
            highCount++;
            highIncidentIds.add(String(inc._id));
          }
        }
      });

      return {
        lat: pt.lat,
        lng: pt.lng,
        nearbyCount,
        highCount,
      };
    });

    const totalIncidentsOnRoute = incidentIdsNearRoute.size;
    const highSeverityOnRoute = highIncidentIds.size;

    let riskLevel = "Safe";

    if (totalIncidentsOnRoute === 0) {
      riskLevel = "Safe";
    } else if (highSeverityOnRoute >= 5 || totalIncidentsOnRoute >= 20) {
      riskLevel = "Dangerous";
    } else if (highSeverityOnRoute >= 2 || totalIncidentsOnRoute >= 10) {
      riskLevel = "Risky";
    } else {
      riskLevel = "Caution";
    }

    res.json({
      riskLevel,
      totalIncidentsOnRoute,
      highSeverityOnRoute,
      sampleSummaries,
      message:
        riskLevel === "Safe"
          ? "No significant incident clusters close to this route."
          : "There are incident clusters near this route. Consider re-checking or adjusting the path.",
    });
  } catch (err) {
    console.error("Route safety check error:", err);
    res
      .status(500)
      .json({ message: "Server error while checking route safety." });
  }
});

module.exports = router;
