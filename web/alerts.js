// Simple Asset Monitor - Alerts Page JavaScript

const API_BASE = "/api";
let allAlerts = [];
let filteredAlerts = [];

// Initialize alerts page
document.addEventListener("DOMContentLoaded", function () {
  console.log("🚨 Alerts page initializing...");
  loadAlerts();

  // Setup event listeners
  document
    .getElementById("status-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("severity-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("type-filter")
    .addEventListener("change", filterAlerts);

  // Auto-refresh every 30 seconds
  setInterval(loadAlerts, 30000);
});

// Load all alerts
async function loadAlerts() {
  try {
    console.log("🚨 Loading alerts...");

    const response = await fetch(`${API_BASE}/alerts`);
    const result = await response.json();

    if (result.success) {
      allAlerts = result.data;
      filteredAlerts = [...allAlerts];
      console.log(`✅ Loaded ${allAlerts.length} alerts`);

      updateSummaryCards();
      filterAlerts(); // Apply current filters
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("❌ Error loading alerts:", error);
    showError("Failed to load alerts");
  }
}

// Filter alerts based on filters
function filterAlerts() {
  const statusFilter = document.getElementById("status-filter").value;
  const severityFilter = document.getElementById("severity-filter").value;
  const typeFilter = document.getElementById("type-filter").value;

  filteredAlerts = allAlerts.filter((alert) => {
    const matchesStatus = !statusFilter || alert.status === statusFilter;
    const matchesSeverity =
      !severityFilter || alert.severity === severityFilter;
    const matchesType = !typeFilter || alert.type === typeFilter;

    return matchesStatus && matchesSeverity && matchesType;
  });

  updateAlertsTable();
  updateAlertCount();
}

// Update summary cards
function updateSummaryCards() {
  // Open alerts
  const openAlerts = allAlerts.filter((alert) => alert.status === "Open");
  document.getElementById("open-alerts").textContent = openAlerts.length;

  // High severity alerts
  const highSeverity = allAlerts.filter(
    (alert) => alert.severity === "High" && alert.status === "Open"
  );
  document.getElementById("high-severity").textContent = highSeverity.length;

  // Medium severity alerts
  const mediumSeverity = allAlerts.filter(
    (alert) => alert.severity === "Medium" && alert.status === "Open"
  );
  document.getElementById("medium-severity").textContent =
    mediumSeverity.length;

  // Resolved today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const resolvedToday = allAlerts.filter((alert) => {
    if (!alert.resolved_at) return false;
    const resolvedDate = new Date(alert.resolved_at);
    return resolvedDate >= today;
  });
  document.getElementById("resolved-today").textContent = resolvedToday.length;
}

// Update alerts table
function updateAlertsTable() {
  const tbody = document.querySelector("#alerts-table tbody");

  if (filteredAlerts.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="loading">No alerts found</td></tr>';
    return;
  }

  // Sort by created_at (most recent first)
  const sortedAlerts = filteredAlerts.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  tbody.innerHTML = sortedAlerts
    .map(
      (alert) => `
        <tr>
            <td><strong>${alert.asset_id}</strong></td>
            <td>${formatAlertType(alert.type)}</td>
            <td>${alert.message}</td>
            <td><span class="severity ${alert.severity.toLowerCase()}">${
        alert.severity
      }</span></td>
            <td><span class="status ${getStatusClass(alert.status)}">${
        alert.status
      }</span></td>
            <td>${formatDate(alert.created_at)}</td>
            <td>
                ${
                  alert.status === "Open"
                    ? `
                    <button class="btn btn-secondary" onclick="acknowledgeAlert('${alert._id}')">Acknowledge</button>
                    <button class="btn btn-primary" onclick="resolveAlert('${alert._id}')">Resolve</button>
                `
                    : "-"
                }
            </td>
        </tr>
    `
    )
    .join("");
}

// Helper functions
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

function updateAlertCount() {
  document.getElementById("alert-count").textContent = filteredAlerts.length;
}

function showError(message) {
  console.error("Error:", message);
  alert(`Error: ${message}`);
}

function showSuccess(message) {
  console.log("Success:", message);
  // Simple success notification - could be enhanced
  alert(`Success: ${message}`);
}

// Alert action functions
async function acknowledgeAlert(alertId) {
  try {
    const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "Acknowledged" }),
    });

    const result = await response.json();

    if (result.success) {
      showSuccess("Alert acknowledged successfully");
      loadAlerts(); // Reload to update UI
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    showError("Failed to acknowledge alert");
  }
}

async function resolveAlert(alertId) {
  try {
    const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "Resolved" }),
    });

    const result = await response.json();

    if (result.success) {
      showSuccess("Alert resolved successfully");
      loadAlerts(); // Reload to update UI
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error resolving alert:", error);
    showError("Failed to resolve alert");
  }
}

