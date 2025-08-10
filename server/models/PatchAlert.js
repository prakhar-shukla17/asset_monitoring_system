const mongoose = require("mongoose");

// Patch Alert Schema for Software Updates
const patchAlertSchema = new mongoose.Schema({
  // Asset Information
  asset_id: { type: String, required: true, index: true },
  asset_name: { type: String, required: true },
  hostname: { type: String, required: true },

  // Software Information
  software_name: { type: String, required: true },
  current_version: { type: String, required: true },
  latest_version: { type: String, required: true },
  vendor: { type: String, required: true },
  vendor_website: { type: String },

  // Update Details
  patch_notes: { type: String },
  priority: {
    type: String,
    enum: ["Critical", "High", "Medium", "Low"],
    default: "Medium",
  },

  // Status Tracking
  status: {
    type: String,
    enum: ["New", "Acknowledged", "In Progress", "Resolved"],
    default: "New",
  },

  // Timestamps
  check_date: { type: Date, default: Date.now },
  resolved_date: Date,
  resolved_by: String,
  notes: String,

  // Metadata
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Update the updated_at field on save
patchAlertSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

// Compound index for efficient queries
patchAlertSchema.index({ asset_id: 1, software_name: 1 }, { unique: true });
patchAlertSchema.index({ status: 1, priority: 1 });
patchAlertSchema.index({ check_date: -1 });

module.exports = mongoose.model("PatchAlert", patchAlertSchema);
