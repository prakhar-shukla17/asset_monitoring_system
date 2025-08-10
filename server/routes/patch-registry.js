const express = require("express");
const router = express.Router();
const PatchAlert = require("../models/PatchAlert");
const PatchRegistryService = require("../services/PatchRegistryService");

// Lazy initialization to avoid OpenAI errors if API key is not set
let patchRegistry = null;

function getPatchRegistry() {
  if (!patchRegistry) {
    try {
      patchRegistry = new PatchRegistryService();
    } catch (error) {
      console.error(
        "Failed to initialize PatchRegistryService:",
        error.message
      );
      return null;
    }
  }
  return patchRegistry;
}

// Check for software updates
router.post("/check-updates", async (req, res) => {
  try {
    console.log("🔍 Starting patch registry update check...");

    const patchRegistry = getPatchRegistry();
    if (!patchRegistry) {
      return res.status(500).json({
        success: false,
        message:
          "Patch Registry service is not available. Please check your Gemini API key configuration.",
      });
    }

    // Check if Gemini is working
    if (!patchRegistry.model) {
      return res.status(500).json({
        success: false,
        message:
          "Gemini AI is not available. The system will work with predefined software only. Please check your API key.",
      });
    }

    // Check for updates
    const updateResults = await patchRegistry.checkForUpdates();

    // Save results to database
    const savedCount = await patchRegistry.saveUpdateResults(updateResults);

    res.json({
      success: true,
      message: `Found ${updateResults.length} software updates, saved ${savedCount} to database`,
      data: {
        total_updates: updateResults.length,
        saved_count: savedCount,
        updates: updateResults,
      },
    });
  } catch (error) {
    console.error("Error in check-updates:", error);
    res.status(500).json({
      success: false,
      message: "Error checking for updates",
      error: error.message,
    });
  }
});

// Get all patch alerts
router.get("/alerts", async (req, res) => {
  try {
    const { status, priority, asset_id, limit = 100, page = 1 } = req.query;

    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (asset_id) query.asset_id = asset_id;

    // Pagination
    const skip = (page - 1) * limit;

    const alerts = await PatchAlert.find(query)
      .sort({ check_date: -1, priority: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await PatchAlert.countDocuments(query);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching patch alerts",
      error: error.message,
    });
  }
});

// Get patch alert statistics
router.get("/statistics", async (req, res) => {
  try {
    const totalAlerts = await PatchAlert.countDocuments();
    const newAlerts = await PatchAlert.countDocuments({ status: "New" });
    const criticalAlerts = await PatchAlert.countDocuments({
      priority: "Critical",
    });
    const highAlerts = await PatchAlert.countDocuments({ priority: "High" });

    // Recent alerts (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAlerts = await PatchAlert.countDocuments({
      check_date: { $gte: sevenDaysAgo },
    });

    // Alerts by status
    const statusStats = await PatchAlert.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    // Alerts by priority
    const priorityStats = await PatchAlert.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        total_alerts: totalAlerts,
        new_alerts: newAlerts,
        critical_alerts: criticalAlerts,
        high_alerts: highAlerts,
        recent_alerts: recentAlerts,
        status_breakdown: statusStats,
        priority_breakdown: priorityStats,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
});

// Get single patch alert
router.get("/alerts/:id", async (req, res) => {
  try {
    const alert = await PatchAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Patch alert not found",
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching patch alert",
      error: error.message,
    });
  }
});

// Update patch alert status
router.put("/alerts/:id", async (req, res) => {
  try {
    const { status, notes, resolved_by } = req.body;

    const updateData = {
      status,
      notes,
      updated_at: new Date(),
    };

    if (status === "Resolved") {
      updateData.resolved_date = new Date();
      updateData.resolved_by = resolved_by || "System";
    }

    const alert = await PatchAlert.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Patch alert not found",
      });
    }

    res.json({
      success: true,
      message: "Patch alert updated successfully",
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating patch alert",
      error: error.message,
    });
  }
});

// Delete patch alert
router.delete("/alerts/:id", async (req, res) => {
  try {
    const alert = await PatchAlert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Patch alert not found",
      });
    }

    res.json({
      success: true,
      message: "Patch alert deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting patch alert",
      error: error.message,
    });
  }
});

// Bulk update alert status
router.put("/alerts/bulk-update", async (req, res) => {
  try {
    const { alert_ids, status, notes } = req.body;

    if (!alert_ids || !Array.isArray(alert_ids) || alert_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Alert IDs array is required",
      });
    }

    const updateData = {
      status,
      notes,
      updated_at: new Date(),
    };

    if (status === "Resolved") {
      updateData.resolved_date = new Date();
      updateData.resolved_by = "System";
    }

    const result = await PatchAlert.updateMany(
      { _id: { $in: alert_ids } },
      updateData
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} alerts`,
      data: {
        modified_count: result.modifiedCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error bulk updating alerts",
      error: error.message,
    });
  }
});

// Get alerts by asset
router.get("/alerts/asset/:asset_id", async (req, res) => {
  try {
    const alerts = await PatchAlert.find({
      asset_id: req.params.asset_id,
    }).sort({ check_date: -1 });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching asset alerts",
      error: error.message,
    });
  }
});

module.exports = router;
