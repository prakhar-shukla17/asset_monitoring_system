const mongoose = require("mongoose");

// Simple Telemetry Schema
const telemetrySchema = new mongoose.Schema({
  asset_id: { type: String, required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },

  // Basic Performance Metrics
  cpu_usage_percent: { type: Number, min: 0, max: 100 },
  ram_usage_percent: { type: Number, min: 0, max: 100 },
  disk_usage_percent: { type: Number, min: 0, max: 100 },

  // Optional metrics
  network_in_kbps: Number,
  network_out_kbps: Number,
  processes_count: Number,
  uptime_hours: Number,
});

// Index for efficient time-series queries
telemetrySchema.index({ asset_id: 1, timestamp: -1 });

// Auto-delete old telemetry data (keep only 7 days)
telemetrySchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

module.exports = mongoose.model("Telemetry", telemetrySchema);

