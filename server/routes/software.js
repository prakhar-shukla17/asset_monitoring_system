const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");

// Get software inventory for all assets
router.get("/", async (req, res) => {
  try {
    const assets = await Asset.find(
      { "software_info.software_list": { $exists: true, $ne: [] } },
      {
        asset_id: 1,
        asset_name: 1,
        hostname: 1,
        software_info: 1,
        last_seen: 1,
      }
    ).sort({ last_seen: -1 });

    res.json({
      success: true,
      count: assets.length,
      data: assets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching software inventory",
      error: error.message,
    });
  }
});

// Get software inventory for a specific asset
router.get("/:asset_id", async (req, res) => {
  try {
    const asset = await Asset.findOne(
      { asset_id: req.params.asset_id },
      {
        asset_id: 1,
        asset_name: 1,
        hostname: 1,
        software_info: 1,
        last_seen: 1,
      }
    );

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
      message: "Error fetching asset software",
      error: error.message,
    });
  }
});

// Get software statistics
router.get("/stats/summary", async (req, res) => {
  try {
    // Get total software count across all assets
    const pipeline = [
      { $match: { "software_info.software_list": { $exists: true } } },
      { $unwind: "$software_info.software_list" },
      {
        $group: {
          _id: {
            name: "$software_info.software_list.name",
            version: "$software_info.software_list.version",
          },
          count: { $sum: 1 },
          vendors: { $addToSet: "$software_info.software_list.vendor" },
          assets: { $addToSet: "$asset_id" },
        },
      },
      {
        $group: {
          _id: null,
          total_unique_software: { $sum: 1 },
          software_list: {
            $push: {
              name: "$_id.name",
              version: "$_id.version",
              install_count: "$count",
              vendors: "$vendors",
              installed_on: "$assets",
            },
          },
        },
      },
    ];

    const result = await Asset.aggregate(pipeline);

    // Get vendor statistics
    const vendorPipeline = [
      { $match: { "software_info.software_list": { $exists: true } } },
      { $unwind: "$software_info.software_list" },
      {
        $group: {
          _id: "$software_info.software_list.vendor",
          software_count: { $sum: 1 },
          unique_software: { $addToSet: "$software_info.software_list.name" },
        },
      },
      {
        $project: {
          vendor: "$_id",
          software_count: 1,
          unique_software_count: { $size: "$unique_software" },
        },
      },
      { $sort: { software_count: -1 } },
      { $limit: 10 },
    ];

    const vendorStats = await Asset.aggregate(vendorPipeline);

    const stats =
      result.length > 0
        ? result[0]
        : { total_unique_software: 0, software_list: [] };

    res.json({
      success: true,
      statistics: {
        total_unique_software: stats.total_unique_software,
        top_vendors: vendorStats,
        most_common_software: stats.software_list
          .sort((a, b) => b.install_count - a.install_count)
          .slice(0, 20),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching software statistics",
      error: error.message,
    });
  }
});

module.exports = router;
