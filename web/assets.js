// Simple Asset Monitor - Assets Page JavaScript

const API_BASE = "/api";
let allAssets = [];
let filteredAssets = [];

// Initialize assets page
document.addEventListener("DOMContentLoaded", function () {
  console.log("📋 Assets page initializing...");
  loadAssets();

  // Setup event listeners
  document
    .getElementById("search-input")
    .addEventListener("input", filterAssets);
  document
    .getElementById("status-filter")
    .addEventListener("change", filterAssets);
  document
    .getElementById("category-filter")
    .addEventListener("change", filterAssets);
  document
    .getElementById("branch-filter")
    .addEventListener("change", filterAssets);

  // Auto-refresh every 60 seconds
  setInterval(loadAssets, 60000);
});

// Load all assets
async function loadAssets() {
  try {
    console.log("📋 Loading assets...");

    const response = await fetch(`${API_BASE}/assets`);
    const result = await response.json();

    if (result.success) {
      allAssets = result.data;
      filteredAssets = [...allAssets];
      console.log(`✅ Loaded ${allAssets.length} assets`);

      updateAssetsTable();
      updateAssetCount();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("❌ Error loading assets:", error);
    showError("Failed to load assets");
  }
}

// Filter assets based on search and filters
function filterAssets() {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();
  const statusFilter = document.getElementById("status-filter").value;
  const categoryFilter = document.getElementById("category-filter").value;
  const branchFilter = document.getElementById("branch-filter").value;

  filteredAssets = allAssets.filter((asset) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      asset.asset_id.toLowerCase().includes(searchTerm) ||
      asset.asset_name.toLowerCase().includes(searchTerm) ||
      asset.hostname.toLowerCase().includes(searchTerm) ||
      (asset.ip_address &&
        asset.ip_address.toLowerCase().includes(searchTerm)) ||
      (asset.branch && asset.branch.toLowerCase().includes(searchTerm));

    // Status filter
    const matchesStatus = !statusFilter || asset.status === statusFilter;

    // Category filter
    const matchesCategory =
      !categoryFilter || asset.asset_category === categoryFilter;

    // Branch filter
    const matchesBranch = !branchFilter || asset.branch === branchFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesBranch;
  });

  updateAssetsTable();
  updateAssetCount();
}

// Update assets table
function updateAssetsTable() {
  const tbody = document.querySelector("#assets-table tbody");

  if (filteredAssets.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="loading">No assets found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredAssets
    .map((asset) => {
      const isOnline = isAssetOnline(asset);
      const hardwareInfo = getHardwareInfo(asset);

      return `
            <tr>
                <td><strong>${asset.asset_id}</strong></td>
                <td>${asset.asset_name || "-"}</td>
                <td>${asset.hostname}</td>
                <td>${asset.asset_category || "Unknown"}</td>
                <td>${asset.branch || "Main Office"}</td>
                <td>${asset.ip_address || "-"}</td>
                <td><span class="status ${isOnline ? "online" : "offline"}">${
        isOnline ? "Online" : "Offline"
      }</span></td>
                <td>${hardwareInfo}</td>
                <td>${formatDate(asset.last_seen)}</td>
                <td>
                    <button class="btn btn-primary" onclick="viewAssetDetail('${
                      asset.asset_id
                    }')">View</button>
                    <button class="btn btn-secondary" onclick="editAsset('${
                      asset.asset_id
                    }')">Edit</button>
                    <button class="btn btn-info" onclick="manageComponents('${
                      asset.asset_id
                    }')">🔧 Components</button>
                </td>
            </tr>
        `;
    })
    .join("");
}

// Helper functions
function isAssetOnline(asset) {
  const now = new Date();
  const lastSeen = new Date(asset.last_seen);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
  return lastSeen > tenMinutesAgo;
}

function getHardwareInfo(asset) {
  if (!asset.hardware_info) return "-";

  const parts = [];
  if (asset.hardware_info.cpu_model) {
    parts.push(`CPU: ${asset.hardware_info.cpu_model.substring(0, 20)}...`);
  }
  if (asset.hardware_info.total_ram_gb) {
    parts.push(`RAM: ${asset.hardware_info.total_ram_gb}GB`);
  }
  if (asset.hardware_info.total_storage_gb) {
    parts.push(`Storage: ${asset.hardware_info.total_storage_gb}GB`);
  }

  return parts.length > 0 ? parts.join("<br>") : "-";
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

function updateAssetCount() {
  document.getElementById("asset-count").textContent = filteredAssets.length;
}

function showError(message) {
  console.error("Error:", message);
  alert(`Error: ${message}`);
}

// Navigation functions
function viewAssetDetail(assetId) {
  window.location.href = `asset-detail.html?id=${assetId}`;
}

function editAsset(assetId) {
  // For now, redirect to detail page - could be enhanced with inline editing
  window.location.href = `asset-detail.html?id=${assetId}&edit=true`;
}

function manageComponents(assetId) {
  // Redirect to hardware components page with the asset pre-selected
  window.location.href = `hardware-components.html?asset=${assetId}`;
}
