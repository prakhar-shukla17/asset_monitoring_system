// Simple Asset Monitor - Dashboard JavaScript

const API_BASE = "/api";

// Global data storage
let assetsData = [];
let telemetryData = [];
let alertsData = [];
let warrantyAlertsData = [];

// Initialize dashboard
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚀 Dashboard initializing...");
  loadDashboardData();

  // Auto-refresh every 30 seconds
  setInterval(loadDashboardData, 30000);
});

// Load all dashboard data
async function loadDashboardData() {
  try {
    console.log("📊 Loading dashboard data...");

    // Load data in parallel
    await Promise.all([
      loadAssets(),
      loadTelemetry(),
      loadAlerts(),
      loadWarrantyAlerts(),
      loadPatchRegistryStats(),
    ]);

    // Update UI
    updateSummaryCards();
    updateRecentAssetsTable();
    updateRecentAlertsTable();
    updateLastUpdated();

    console.log("✅ Dashboard data loaded successfully");
  } catch (error) {
    console.error("❌ Error loading dashboard data:", error);
    showError("Failed to load dashboard data");
  }
}

// Load assets data
async function loadAssets() {
  try {
    const response = await fetch(`${API_BASE}/assets`);
    const result = await response.json();

    if (result.success) {
      assetsData = result.data;
      console.log(`📋 Loaded ${assetsData.length} assets`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading assets:", error);
    assetsData = [];
  }
}

// Load telemetry data
async function loadTelemetry() {
  try {
    const response = await fetch(`${API_BASE}/telemetry`);
    const result = await response.json();

    if (result.success) {
      telemetryData = result.data;
      console.log(`📊 Loaded telemetry for ${telemetryData.length} assets`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading telemetry:", error);
    telemetryData = [];
  }
}

// Load alerts data
async function loadAlerts() {
  try {
    const response = await fetch(`${API_BASE}/alerts?status=Open`);
    const result = await response.json();

    if (result.success) {
      alertsData = result.data;
      console.log(`🚨 Loaded ${alertsData.length} open alerts`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading alerts:", error);
    alertsData = [];
  }
}

// Load warranty alerts data
async function loadWarrantyAlerts() {
  try {
    const response = await fetch(`${API_BASE}/assets/warranty-alerts/all`);
    const result = await response.json();

    if (result.success) {
      warrantyAlertsData = result.data;
      console.log(`🔧 Loaded ${warrantyAlertsData.length} warranty alerts`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading warranty alerts:", error);
    warrantyAlertsData = [];
  }
}

// Load patch registry statistics
async function loadPatchRegistryStats() {
  try {
    const response = await fetch(`${API_BASE}/patch-registry/statistics`);
    const result = await response.json();

    if (result.success) {
      // Store patch registry stats globally
      window.patchRegistryStats = result.data;
      console.log(`🛠️ Loaded patch registry statistics`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading patch registry stats:", error);
    window.patchRegistryStats = {
      total_alerts: 0,
      critical_alerts: 0,
      high_alerts: 0,
      new_alerts: 0,
    };
  }
}

// Update summary cards
function updateSummaryCards() {
  // Total assets
  document.getElementById("total-assets").textContent = assetsData.length;

  // Online assets (seen in last 10 minutes)
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const onlineAssets = assetsData.filter((asset) => {
    const lastSeen = new Date(asset.last_seen);
    return lastSeen > tenMinutesAgo;
  });
  document.getElementById("online-assets").textContent = onlineAssets.length;

  // Open alerts
  document.getElementById("open-alerts").textContent = alertsData.length;

  // Warranty alerts (critical and expired only)
  const criticalWarrantyAlerts = warrantyAlertsData.filter(
    (alert) => alert.severity === "Critical" || alert.severity === "Expired"
  );
  document.getElementById("warranty-alerts").textContent =
    criticalWarrantyAlerts.length;

  // Make warranty alerts card clickable
  const warrantyCard = document.querySelector(".card:nth-child(5)");
  if (warrantyCard) {
    warrantyCard.style.cursor = "pointer";
    warrantyCard.onclick = () =>
      (window.location.href = "warranty-alerts.html");
  }

  // Average CPU usage
  if (telemetryData.length > 0) {
    const avgCpu =
      telemetryData.reduce((sum, t) => sum + (t.cpu_usage_percent || 0), 0) /
      telemetryData.length;
    document.getElementById("avg-performance").textContent = `${avgCpu.toFixed(
      1
    )}%`;
  } else {
    document.getElementById("avg-performance").textContent = "0%";
  }
}

// Update recent assets table
function updateRecentAssetsTable() {
  const tbody = document.querySelector("#recent-assets-table tbody");

  if (assetsData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="loading">No assets found</td></tr>';
    return;
  }

  // Sort by last_seen (most recent first) and take first 10
  const recentAssets = assetsData
    .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
    .slice(0, 10);

  tbody.innerHTML = recentAssets
    .map((asset) => {
      const telemetry = telemetryData.find(
        (t) => t.asset_id === asset.asset_id
      );
      const isOnline = isAssetOnline(asset);

      return `
            <tr onclick="viewAsset('${asset.asset_id}')">
                <td><strong>${asset.asset_id}</strong></td>
                <td>${asset.asset_name || asset.hostname}</td>
                <td>${asset.asset_category || "Unknown"}</td>
                <td><span class="status ${isOnline ? "online" : "offline"}">${
        isOnline ? "Online" : "Offline"
      }</span></td>
                <td>${formatDate(asset.last_seen)}</td>
                <td>${
                  telemetry
                    ? createPerformanceBar(telemetry.cpu_usage_percent)
                    : "-"
                }</td>
                <td>${
                  telemetry
                    ? createPerformanceBar(telemetry.ram_usage_percent)
                    : "-"
                }</td>
                <td>${
                  telemetry
                    ? createPerformanceBar(telemetry.disk_usage_percent)
                    : "-"
                }</td>
            </tr>
        `;
    })
    .join("");
}

// Update recent alerts table
function updateRecentAlertsTable() {
  const tbody = document.querySelector("#recent-alerts-table tbody");

  if (alertsData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="loading">No open alerts</td></tr>';
    return;
  }

  // Sort by created_at (most recent first) and take first 10
  const recentAlerts = alertsData
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10);

  tbody.innerHTML = recentAlerts
    .map(
      (alert) => `
        <tr onclick="viewAlert('${alert._id}')">
            <td><strong>${alert.asset_id}</strong></td>
            <td>${alert.type.replace("_", " ")}</td>
            <td>${alert.message}</td>
            <td><span class="severity ${alert.severity.toLowerCase()}">${
        alert.severity
      }</span></td>
            <td>${formatDate(alert.created_at)}</td>
            <td><span class="status ${alert.status.toLowerCase()}">${
        alert.status
      }</span></td>
        </tr>
    `
    )
    .join("");
}

// Helper functions
function isAssetOnline(asset) {
  const now = new Date();
  const lastSeen = new Date(asset.last_seen);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  return lastSeen > tenMinutesAgo;
}

function createPerformanceBar(percentage) {
  if (percentage === null || percentage === undefined) return "-";

  const value = Math.round(percentage);
  let className = "low";
  if (value > 70) className = "medium";
  if (value > 90) className = "high";

  return `
        <div class="performance-bar">
            <div class="performance-fill ${className}" style="width: ${value}%"></div>
        </div>
        <small>${value}%</small>
    `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}

function updateLastUpdated() {
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();
}

function showError(message) {
  console.error("Error:", message);
  // Simple error display - could be enhanced with a proper notification system
  alert(`Error: ${message}`);
}

// Navigation functions
function viewAsset(assetId) {
  window.location.href = `asset-detail.html?id=${assetId}`;
}

function viewAlert(alertId) {
  window.location.href = `alerts.html#${alertId}`;
}

// Utility function to get URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  const results = regex.exec(location.search);
  return results === null
    ? ""
    : decodeURIComponent(results[1].replace(/\+/g, " "));
}
