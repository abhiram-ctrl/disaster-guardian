const express = require('express');
const Incident = require('../models/Incident');

const router = express.Router();

// POST /api/incidents - create new incident
router.post('/', async (req, res) => {
  try {
    const { type, description, lat, lng, severity } = req.body;

    if (type == null || lat == null || lng == null) {
      return res
        .status(400)
        .json({ message: 'type, lat and lng are required fields.' });
    }

    const incident = await Incident.create({
      type,
      description,
      lat,
      lng,
      severity: severity || 'medium',
    });

    res.status(201).json(incident);
  } catch (err) {
    console.error('Error creating incident:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/incidents - get all incidents
router.get('/', async (req, res) => {
  try {
    const { hours, limit } = req.query;

    const query = {};

    if (hours) {
      const hoursNum = parseFloat(hours);
      if (!isNaN(hoursNum) && hoursNum > 0) {
        const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
        query.createdAt = { $gte: since };
      }
    }

    let mongoQuery = Incident.find(query).sort({ createdAt: -1 });

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        mongoQuery = mongoQuery.limit(limitNum);
      }
    }

    const incidents = await mongoQuery;
    res.json(incidents);
  } catch (err) {
    console.error('Error fetching incidents:', err);
    res.status(500).json({ message: 'Server error' });
  }
});



// GET /api/incidents/nearby?lat=&lng=&radiusKm=
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.query;

    if (lat == null || lng == null) {
      return res
        .status(400)
        .json({ message: 'lat and lng query params are required.' });
    }

    const radius = parseFloat(radiusKm || '5'); // default 5km

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    // Rough bounding box based on degrees
    const degRadiusLat = radius / 111; // ~111km per 1 degree lat
    const degRadiusLng = radius / 111; // rough

    const incidents = await Incident.find({
      lat: { $gte: latNum - degRadiusLat, $lte: latNum + degRadiusLat },
      lng: { $gte: lngNum - degRadiusLng, $lte: lngNum + degRadiusLng },
    }).sort({ createdAt: -1 });

    res.json(incidents);
  } catch (err) {
    console.error('Error fetching nearby incidents:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// DELETE /api/incidents/:id - delete an incident by id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Incident.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    res.json({ message: 'Incident deleted successfully' });
  } catch (err) {
    console.error('Error deleting incident:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
