const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("web")); // Serve static files

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/asset_monitor")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/assets", require("./routes/assets"));
app.use("/api/telemetry", require("./routes/telemetry"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/ml", require("./routes/ml"));
app.use("/api/software", require("./routes/software"));

// Basic health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    version: "1.0.0",
  });
});

// Serve web interface
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "web" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
