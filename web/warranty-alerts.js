// Warranty Alerts Page JavaScript

const API_BASE = "/api";

// Global variables
let allWarrantyAlerts = [];
let filteredWarrantyAlerts = [];

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚨 Warranty Alerts page initializing...");
  loadWarrantyAlerts();
  setupEventListeners();

  // Auto-refresh every 60 seconds
  setInterval(loadWarrantyAlerts, 60000);
});

// Setup event listeners
function setupEventListeners() {
  document
    .getElementById("severity-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("component-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("search-input")
    .addEventListener("input", filterAlerts);
}

// Load warranty alerts
async function loadWarrantyAlerts() {
  try {
    console.log("🚨 Loading warranty alerts...");

    const response = await fetch(`${API_BASE}/assets/warranty-alerts/all`);
    const result = await response.json();

    if (result.success) {
      allWarrantyAlerts = result.data;
      filteredWarrantyAlerts = [...allWarrantyAlerts];
      console.log(`✅ Loaded ${allWarrantyAlerts.length} warranty alerts`);

      updateWarrantySummary();
      updateAlertsList();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("❌ Error loading warranty alerts:", error);
    showError("Failed to load warranty alerts");
  }
}

// Filter alerts based on search and filters
function filterAlerts() {
  const severityFilter = document.getElementById("severity-filter").value;
  const componentFilter = document.getElementById("component-filter").value;
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();

  filteredWarrantyAlerts = allWarrantyAlerts.filter((alert) => {
    // Severity filter
    const matchesSeverity =
      !severityFilter || alert.severity === severityFilter;

    // Component type filter
    const matchesComponent =
      !componentFilter || alert.component_type === componentFilter;

    // Search filter
    const matchesSearch =
      !searchTerm ||
      alert.asset_name.toLowerCase().includes(searchTerm) ||
      alert.hostname.toLowerCase().includes(searchTerm) ||
      alert.component.toLowerCase().includes(searchTerm) ||
      alert.asset_id.toLowerCase().includes(searchTerm);

    return matchesSeverity && matchesComponent && matchesSearch;
  });

  updateAlertsList();
}

// Update warranty summary
function updateWarrantySummary() {
  const expired = allWarrantyAlerts.filter(
    (a) => a.severity === "Expired"
  ).length;
  const critical = allWarrantyAlerts.filter(
    (a) => a.severity === "Critical"
  ).length;
  const warning = allWarrantyAlerts.filter(
    (a) => a.severity === "Warning"
  ).length;

  document.getElementById("expired-count").textContent = expired;
  document.getElementById("critical-count").textContent = critical;
  document.getElementById("warning-count").textContent = warning;
}

// Update alerts list
function updateAlertsList() {
  const container = document.getElementById("warranty-alerts-list");

  if (filteredWarrantyAlerts.length === 0) {
    container.innerHTML = '<p class="loading">No warranty alerts found.</p>';
    return;
  }

  container.innerHTML = filteredWarrantyAlerts
    .map(
      (alert) => `
    <div class="alert-card">
      <div class="alert-header">
        <h3>${alert.component} - ${alert.component_type}</h3>
        <span class="alert-severity severity-${alert.severity.toLowerCase()}">${
        alert.severity
      }</span>
      </div>
      
      <div class="alert-details">
        <div class="detail-item">
          <span class="detail-label">Asset:</span> ${alert.asset_name} (${
        alert.hostname
      })
        </div>
        <div class="detail-item">
          <span class="detail-label">Asset ID:</span> ${alert.asset_id}
        </div>
        <div class="detail-item">
          <span class="detail-label">Message:</span> ${alert.message}
        </div>
        <div class="detail-item">
          <span class="detail-label">Days Until Expiry:</span> ${
            alert.days_until_expiry
          }
        </div>
      </div>
      
      <div class="alert-actions">
        <a href="hardware-components.html?asset=${
          alert.asset_id
        }" class="btn-view-asset">View Components</a>
        <a href="asset-detail.html?id=${
          alert.asset_id
        }" class="btn-view-asset">View Asset</a>
      </div>
    </div>
  `
    )
    .join("");
}

// Helper functions
function showError(message) {
  console.error("Error:", message);
  alert(`Error: ${message}`);
}

// Update last updated timestamp
function updateLastUpdated() {
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();
}

// Auto-refresh timestamp
setInterval(updateLastUpdated, 30000);
