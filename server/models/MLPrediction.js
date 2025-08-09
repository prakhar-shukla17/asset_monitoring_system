const mongoose = require("mongoose");

// ML Prediction Schema
const mlPredictionSchema = new mongoose.Schema({
  asset_id: { type: String, required: true, index: true },

  // Prediction Details
  prediction_type: {
    type: String,
    enum: [
      "disk_space_prediction",
      "anomaly_detection",
      "performance_analysis",
    ],
    required: true,
  },

  // Prediction Data (flexible object to store different types of predictions)
  prediction_data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },

  // Model Information
  model_version: { type: String, default: "1.0.0" },
  confidence_score: { type: Number, min: 0, max: 1 },

  // Timestamps
  created_at: { type: Date, default: Date.now, index: true },

  // Validation (for future accuracy tracking)
  validated: { type: Boolean, default: false },
  actual_outcome: mongoose.Schema.Types.Mixed,
  accuracy_score: Number,
});

// Index for efficient queries
mlPredictionSchema.index({ asset_id: 1, created_at: -1 });
mlPredictionSchema.index({ prediction_type: 1, created_at: -1 });

// Auto-delete old predictions (keep only 30 days)
mlPredictionSchema.index(
  { created_at: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

module.exports = mongoose.model("MLPrediction", mlPredictionSchema);

