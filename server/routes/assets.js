const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");

// Get all assets
router.get("/", async (req, res) => {
  try {
    const assets = await Asset.find().sort({ created_at: -1 });
    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching assets",
      error: error.message,
    });
  }
});

// Get single asset
router.get("/:id", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }
    res.json({
      success: true,
      data: asset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching asset",
      error: error.message,
    });
  }
});

// Get warranty alerts for an asset
router.get("/:id/warranty-alerts", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const alerts = asset.warranty_alerts || [];

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching warranty alerts",
      error: error.message,
    });
  }
});

// Get all warranty alerts across all assets
router.get("/warranty-alerts/all", async (req, res) => {
  try {
    const assets = await Asset.find();
    const allAlerts = [];

    assets.forEach((asset) => {
      const alerts = asset.warranty_alerts || [];
      alerts.forEach((alert) => {
        allAlerts.push({
          asset_id: asset.asset_id,
          asset_name: asset.asset_name,
          hostname: asset.hostname,
          ...alert,
        });
      });
    });

    // Sort by severity and days until expiry
    allAlerts.sort((a, b) => {
      const severityOrder = { Expired: 0, Critical: 1, Warning: 2 };
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.days_until_expiry - b.days_until_expiry;
    });

    res.json({
      success: true,
      data: allAlerts,
      count: allAlerts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching warranty alerts",
      error: error.message,
    });
  }
});

// Register/Update asset (from agent)
router.post("/register", async (req, res) => {
  try {
    const {
      hostname,
      ip_address,
      mac_address,
      hardware_info,
      os_info,
      software_info,
    } = req.body;

    // Log software info received
    console.log(`📊 Registration request from: ${hostname}`);
    if (software_info) {
      console.log(
        `📊 Software info received: ${software_info.software_count} applications`
      );
    }

    // Generate asset_id if not provided
    const asset_id = req.body.asset_id || `AST-${Date.now()}`;

    // Check if asset already exists (only by asset_id, not hostname/mac)
    let asset = await Asset.findOne({ asset_id: asset_id });

    if (asset) {
      // Update existing asset
      asset.hostname = hostname;
      asset.ip_address = ip_address;
      asset.mac_address = mac_address;
      asset.hardware_info = {
        cpu_model: hardware_info?.cpu_model,
        total_ram_gb: hardware_info?.total_ram_gb,
        total_storage_gb: hardware_info?.total_storage_gb,
        os_name: os_info?.name,
        os_version: os_info?.version,
      };
      if (software_info) {
        asset.software_info = {
          software_list: software_info.software_list || [],
          software_count: software_info.software_count || 0,
          last_software_scan: new Date(
            software_info.last_software_scan || Date.now()
          ),
        };
      }
      asset.last_seen = new Date();
      asset.agent_installed = true;

      await asset.save();

      res.json({
        success: true,
        message: "Asset updated successfully",
        data: asset,
      });
    } else {
      // Create new asset
      const assetData = {
        asset_id,
        asset_name: hostname,
        hostname,
        ip_address,
        mac_address,
        hardware_info: {
          cpu_model: hardware_info?.cpu_model,
          total_ram_gb: hardware_info?.total_ram_gb,
          total_storage_gb: hardware_info?.total_storage_gb,
          os_name: os_info?.name,
          os_version: os_info?.version,
        },
        agent_installed: true,
        last_seen: new Date(),
      };

      if (software_info) {
        assetData.software_info = {
          software_list: software_info.software_list || [],
          software_count: software_info.software_count || 0,
          last_software_scan: new Date(
            software_info.last_software_scan || Date.now()
          ),
        };
      }

      asset = new Asset(assetData);

      await asset.save();

      res.status(201).json({
        success: true,
        message: "Asset registered successfully",
        data: asset,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering asset",
      error: error.message,
    });
  }
});

// Add hardware component
router.post("/:id/components", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const componentData = {
      ...req.body,
      status: req.body.status || "Active",
    };

    // Initialize hardware_components array if it doesn't exist
    if (!asset.hardware_components) {
      asset.hardware_components = [];
    }

    asset.hardware_components.push(componentData);
    await asset.save();

    res.status(201).json({
      success: true,
      message: "Hardware component added successfully",
      data: componentData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding hardware component",
      error: error.message,
    });
  }
});

// Update hardware component
router.put("/:id/components/:componentIndex", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const componentIndex = parseInt(req.params.componentIndex);
    if (
      !asset.hardware_components ||
      componentIndex >= asset.hardware_components.length
    ) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    // Update the component
    asset.hardware_components[componentIndex] = {
      ...asset.hardware_components[componentIndex],
      ...req.body,
    };

    await asset.save();

    res.json({
      success: true,
      message: "Hardware component updated successfully",
      data: asset.hardware_components[componentIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating hardware component",
      error: error.message,
    });
  }
});

// Delete hardware component
router.delete("/:id/components/:componentIndex", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    const componentIndex = parseInt(req.params.componentIndex);
    if (
      !asset.hardware_components ||
      componentIndex >= asset.hardware_components.length
    ) {
      return res.status(404).json({
        success: false,
        message: "Component not found",
      });
    }

    const deletedComponent = asset.hardware_components.splice(
      componentIndex,
      1
    )[0];
    await asset.save();

    res.json({
      success: true,
      message: "Hardware component deleted successfully",
      data: deletedComponent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting hardware component",
      error: error.message,
    });
  }
});

// Update manual fields
router.put("/:id/manual", async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    // Update manual fields
    asset.manual_fields = {
      ...asset.manual_fields,
      ...req.body,
    };

    await asset.save();

    res.json({
      success: true,
      message: "Manual fields updated successfully",
      data: asset,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating manual fields",
      error: error.message,
    });
  }
});

// Delete asset
router.delete("/:id", async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({ asset_id: req.params.id });
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    res.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting asset",
      error: error.message,
    });
  }
});

module.exports = router;
