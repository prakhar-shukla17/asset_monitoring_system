const express = require("express");
const router = express.Router();
const Alert = require("../models/Alert");
const nodemailer = require("nodemailer");

// Simple email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Get all alerts
router.get("/", async (req, res) => {
  try {
    const { status = "Open" } = req.query;

    const alerts = await Alert.find(status ? { status } : {})
      .sort({ created_at: -1 })
      .limit(100); // Limit to last 100 alerts

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching alerts",
      error: error.message,
    });
  }
});

// Create new alert
router.post("/", async (req, res) => {
  try {
    const {
      asset_id,
      type,
      message,
      severity = "Medium",
      change_details,
    } = req.body;

    const alert = new Alert({
      asset_id,
      type,
      message,
      severity,
      change_details,
      created_at: new Date(),
    });

    await alert.save();

    // Send email notification (simple)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await emailTransporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.EMAIL_USER, // Send to admin email
          subject: `Asset Alert: ${type} - ${severity}`,
          html: `
            <h3>Asset Alert Notification</h3>
            <p><strong>Asset ID:</strong> ${asset_id}</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Severity:</strong> ${severity}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            ${
              change_details
                ? `
              <h4>Change Details:</h4>
              <p><strong>Component:</strong> ${change_details.component}</p>
              <p><strong>Old Value:</strong> ${change_details.old_value}</p>
              <p><strong>New Value:</strong> ${change_details.new_value}</p>
            `
                : ""
            }
          `,
        });

        alert.email_sent = true;
        await alert.save();
      } catch (emailError) {
        console.error("Email sending failed:", emailError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Alert created successfully",
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating alert",
      error: error.message,
    });
  }
});

// Update alert status
router.put("/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    alert.status = status;
    if (status === "Resolved") {
      alert.resolved_at = new Date();
    }

    await alert.save();

    res.json({
      success: true,
      message: "Alert updated successfully",
      data: alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating alert",
      error: error.message,
    });
  }
});

// Get alerts for specific asset
router.get("/asset/:asset_id", async (req, res) => {
  try {
    const alerts = await Alert.find({ asset_id: req.params.asset_id }).sort({
      created_at: -1,
    });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts,
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
