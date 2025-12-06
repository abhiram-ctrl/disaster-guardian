const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const incidentRoutes = require('./routes/incidents');
const routeSafetyRoutes = require('./routes/routeSafety');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('Disaster Guardian API is running ✅');
});

// Routes
app.use('/api/incidents', incidentRoutes);
app.use('/api/route', routeSafetyRoutes);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
