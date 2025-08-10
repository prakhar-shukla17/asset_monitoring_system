const mongoose = require("mongoose");
const PatchAlert = require("./server/models/PatchAlert");

// Sample patch alert data
const samplePatches = [
  {
    asset_id: "SAMPLE-001",
    asset_name: "Sample Desktop",
    hostname: "DESKTOP-SAMPLE",
    software_name: "Google Chrome",
    current_version: "120.0.6099.109",
    latest_version: "121.0.6167.85",
    vendor: "Google",
    vendor_website: "https://www.google.com/chrome/",
    patch_notes:
      "Security updates and bug fixes. Includes critical security patches for CVE-2024-1234.",
    priority: "Critical",
    status: "New",
    check_date: new Date(),
  },
  {
    asset_id: "SAMPLE-002",
    asset_name: "Sample Laptop",
    hostname: "LAPTOP-SAMPLE",
    software_name: "Mozilla Firefox",
    current_version: "121.0",
    latest_version: "122.0",
    vendor: "Mozilla",
    vendor_website: "https://www.mozilla.org/firefox/",
    patch_notes:
      "New features and performance improvements. Enhanced privacy controls.",
    priority: "High",
    status: "New",
    check_date: new Date(),
  },
  {
    asset_id: "SAMPLE-003",
    asset_name: "Sample Server",
    hostname: "SERVER-SAMPLE",
    software_name: "Node.js",
    current_version: "18.17.0",
    latest_version: "20.11.0",
    vendor: "Node.js Foundation",
    vendor_website: "https://nodejs.org/",
    patch_notes:
      "LTS version with long-term support. Includes security updates and performance improvements.",
    priority: "Medium",
    status: "Acknowledged",
    check_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },
  {
    asset_id: "SAMPLE-004",
    asset_name: "Sample Workstation",
    hostname: "WORKSTATION-SAMPLE",
    software_name: "Visual Studio Code",
    current_version: "1.84.0",
    latest_version: "1.85.0",
    vendor: "Microsoft",
    vendor_website: "https://code.visualstudio.com/",
    patch_notes: "Bug fixes and new extensions support. Improved IntelliSense.",
    priority: "Low",
    status: "In Progress",
    check_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    asset_id: "SAMPLE-005",
    asset_name: "Sample PC",
    hostname: "PC-SAMPLE",
    software_name: "Adobe Reader",
    current_version: "2023.008.20470",
    latest_version: "2024.001.20629",
    vendor: "Adobe",
    vendor_website: "https://get.adobe.com/reader/",
    patch_notes:
      "Security updates and compatibility improvements. Fixed PDF rendering issues.",
    priority: "High",
    status: "Resolved",
    check_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    resolved_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    resolved_by: "Admin",
  },
];

async function addSamplePatches() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://localhost:27017/simple_asset_monitor", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Clear existing sample data
    await PatchAlert.deleteMany({ asset_id: { $regex: /^SAMPLE-/ } });
    console.log("🗑️ Cleared existing sample data");

    // Add new sample data
    const result = await PatchAlert.insertMany(samplePatches);
    console.log(`✅ Added ${result.length} sample patch alerts`);

    // Show statistics
    const total = await PatchAlert.countDocuments();
    const newAlerts = await PatchAlert.countDocuments({ status: "New" });
    const critical = await PatchAlert.countDocuments({ priority: "Critical" });
    const high = await PatchAlert.countDocuments({ priority: "High" });

    console.log("\n📊 Current Statistics:");
    console.log(`Total Alerts: ${total}`);
    console.log(`New Alerts: ${newAlerts}`);
    console.log(`Critical Alerts: ${critical}`);
    console.log(`High Alerts: ${high}`);

    console.log("\n🎉 Sample data added successfully!");
    console.log("🌐 Now visit: http://localhost:3000/patch-registry.html");
  } catch (error) {
    console.error("❌ Error adding sample data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the script
addSamplePatches();
