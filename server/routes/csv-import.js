const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const CSVImportService = require("../services/CSVImportService");
const Asset = require("../models/Asset");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "csv-import-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow CSV files
    if (
      file.mimetype === "text/csv" ||
      path.extname(file.originalname).toLowerCase() === ".csv"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize CSV import service
const csvImportService = new CSVImportService();

/**
 * @route POST /api/csv-import/validate
 * @desc Validate CSV file structure before import
 * @access Public
 */
router.post("/validate", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    const validation = await csvImportService.validateCSV(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      validation: validation,
    });
  } catch (error) {
    console.error("CSV validation error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error validating CSV file",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/csv-import/import
 * @desc Import CSV file into database
 * @access Public
 */
router.post("/import", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    // Get import options from request body
    const options = {
      updateExisting: req.body.updateExisting === "true",
      skipDuplicates: req.body.skipDuplicates !== "false", // Default to true
      dryRun: req.body.dryRun === "true",
    };

    console.log("Starting CSV import with options:", options);

    // Import CSV file
    const importStats = await csvImportService.importCSV(
      req.file.path,
      options
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "CSV import completed",
      stats: importStats,
      options: options,
    });
  } catch (error) {
    console.error("CSV import error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error importing CSV file",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/csv-import/import-upcb
 * @desc Import UPCB specific CSV format
 * @access Public
 */
router.post("/import-upcb", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    // Get import options from request body
    const options = {
      updateExisting: req.body.updateExisting === "true",
      skipDuplicates: req.body.skipDuplicates !== "false",
      dryRun: req.body.dryRun === "true",
    };

    console.log("Starting UPCB CSV import with options:", options);

    // Import CSV file
    const importStats = await csvImportService.importCSV(
      req.file.path,
      options
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "UPCB CSV import completed",
      stats: importStats,
      options: options,
    });
  } catch (error) {
    console.error("UPCB CSV import error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error importing UPCB CSV file",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/csv-import/export
 * @desc Export assets to CSV format
 * @access Public
 */
router.get("/export", async (req, res) => {
  try {
    // Get query parameters
    const { branch, status, asset_category } = req.query;

    // Build query
    const query = {};
    if (branch) query.branch = branch;
    if (status) query.status = status;
    if (asset_category) query.asset_category = asset_category;

    // Fetch assets
    const assets = await Asset.find(query).sort({ branch: 1, sr_no: 1 });

    // Generate CSV
    const csvData = csvImportService.exportToCSV(assets);

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="assets-export-${
        new Date().toISOString().split("T")[0]
      }.csv"`
    );

    res.send(csvData);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting CSV file",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/csv-import/stats
 * @desc Get import statistics
 * @access Public
 */
router.get("/stats", (req, res) => {
  try {
    const stats = csvImportService.getImportStats();
    res.json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error("Error getting import stats:", error);
    res.status(500).json({
      success: false,
      message: "Error getting import statistics",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/csv-import/bulk-update
 * @desc Bulk update assets from CSV
 * @access Public
 */
router.post("/bulk-update", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No CSV file uploaded",
      });
    }

    // Force update existing assets
    const options = {
      updateExisting: true,
      skipDuplicates: false,
      dryRun: req.body.dryRun === "true",
    };

    console.log("Starting bulk update with options:", options);

    // Import CSV file
    const importStats = await csvImportService.importCSV(
      req.file.path,
      options
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: "Bulk update completed",
      stats: importStats,
      options: options,
    });
  } catch (error) {
    console.error("Bulk update error:", error);

    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Error performing bulk update",
      error: error.message,
    });
  }
});

/**
 * @route GET /api/csv-import/database-status
 * @desc Check database status and asset count
 * @access Public
 */
router.get("/database-status", async (req, res) => {
  try {
    // Get total asset count
    const totalAssets = await Asset.countDocuments();

    // Get assets by branch
    const assetsByBranch = await Asset.aggregate([
      { $group: { _id: "$branch", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get assets by status
    const assetsByStatus = await Asset.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get assets by category
    const assetsByCategory = await Asset.aggregate([
      { $group: { _id: "$asset_category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Get sample assets
    const sampleAssets = await Asset.find()
      .limit(5)
      .select("asset_id asset_name branch status");

    res.json({
      success: true,
      data: {
        totalAssets,
        assetsByBranch,
        assetsByStatus,
        assetsByCategory,
        sampleAssets,
      },
    });
  } catch (error) {
    console.error("Database status error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking database status",
      error: error.message,
    });
  }
});

/**
 * @route POST /api/csv-import/import-clean-file
 * @desc Import the clean UPCB CSV file directly
 * @access Public
 */
router.post("/import-clean-file", async (req, res) => {
  try {
    const cleanFilePath = path.join(__dirname, "../../upcb_assets_clean.csv");

    if (!fs.existsSync(cleanFilePath)) {
      return res.status(404).json({
        success: false,
        message: "Clean CSV file not found. Please upload a file instead.",
      });
    }

    // Get import options from request body
    const options = {
      updateExisting: req.body.updateExisting === "true",
      skipDuplicates: req.body.skipDuplicates !== "false",
      dryRun: req.body.dryRun === "true",
    };

    console.log("Starting clean file import with options:", options);

    // Import CSV file
    const importStats = await csvImportService.importCSV(
      cleanFilePath,
      options
    );

    res.json({
      success: true,
      message: "Clean file import completed",
      stats: importStats,
      options: options,
    });
  } catch (error) {
    console.error("Clean file import error:", error);
    res.status(500).json({
      success: false,
      message: "Error importing clean CSV file",
      error: error.message,
    });
  }
});

module.exports = router;
