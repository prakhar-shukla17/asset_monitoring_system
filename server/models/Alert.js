const mongoose = require("mongoose");

// Simple Alert Schema
const alertSchema = new mongoose.Schema({
  asset_id: { type: String, required: true, index: true },

  // Alert Details
  type: {
    type: String,
    enum: [
      "hardware_change",
      "software_change",
      "performance_warning",
      "system_offline",
    ],
    required: true,
  },
  message: { type: String, required: true },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },

  // Alert Status
  status: {
    type: String,
    enum: ["Open", "Acknowledged", "Resolved"],
    default: "Open",
  },

  // Change Details (if applicable)
  change_details: {
    component: String,
    old_value: String,
    new_value: String,
  },

  // Timestamps
  created_at: { type: Date, default: Date.now },
  resolved_at: Date,

  // Notification
  email_sent: { type: Boolean, default: false },
});

module.exports = mongoose.model("Alert", alertSchema);

