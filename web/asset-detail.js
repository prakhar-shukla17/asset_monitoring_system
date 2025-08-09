// Simple Asset Monitor - Asset Detail Page JavaScript

const API_BASE = "/api";
let currentAsset = null;
let isEditMode = false;

// Initialize asset detail page
document.addEventListener("DOMContentLoaded", function () {
  console.log("🖥️ Asset detail page initializing...");

  const assetId = getUrlParameter("id");
  if (!assetId) {
    showError("No asset ID provided");
    return;
  }

  loadAssetDetails(assetId);

  // Setup form submission
  document
    .getElementById("manual-fields-form")
    .addEventListener("submit", saveManualFields);
});

// Load complete asset details
async function loadAssetDetails(assetId) {
  try {
    console.log(`📋 Loading details for asset: ${assetId}`);

    // Load data in parallel
    await Promise.all([
      loadAssetInfo(assetId),
      loadSoftwareInventory(assetId),
      loadMLPredictions(assetId),
      loadPerformanceData(assetId),
      loadAssetAlerts(assetId),
    ]);

    updateLastUpdated();
    console.log("✅ Asset details loaded successfully");
  } catch (error) {
    console.error("❌ Error loading asset details:", error);
    showError("Failed to load asset details");
  }
}

// Load basic asset information
async function loadAssetInfo(assetId) {
  try {
    const response = await fetch(`${API_BASE}/assets/${assetId}`);
    const result = await response.json();

    if (result.success) {
      currentAsset = result.data;
      updateAssetHeader();
      updateHardwareInfo();
      updateManualFields();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading asset info:", error);
    showError("Failed to load asset information");
  }
}

// Load software inventory
async function loadSoftwareInventory(assetId) {
  try {
    const response = await fetch(`${API_BASE}/software/${assetId}`);
    const result = await response.json();

    if (result.success && result.data) {
      const asset = result.data;
      updateSoftwareSection(asset.software_info);
      console.log(
        `💿 Loaded software inventory: ${
          asset.software_info?.software_count || 0
        } applications`
      );
    } else {
      // No software data available
      updateSoftwareSection(null);
    }
  } catch (error) {
    console.error("Error loading software inventory:", error);
    updateSoftwareSection(null);
  }
}

// Load ML predictions
async function loadMLPredictions(assetId) {
  try {
    const response = await fetch(
      `${API_BASE}/ml/predictions/${assetId}?limit=5`
    );
    const result = await response.json();

    if (result.success) {
      updateMLPredictions(result.data);
    } else {
      document.getElementById("ml-predictions").innerHTML =
        '<p style="color: #666;">No ML predictions available yet</p>';
    }
  } catch (error) {
    console.error("Error loading ML predictions:", error);
    document.getElementById("ml-predictions").innerHTML =
      '<p style="color: #e74c3c;">ML service unavailable</p>';
  }
}

// Load performance data
async function loadPerformanceData(assetId) {
  try {
    const response = await fetch(`${API_BASE}/telemetry/${assetId}?hours=24`);
    const result = await response.json();

    if (result.success) {
      updatePerformanceCharts(result.data);
    } else {
      document.getElementById("performance-charts").innerHTML =
        '<p style="color: #666;">No performance data available</p>';
    }
  } catch (error) {
    console.error("Error loading performance data:", error);
    document.getElementById("performance-charts").innerHTML =
      '<p style="color: #e74c3c;">Failed to load performance data</p>';
  }
}

// Load asset alerts
async function loadAssetAlerts(assetId) {
  try {
    const response = await fetch(`${API_BASE}/alerts/asset/${assetId}`);
    const result = await response.json();

    if (result.success) {
      updateAlertsTable(result.data);
    } else {
      document.querySelector("#asset-alerts-table tbody").innerHTML =
        '<tr><td colspan="5" class="loading">No alerts found</td></tr>';
    }
  } catch (error) {
    console.error("Error loading asset alerts:", error);
    document.querySelector("#asset-alerts-table tbody").innerHTML =
      '<tr><td colspan="5" style="color: #e74c3c;">Failed to load alerts</td></tr>';
  }
}

// Update functions
function updateAssetHeader() {
  if (!currentAsset) return;

  document.getElementById("asset-title").textContent = `${
    currentAsset.asset_name || currentAsset.hostname
  } (${currentAsset.asset_id})`;

  const isOnline = isAssetOnline(currentAsset);
  const statusText = isOnline ? "🟢 Online" : "🔴 Offline";
  const lastSeen = formatDate(currentAsset.last_seen);

  document.getElementById("asset-subtitle").innerHTML = `${statusText} | ${
    currentAsset.asset_category || "Unknown"
  } | Last seen: ${lastSeen}`;

  document.getElementById("footer-asset-id").textContent =
    currentAsset.asset_id;
}

function updateHardwareInfo() {
  if (!currentAsset || !currentAsset.hardware_info) {
    document.getElementById("hardware-info").innerHTML =
      '<p style="color: #666;">No hardware information available</p>';
    return;
  }

  const hw = currentAsset.hardware_info;

  document.getElementById("hardware-info").innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <strong>💻 CPU:</strong> ${hw.cpu_model || "Unknown"}
      </div>
      <div class="info-item">
        <strong>🧠 RAM:</strong> ${hw.total_ram_gb || "Unknown"}GB
      </div>
      <div class="info-item">
        <strong>💾 Storage:</strong> ${hw.total_storage_gb || "Unknown"}GB
      </div>
      <div class="info-item">
        <strong>🖥️ OS:</strong> ${hw.os_name || "Unknown"} ${
    hw.os_version || ""
  }
      </div>
      <div class="info-item">
        <strong>🌐 IP:</strong> ${currentAsset.ip_address || "Unknown"}
      </div>
      <div class="info-item">
        <strong>📡 MAC:</strong> ${currentAsset.mac_address || "Unknown"}
      </div>
    </div>
  `;
}

function updateManualFields() {
  if (!currentAsset) return;

  const manual = currentAsset.manual_fields || {};

  document.getElementById("manual-fields").innerHTML = `
    <div class="info-grid">
      <div class="info-item">
        <strong>📅 Purchase Date:</strong> ${
          manual.purchase_date
            ? formatDateOnly(manual.purchase_date)
            : "Not set"
        }
      </div>
      <div class="info-item">
        <strong>🛡️ Warranty Expiry:</strong> ${
          manual.warranty_expiry
            ? formatDateOnly(manual.warranty_expiry)
            : "Not set"
        }
      </div>
      <div class="info-item">
        <strong>💰 Purchase Value:</strong> ${
          manual.purchase_value ? `$${manual.purchase_value}` : "Not set"
        }
      </div>
      <div class="info-item">
        <strong>🏢 Vendor:</strong> ${manual.vendor || "Not set"}
      </div>
      <div class="info-item">
        <strong>👤 Handled By:</strong> ${manual.handled_by || "Not set"}
      </div>
      <div class="info-item">
        <strong>📝 Notes:</strong> ${manual.notes || "None"}
      </div>
    </div>
  `;

  // Populate form fields
  const form = document.getElementById("manual-fields-form");
  if (manual.purchase_date)
    form.purchase_date.value = manual.purchase_date.split("T")[0];
  if (manual.warranty_expiry)
    form.warranty_expiry.value = manual.warranty_expiry.split("T")[0];
  if (manual.purchase_value) form.purchase_value.value = manual.purchase_value;
  if (manual.vendor) form.vendor.value = manual.vendor;
  if (manual.handled_by) form.handled_by.value = manual.handled_by;
  if (manual.notes) form.notes.value = manual.notes;
}

// Update software section
function updateSoftwareSection(softwareInfo) {
  if (!softwareInfo || !softwareInfo.software_list) {
    document.getElementById("software-count").textContent = "0";
    document.getElementById("last-scan").textContent = "Never";

    const tbody = document.querySelector("#software-table tbody");
    tbody.innerHTML =
      '<tr><td colspan="4" style="color: #666; text-align: center;">No software inventory available</td></tr>';
    return;
  }

  // Update summary stats
  document.getElementById("software-count").textContent =
    softwareInfo.software_count || 0;

  if (softwareInfo.last_software_scan) {
    const scanDate = new Date(softwareInfo.last_software_scan);
    document.getElementById("last-scan").textContent = formatDate(scanDate);
  }

  // Update software table
  const tbody = document.querySelector("#software-table tbody");
  const softwareList = softwareInfo.software_list || [];

  if (softwareList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="color: #666; text-align: center;">No applications found</td></tr>';
    return;
  }

  // Sort software by name
  const sortedSoftware = softwareList.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  tbody.innerHTML = sortedSoftware
    .map(
      (software) => `
      <tr>
        <td><strong>${software.name}</strong></td>
        <td>${software.version || "Unknown"}</td>
        <td>${software.vendor || "Unknown"}</td>
        <td>${
          software.install_date
            ? formatDate(new Date(software.install_date))
            : "-"
        }</td>
      </tr>
    `
    )
    .join("");
}

function updateMLPredictions(predictions) {
  if (!predictions || predictions.length === 0) {
    document.getElementById("ml-predictions").innerHTML =
      '<p style="color: #666;">No ML predictions available yet. <button class="btn btn-primary" onclick="triggerMLAnalysis()">🤖 Generate Predictions</button></p>';
    return;
  }

  let html = '<div class="ml-predictions-grid">';

  predictions.forEach((prediction) => {
    const data = prediction.prediction_data;
    const type = prediction.prediction_type;
    const timeAgo = formatDate(prediction.created_at);

    html += `<div class="prediction-card">`;

    if (type === "disk_space_prediction" && data.success) {
      const days = data.days_remaining;
      const confidence = data.confidence;
      const severity = days < 7 ? "high" : days < 14 ? "medium" : "low";

      html += `
        <div class="prediction-header ${severity}">
          <h4>💾 Disk Space Prediction</h4>
          <span class="confidence">Confidence: ${(confidence * 100).toFixed(
            0
          )}%</span>
        </div>
        <div class="prediction-content">
          <p class="prediction-main">${data.message}</p>
          <p class="prediction-details">
            Current Usage: ${data.current_usage}% | 
            Daily Increase: ${data.daily_increase_rate}%
          </p>
          <p class="prediction-time">${timeAgo}</p>
        </div>
      `;
    } else if (type === "anomaly_detection" && data.success) {
      const anomalyCount = data.anomaly_count;
      const severity =
        anomalyCount > 3 ? "high" : anomalyCount > 1 ? "medium" : "low";

      html += `
        <div class="prediction-header ${severity}">
          <h4>🔍 Anomaly Detection</h4>
          <span class="confidence">Rate: ${(data.anomaly_rate * 100).toFixed(
            1
          )}%</span>
        </div>
        <div class="prediction-content">
          <p class="prediction-main">${
            data.anomaly_count
          } anomalies detected</p>
          <p class="prediction-details">${data.message}</p>
          <p class="prediction-time">${timeAgo}</p>
        </div>
      `;
    } else if (type === "performance_analysis" && data.success) {
      const healthScore = data.health_score;
      const recCount = data.recommendations ? data.recommendations.length : 0;
      const severity =
        healthScore < 50 ? "high" : healthScore < 75 ? "medium" : "low";

      html += `
        <div class="prediction-header ${severity}">
          <h4>📈 Performance Analysis</h4>
          <span class="confidence">Health: ${healthScore}/100</span>
        </div>
        <div class="prediction-content">
          <p class="prediction-main">${recCount} recommendations generated</p>
          <p class="prediction-details">${data.message}</p>
          <p class="prediction-time">${timeAgo}</p>
        </div>
      `;
    }

    html += `</div>`;
  });

  html += "</div>";

  // Add recommendations section
  const latestAnalysis = predictions.find(
    (p) => p.prediction_type === "performance_analysis"
  );
  if (latestAnalysis && latestAnalysis.prediction_data.recommendations) {
    html += '<div class="recommendations-section">';
    html += "<h4>💡 Latest Recommendations:</h4>";
    html += '<ul class="recommendations-list">';

    latestAnalysis.prediction_data.recommendations
      .slice(0, 5)
      .forEach((rec) => {
        const priorityClass = rec.priority.toLowerCase();
        html += `
        <li class="recommendation-item ${priorityClass}">
          <span class="priority-badge ${priorityClass}">${rec.priority}</span>
          <strong>${rec.message}</strong>
          <br><small>Action: ${rec.action}</small>
        </li>
      `;
      });

    html += "</ul></div>";
  }

  document.getElementById("ml-predictions").innerHTML = html;
}

function updatePerformanceCharts(telemetryData) {
  if (!telemetryData || telemetryData.length === 0) {
    document.getElementById("performance-charts").innerHTML =
      '<p style="color: #666;">No performance data available</p>';
    return;
  }

  // Simple text-based performance summary (could be enhanced with actual charts)
  const latest = telemetryData[0]; // Most recent
  const oldest = telemetryData[telemetryData.length - 1];

  // Calculate averages
  const avgCPU =
    telemetryData.reduce((sum, t) => sum + (t.cpu_usage_percent || 0), 0) /
    telemetryData.length;
  const avgRAM =
    telemetryData.reduce((sum, t) => sum + (t.ram_usage_percent || 0), 0) /
    telemetryData.length;
  const avgDisk =
    telemetryData.reduce((sum, t) => sum + (t.disk_usage_percent || 0), 0) /
    telemetryData.length;

  document.getElementById("performance-charts").innerHTML = `
    <div class="performance-summary">
      <div class="performance-metric">
        <h4>💻 CPU Usage</h4>
        <div class="metric-current">Current: ${
          latest.cpu_usage_percent?.toFixed(1) || 0
        }%</div>
        <div class="metric-average">24h Average: ${avgCPU.toFixed(1)}%</div>
        <div class="performance-bar">
          <div class="performance-fill ${getPerformanceClass(
            latest.cpu_usage_percent
          )}" 
               style="width: ${latest.cpu_usage_percent || 0}%"></div>
        </div>
      </div>
      
      <div class="performance-metric">
        <h4>🧠 RAM Usage</h4>
        <div class="metric-current">Current: ${
          latest.ram_usage_percent?.toFixed(1) || 0
        }%</div>
        <div class="metric-average">24h Average: ${avgRAM.toFixed(1)}%</div>
        <div class="performance-bar">
          <div class="performance-fill ${getPerformanceClass(
            latest.ram_usage_percent
          )}" 
               style="width: ${latest.ram_usage_percent || 0}%"></div>
        </div>
      </div>
      
      <div class="performance-metric">
        <h4>💾 Disk Usage</h4>
        <div class="metric-current">Current: ${
          latest.disk_usage_percent?.toFixed(1) || 0
        }%</div>
        <div class="metric-average">24h Average: ${avgDisk.toFixed(1)}%</div>
        <div class="performance-bar">
          <div class="performance-fill ${getPerformanceClass(
            latest.disk_usage_percent
          )}" 
               style="width: ${latest.disk_usage_percent || 0}%"></div>
        </div>
      </div>
    </div>
    
    <div class="data-summary">
      <p><strong>Data Points:</strong> ${
        telemetryData.length
      } measurements over last 24 hours</p>
      <p><strong>Collection Period:</strong> ${formatDate(
        oldest.timestamp
      )} to ${formatDate(latest.timestamp)}</p>
    </div>
  `;
}

function updateAlertsTable(alerts) {
  const tbody = document.querySelector("#asset-alerts-table tbody");

  if (!alerts || alerts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="loading">No alerts for this asset</td></tr>';
    return;
  }

  // Sort by created_at (most recent first) and take first 10
  const recentAlerts = alerts
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  tbody.innerHTML = recentAlerts
    .map(
      (alert) => `
    <tr>
      <td>
        ${alert.ml_generated ? "🤖 " : ""}${formatAlertType(alert.type)}
      </td>
      <td>${alert.message}</td>
      <td><span class="severity ${alert.severity.toLowerCase()}">${
        alert.severity
      }</span></td>
      <td><span class="status ${getStatusClass(alert.status)}">${
        alert.status
      }</span></td>
      <td>${formatDate(alert.created_at)}</td>
    </tr>
  `
    )
    .join("");
}

// ML Analysis functions
async function triggerMLAnalysis() {
  if (!currentAsset) return;

  try {
    document.querySelector(
      'button[onclick="triggerMLAnalysis()"]'
    ).textContent = "⏳ Analyzing...";
    document.querySelector(
      'button[onclick="triggerMLAnalysis()"]'
    ).disabled = true;

    const response = await fetch(
      `${API_BASE}/ml/analyze/${currentAsset.asset_id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis_type: "full" }),
      }
    );

    const result = await response.json();

    if (result.success) {
      showSuccess("ML analysis completed successfully!");
      // Reload ML predictions
      setTimeout(() => {
        loadMLPredictions(currentAsset.asset_id);
      }, 2000);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error triggering ML analysis:", error);
    showError("Failed to run ML analysis");
  } finally {
    document.querySelector(
      'button[onclick="triggerMLAnalysis()"]'
    ).textContent = "🤖 Run ML Analysis";
    document.querySelector(
      'button[onclick="triggerMLAnalysis()"]'
    ).disabled = false;
  }
}

// Manual fields editing
function toggleEditMode() {
  isEditMode = !isEditMode;

  if (isEditMode) {
    document.getElementById("manual-fields").style.display = "none";
    document.getElementById("manual-fields-form").style.display = "block";
    document.querySelector('button[onclick="toggleEditMode()"]').textContent =
      "❌ Cancel Edit";
  } else {
    document.getElementById("manual-fields").style.display = "block";
    document.getElementById("manual-fields-form").style.display = "none";
    document.querySelector('button[onclick="toggleEditMode()"]').textContent =
      "✏️ Edit Manual Fields";
  }
}

function cancelEdit() {
  toggleEditMode();
}

async function saveManualFields(event) {
  event.preventDefault();

  if (!currentAsset) return;

  try {
    const formData = new FormData(event.target);
    const manualFields = {};

    for (let [key, value] of formData.entries()) {
      if (value.trim()) {
        manualFields[key] = value;
      }
    }

    const response = await fetch(
      `${API_BASE}/assets/${currentAsset.asset_id}/manual`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(manualFields),
      }
    );

    const result = await response.json();

    if (result.success) {
      showSuccess("Manual fields updated successfully!");
      currentAsset = result.data;
      updateManualFields();
      toggleEditMode();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error saving manual fields:", error);
    showError("Failed to save manual fields");
  }
}

// Helper functions
function isAssetOnline(asset) {
  const now = new Date();
  const lastSeen = new Date(asset.last_seen);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  return lastSeen > tenMinutesAgo;
}

function getPerformanceClass(percentage) {
  if (percentage > 90) return "high";
  if (percentage > 70) return "medium";
  return "low";
}

function formatAlertType(type) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case "open":
      return "warning";
    case "acknowledged":
      return "warning";
    case "resolved":
      return "online";
    default:
      return "offline";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

function formatDateOnly(dateString) {
  return new Date(dateString).toLocaleDateString();
}

function updateLastUpdated() {
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();
}

function showError(message) {
  console.error("Error:", message);
  alert(`Error: ${message}`);
}

function showSuccess(message) {
  console.log("Success:", message);
  alert(`Success: ${message}`);
}

function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}
