const express = require("express");
const router = express.Router();
const MLPrediction = require("../models/MLPrediction");
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

// Get ML predictions for an asset
router.get("/predictions/:asset_id", async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { type, limit = 10 } = req.query;

    // Build query
    const query = { asset_id };
    if (type) {
      query.prediction_type = type;
    }

    const predictions = await MLPrediction.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      asset_id,
      count: predictions.length,
      data: predictions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching ML predictions",
      error: error.message,
    });
  }
});

// Trigger ML analysis for a specific asset
router.post("/analyze/:asset_id", async (req, res) => {
  try {
    const { asset_id } = req.params;
    const { analysis_type = "full" } = req.body;

    let mlResponse;

    // Call appropriate ML service endpoint
    switch (analysis_type) {
      case "disk":
        mlResponse = await axios.get(
          `${ML_SERVICE_URL}/predict/disk/${asset_id}`
        );
        break;
      case "anomalies":
        mlResponse = await axios.get(
          `${ML_SERVICE_URL}/detect/anomalies/${asset_id}`
        );
        break;
      case "performance":
        mlResponse = await axios.get(
          `${ML_SERVICE_URL}/analyze/performance/${asset_id}`
        );
        break;
      case "full":
      default:
        mlResponse = await axios.get(
          `${ML_SERVICE_URL}/analyze/full/${asset_id}`
        );
        break;
    }

    res.json({
      success: true,
      message: `ML analysis triggered for ${asset_id}`,
      analysis_type,
      ml_response: mlResponse.data,
    });
  } catch (error) {
    if (error.response) {
      // ML service returned an error
      res.status(error.response.status).json({
        success: false,
        message: "ML service error",
        error: error.response.data,
      });
    } else {
      // Network or other error
      res.status(500).json({
        success: false,
        message: "Error communicating with ML service",
        error: error.message,
      });
    }
  }
});

// Trigger ML analysis for all assets
router.post("/analyze/all", async (req, res) => {
  try {
    const mlResponse = await axios.post(`${ML_SERVICE_URL}/analyze/all`);

    res.json({
      success: true,
      message: "ML analysis triggered for all assets",
      ml_response: mlResponse.data,
    });
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json({
        success: false,
        message: "ML service error",
        error: error.response.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error communicating with ML service",
        error: error.message,
      });
    }
  }
});

// Get ML service statistics
router.get("/statistics", async (req, res) => {
  try {
    // Get local prediction statistics
    const totalPredictions = await MLPrediction.countDocuments();

    const predictionsByType = await MLPrediction.aggregate([
      {
        $group: {
          _id: "$prediction_type",
          count: { $sum: 1 },
          latest: { $max: "$created_at" },
        },
      },
    ]);

    // Try to get ML service statistics
    let mlServiceStats = null;
    try {
      const mlResponse = await axios.get(`${ML_SERVICE_URL}/statistics`);
      mlServiceStats = mlResponse.data;
    } catch (mlError) {
      console.log("ML service not available for statistics");
    }

    res.json({
      success: true,
      statistics: {
        local: {
          total_predictions: totalPredictions,
          predictions_by_type: predictionsByType,
        },
        ml_service: mlServiceStats,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching ML statistics",
      error: error.message,
    });
  }
});

// Health check for ML service
router.get("/health", async (req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/health`);

    res.json({
      success: true,
      message: "ML service is healthy",
      ml_service: mlResponse.data,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "ML service unavailable",
      error: error.message,
    });
  }
});

module.exports = router;

