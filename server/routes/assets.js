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

    // Check if asset already exists
    let asset = await Asset.findOne({
      $or: [
        { asset_id: asset_id },
        { hostname: hostname },
        { mac_address: mac_address },
      ],
    });

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
