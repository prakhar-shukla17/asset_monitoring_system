const mongoose = require("mongoose");

// Simple Asset Schema - keeping it basic
const assetSchema = new mongoose.Schema({
  // Basic Asset Info
  asset_id: { type: String, required: true },
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

  // Detailed Hardware Components with Warranty Tracking
  hardware_components: [
    {
      component_type: {
        type: String,
        enum: [
          "CPU",
          "RAM",
          "Storage",
          "Motherboard",
          "GPU",
          "Network Card",
          "Power Supply",
          "Monitor",
          "Keyboard",
          "Mouse",
          "Other",
        ],
        required: true,
      },
      component_name: { type: String, required: true },
      model: String,
      serial_number: String,
      manufacturer: String,
      purchase_date: Date,
      warranty_start_date: Date,
      warranty_end_date: Date,
      warranty_duration_months: Number,
      purchase_price: Number,
      vendor: String,
      notes: String,
      status: {
        type: String,
        enum: ["Active", "Failed", "Replaced", "Under Warranty"],
        default: "Active",
      },
    },
  ],

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

  // Manual Entry Fields (System Level)
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

// Virtual field to check if any component warranty is expiring soon
assetSchema.virtual("warranty_alerts").get(function () {
  if (!this.hardware_components || this.hardware_components.length === 0) {
    return [];
  }

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return this.hardware_components
    .filter(
      (component) =>
        component.warranty_end_date && component.status === "Active"
    )
    .map((component) => {
      const warrantyEnd = new Date(component.warranty_end_date);
      const daysUntilExpiry = Math.ceil(
        (warrantyEnd - now) / (1000 * 60 * 60 * 24)
      );

      if (warrantyEnd <= now) {
        return {
          component: component.component_name,
          component_type: component.component_type,
          severity: "Expired",
          days_until_expiry: daysUntilExpiry,
          message: `Warranty expired ${Math.abs(daysUntilExpiry)} days ago`,
        };
      } else if (warrantyEnd <= sevenDaysFromNow) {
        return {
          component: component.component_name,
          component_type: component.component_type,
          severity: "Critical",
          days_until_expiry: daysUntilExpiry,
          message: `Warranty expires in ${daysUntilExpiry} days`,
        };
      } else if (warrantyEnd <= thirtyDaysFromNow) {
        return {
          component: component.component_name,
          component_type: component.component_type,
          severity: "Warning",
          days_until_expiry: daysUntilExpiry,
          message: `Warranty expires in ${daysUntilExpiry} days`,
        };
      }
      return null;
    })
    .filter((alert) => alert !== null);
});

module.exports = mongoose.model("Asset", assetSchema);
