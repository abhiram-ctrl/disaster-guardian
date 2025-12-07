const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routers
const incidentsRouter = require("./routes/incidents");
const riskRouter = require("./routes/risk");

app.use("/api/incidents", incidentsRouter);
app.use("/api/risk", riskRouter);

// MongoDB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Server start
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
