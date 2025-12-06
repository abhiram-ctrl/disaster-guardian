const express = require('express');
const Incident = require('../models/Incident');
const { distancePointToSegmentKm } = require('../utils/geo');

const router = express.Router();

// POST /api/route/safety
// body: { start: {lat,lng}, end: {lat,lng} }
router.post('/safety', async (req, res) => {
  try {
    const { start, end } = req.body;

    if (
      !start ||
      !end ||
      start.lat == null ||
      start.lng == null ||
      end.lat == null ||
      end.lng == null
    ) {
      return res
        .status(400)
        .json({ message: 'start and end with lat,lng are required.' });
    }

    // Get all incidents (simple for now)
    const allIncidents = await Incident.find();

    const THRESHOLD_KM = 2; // incidents within 2km of route
    const nearby = [];

    allIncidents.forEach((inc) => {
      const d = distancePointToSegmentKm(
        { lat: inc.lat, lng: inc.lng },
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng }
      );
      if (d <= THRESHOLD_KM) {
        nearby.push({ incident: inc, distanceKm: d });
      }
    });

    const nearbyCount = nearby.length;
    let score = 100 - nearbyCount * 15; // simple scoring
    if (score < 0) score = 0;

    let label = 'Safe';
    if (score < 70) label = 'Moderate';
    if (score < 40) label = 'Risky';

    res.json({
      score,
      label,
      nearbyCount,
      message: `We found ${nearbyCount} incidents near this route. Safety level: ${label}.`,
      nearbyIncidents: nearby.map((n) => ({
        id: n.incident._id,
        type: n.incident.type,
        severity: n.incident.severity,
        lat: n.incident.lat,
        lng: n.incident.lng,
        distanceKm: n.distanceKm,
      })),
    });
  } catch (err) {
    console.error('Error computing route safety:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
