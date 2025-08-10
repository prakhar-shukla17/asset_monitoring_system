// Patch Registry JavaScript
const API_BASE = "/api";

let patchAlerts = [];
let filteredAlerts = [];

document.addEventListener("DOMContentLoaded", function () {
  loadPatchAlerts();
  loadStatistics();
  setupEventListeners();
  updateLastUpdated();
});

function setupEventListeners() {
  document
    .getElementById("check-updates-btn")
    .addEventListener("click", checkForUpdates);
  document
    .getElementById("status-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("priority-filter")
    .addEventListener("change", filterAlerts);
  document
    .getElementById("search-input")
    .addEventListener("input", filterAlerts);
}

async function checkForUpdates() {
  const btn = document.getElementById("check-updates-btn");
  const status = document.getElementById("check-status");

  btn.disabled = true;
  btn.innerHTML =
    '<span class="loading-spinner"></span>Checking for updates...';
  status.innerHTML =
    '<div class="check-status info">🔍 Starting software update check...</div>';

  try {
    const response = await fetch(`${API_BASE}/patch-registry/check-updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();

    if (result.success) {
      status.innerHTML = `<div class="check-status success">✅ Found ${result.data.total_updates} software updates, saved ${result.data.saved_count} to database</div>`;
      loadPatchAlerts(); // Refresh the list
      loadStatistics(); // Refresh statistics
    } else {
      status.innerHTML = `<div class="check-status error">❌ Error: ${result.message}</div>`;
    }
  } catch (error) {
    status.innerHTML = `<div class="check-status error">❌ Error: ${error.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Check for Software Updates";
  }
}

async function loadPatchAlerts() {
  try {
    console.log("🔍 Loading patch alerts...");
    const response = await fetch(`${API_BASE}/patch-registry/alerts`);
    console.log("📡 Response status:", response.status);

    const result = await response.json();
    console.log("📊 API Response:", result);

    if (result.success) {
      patchAlerts = result.data;
      filteredAlerts = [...patchAlerts];
      console.log(`✅ Loaded ${patchAlerts.length} patch alerts`);
      displayPatchAlerts(filteredAlerts);
    } else {
      console.error("❌ API returned error:", result.message);
      document.getElementById(
        "patch-alerts-list"
      ).innerHTML = `<p class="error">API Error: ${result.message}</p>`;
    }
  } catch (error) {
    console.error("❌ Network error loading patch alerts:", error);
    document.getElementById(
      "patch-alerts-list"
    ).innerHTML = `<p class="error">Network Error: ${error.message}</p>`;
  }
}

async function loadStatistics() {
  try {
    console.log("📊 Loading statistics...");
    const response = await fetch(`${API_BASE}/patch-registry/statistics`);
    console.log("📡 Statistics response status:", response.status);

    const result = await response.json();
    console.log("📈 Statistics response:", result);

    if (result.success) {
      const stats = result.data;
      document.getElementById("total-alerts").textContent = stats.total_alerts;
      document.getElementById("critical-alerts").textContent =
        stats.critical_alerts;
      document.getElementById("high-alerts").textContent = stats.high_alerts;
      document.getElementById("new-alerts").textContent = stats.new_alerts;
      document.getElementById("recent-alerts").textContent =
        stats.recent_alerts;
      console.log("✅ Statistics updated successfully");
    } else {
      console.error("❌ Statistics API error:", result.message);
    }
  } catch (error) {
    console.error("❌ Network error loading statistics:", error);
  }
}

function displayPatchAlerts(alerts) {
  const container = document.getElementById("patch-alerts-list");

  if (alerts.length === 0) {
    container.innerHTML = "<p>No software updates found.</p>";
    return;
  }

  container.innerHTML = alerts
    .map(
      (alert) => `
    <div class="alert-card">
      <div class="alert-header">
        <h3 class="alert-title">${alert.software_name}</h3>
        <span class="alert-priority priority-${alert.priority.toLowerCase()}">${
        alert.priority
      }</span>
      </div>
      <div class="alert-details">
        <div class="detail-item">
          <span class="detail-label">Asset:</span> ${alert.asset_name} (${
        alert.hostname
      })
        </div>
        <div class="detail-item">
          <span class="detail-label">Current Version:</span> ${
            alert.current_version
          }
        </div>
        <div class="detail-item">
          <span class="detail-label">Latest Version:</span> ${
            alert.latest_version
          }
        </div>
        <div class="detail-item">
          <span class="detail-label">Vendor:</span> ${alert.vendor}
        </div>
        <div class="detail-item">
          <span class="detail-label">Status:</span> ${alert.status}
        </div>
        <div class="detail-item">
          <span class="detail-label">Check Date:</span> ${formatDate(
            alert.check_date
          )}
        </div>
      </div>
      ${
        alert.patch_notes
          ? `<div class="patch-notes">${alert.patch_notes}</div>`
          : ""
      }
      <div class="alert-actions">
        ${
          alert.vendor_website
            ? `<a href="${alert.vendor_website}" target="_blank" class="btn-download">Download</a>`
            : ""
        }
        <button onclick="updateAlertStatus('${
          alert._id
        }', 'Acknowledged')" class="btn-acknowledge">Acknowledge</button>
        <button onclick="updateAlertStatus('${
          alert._id
        }', 'Resolved')" class="btn-resolve">Mark Resolved</button>
        <button onclick="deleteAlert('${
          alert._id
        }')" class="btn-delete">Delete</button>
      </div>
    </div>
  `
    )
    .join("");
}

async function updateAlertStatus(alertId, status) {
  try {
    const response = await fetch(
      `${API_BASE}/patch-registry/alerts/${alertId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );

    const result = await response.json();
    if (result.success) {
      loadPatchAlerts(); // Refresh the list
      loadStatistics(); // Refresh statistics
    } else {
      alert(`Error updating alert: ${result.message}`);
    }
  } catch (error) {
    console.error("Error updating alert status:", error);
    alert("Error updating alert status");
  }
}

async function deleteAlert(alertId) {
  if (!confirm("Are you sure you want to delete this alert?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/patch-registry/alerts/${alertId}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();
    if (result.success) {
      loadPatchAlerts(); // Refresh the list
      loadStatistics(); // Refresh statistics
    } else {
      alert(`Error deleting alert: ${result.message}`);
    }
  } catch (error) {
    console.error("Error deleting alert:", error);
    alert("Error deleting alert");
  }
}

function filterAlerts() {
  const statusFilter = document.getElementById("status-filter").value;
  const priorityFilter = document.getElementById("priority-filter").value;
  const searchFilter = document
    .getElementById("search-input")
    .value.toLowerCase();

  filteredAlerts = patchAlerts.filter((alert) => {
    // Status filter
    if (statusFilter && alert.status !== statusFilter) return false;

    // Priority filter
    if (priorityFilter && alert.priority !== priorityFilter) return false;

    // Search filter
    if (searchFilter) {
      const searchText =
        `${alert.software_name} ${alert.asset_name} ${alert.hostname} ${alert.vendor}`.toLowerCase();
      if (!searchText.includes(searchFilter)) return false;
    }

    return true;
  });

  displayPatchAlerts(filteredAlerts);
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

function updateLastUpdated() {
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();
}

// Auto-refresh every 30 seconds
setInterval(() => {
  loadPatchAlerts();
  loadStatistics();
  updateLastUpdated();
}, 30000);
