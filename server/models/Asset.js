const mongoose = require("mongoose");

// Simple Asset Schema - keeping it basic
const assetSchema = new mongoose.Schema({
  // Basic Asset Info
  asset_id: { type: String, required: true, unique: true },
  asset_name: { type: String, required: true },
  hostname: { type: String, required: true },
  ip_address: { type: String },
  mac_address: { type: String },

  // Asset Management
  asset_category: {
    type: String,
    enum: ["Desktop", "Laptop", "Server", "Network"],
    default: "Desktop",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Decommissioned"],
    default: "Active",
  },
  branch: { type: String, default: "Main Office" },

  // Hardware Info (basic)
  hardware_info: {
    cpu_model: String,
    total_ram_gb: Number,
    total_storage_gb: Number,
    os_name: String,
    os_version: String,
  },

  // Software Inventory
  software_info: {
    software_list: [
      {
        name: String,
        version: String,
        vendor: String,
        install_date: Date,
      },
    ],
    software_count: { type: Number, default: 0 },
    last_software_scan: { type: Date, default: Date.now },
  },

  // Manual Entry Fields
  manual_fields: {
    purchase_date: Date,
    warranty_expiry: Date,
    purchase_value: Number,
    vendor: String,
    handled_by: String,
    notes: String,
  },

  // System Info
  last_seen: { type: Date, default: Date.now },
  agent_installed: { type: Boolean, default: false },

  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Update the updated_at field on save
assetSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("Asset", assetSchema);
