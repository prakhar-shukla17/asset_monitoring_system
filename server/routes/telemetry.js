const express = require("express");
const router = express.Router();
const Telemetry = require("../models/Telemetry");
const Asset = require("../models/Asset");

// Submit telemetry data (from agent)
router.post("/", async (req, res) => {
  try {
    const {
      asset_id,
      cpu_usage_percent,
      ram_usage_percent,
      disk_usage_percent,
      network_in_kbps,
      network_out_kbps,
      processes_count,
      uptime_hours,
    } = req.body;

    // Validate asset exists
    const asset = await Asset.findOne({ asset_id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // Create telemetry record
    const telemetry = new Telemetry({
      asset_id,
      cpu_usage_percent,
      ram_usage_percent,
      disk_usage_percent,
      network_in_kbps,
      network_out_kbps,
      processes_count,
      uptime_hours,
      timestamp: new Date(),
    });

    await telemetry.save();

    // Update asset last_seen
    asset.last_seen = new Date();
    await asset.save();

    res.json({
      success: true,
      message: "Telemetry data saved successfully",
      data: telemetry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving telemetry data",
      error: error.message,
    });
  }
});

// Get telemetry data for an asset
router.get("/:asset_id", async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { hours = 24 } = req.query; // Default to last 24 hours

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const telemetryData = await Telemetry.find({
      asset_id,
      timestamp: { $gte: startTime },
    }).sort({ timestamp: -1 });

    res.json({
      success: true,
      count: telemetryData.length,
      data: telemetryData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching telemetry data",
      error: error.message,
    });
  }
});

// Get latest telemetry for all assets (dashboard)
router.get("/", async (req, res) => {
  try {
    // Get latest telemetry for each asset
    const latestTelemetry = await Telemetry.aggregate([
      {
        $sort: { asset_id: 1, timestamp: -1 },
      },
      {
        $group: {
          _id: "$asset_id",
          latest: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latest" },
      },
    ]);

    res.json({
      success: true,
      count: latestTelemetry.length,
      data: latestTelemetry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching telemetry data",
      error: error.message,
    });
  }
});

module.exports = router;

