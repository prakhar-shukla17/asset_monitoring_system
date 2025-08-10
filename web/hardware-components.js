// Hardware Components Management JavaScript

const API_BASE = "/api";

// Global variables
let currentAssetId = null;
let assetsData = [];
let componentsData = [];
let warrantyAlerts = [];

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔧 Hardware Components page initializing...");
  loadAssets();
  setupEventListeners();

  // Check if asset is specified in URL
  const urlParams = new URLSearchParams(window.location.search);
  const assetParam = urlParams.get("asset");
  if (assetParam) {
    // Set the asset selector after assets are loaded
    setTimeout(() => {
      document.getElementById("asset-selector").value = assetParam;
      currentAssetId = assetParam;
      loadComponents();
      loadWarrantyAlerts();
    }, 1000);
  }
});

// Setup event listeners
function setupEventListeners() {
  // Asset selector change
  document
    .getElementById("asset-selector")
    .addEventListener("change", function (e) {
      currentAssetId = e.target.value;
      if (currentAssetId) {
        loadComponents();
        loadWarrantyAlerts();
        populateFormWithHardwareData();
      } else {
        hideComponents();
        clearForm();
      }
    });

  // Component form submission
  document
    .getElementById("component-form")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      addComponent();
    });

  // Auto-calculate warranty end date when duration changes
  document
    .getElementById("warranty-duration")
    .addEventListener("change", function () {
      calculateWarrantyEndDate();
    });

  document
    .getElementById("warranty-start")
    .addEventListener("change", function () {
      calculateWarrantyEndDate();
    });
}

// Load assets for selector
async function loadAssets() {
  try {
    const response = await fetch(`${API_BASE}/assets`);
    const result = await response.json();

    if (result.success) {
      assetsData = result.data;
      populateAssetSelector();
      console.log(`📋 Loaded ${assetsData.length} assets`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading assets:", error);
    showError("Failed to load assets");
  }
}

// Populate asset selector
function populateAssetSelector() {
  const selector = document.getElementById("asset-selector");
  selector.innerHTML = '<option value="">Select an asset...</option>';

  assetsData.forEach((asset) => {
    const option = document.createElement("option");
    option.value = asset.asset_id;
    option.textContent = `${asset.asset_name} (${asset.hostname})`;
    selector.appendChild(option);
  });
}

// Load components for selected asset
async function loadComponents() {
  if (!currentAssetId) return;

  try {
    const response = await fetch(`${API_BASE}/assets/${currentAssetId}`);
    const result = await response.json();

    if (result.success) {
      componentsData = result.data.hardware_components || [];
      displayComponents();
      console.log(`🔧 Loaded ${componentsData.length} components`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading components:", error);
    showError("Failed to load components");
  }
}

// Populate form with existing hardware data from the selected asset
function populateFormWithHardwareData() {
  if (!currentAssetId) return;

  const selectedAsset = assetsData.find(
    (asset) => asset.asset_id === currentAssetId
  );
  if (!selectedAsset) return;

  const hardwareInfo = selectedAsset.hardware_info || {};

  // Auto-populate CPU component by default
  if (hardwareInfo.cpu_model) {
    selectComponentType("CPU");
  }

  console.log("✅ Form populated with hardware data");
}

// Select component type and populate form accordingly
function selectComponentType(componentType) {
  if (!currentAssetId) {
    showError("Please select an asset first");
    return;
  }

  const selectedAsset = assetsData.find(
    (asset) => asset.asset_id === currentAssetId
  );
  if (!selectedAsset) return;

  const hardwareInfo = selectedAsset.hardware_info || {};

  // Set component type
  document.getElementById("component-type").value = componentType;

  // Clear all fields first
  clearFormFields();

  // Populate based on component type
  switch (componentType) {
    case "CPU":
      if (hardwareInfo.cpu_model) {
        document.getElementById("component-name").value =
          hardwareInfo.cpu_model;
        document.getElementById("model").value = hardwareInfo.cpu_model;

        // Try to extract manufacturer from CPU model
        const cpuModel = hardwareInfo.cpu_model.toLowerCase();
        if (cpuModel.includes("intel")) {
          document.getElementById("manufacturer").value = "Intel";
        } else if (cpuModel.includes("amd")) {
          document.getElementById("manufacturer").value = "AMD";
        } else {
          document.getElementById("manufacturer").value = "Unknown";
        }
      }
      break;

    case "RAM":
      if (hardwareInfo.total_ram_gb) {
        document.getElementById(
          "component-name"
        ).value = `${hardwareInfo.total_ram_gb}GB RAM`;
        document.getElementById(
          "model"
        ).value = `${hardwareInfo.total_ram_gb}GB`;
        document.getElementById("manufacturer").value = "System RAM";
      }
      break;

    case "Storage":
      if (hardwareInfo.total_storage_gb) {
        document.getElementById(
          "component-name"
        ).value = `${hardwareInfo.total_storage_gb}GB Storage`;
        document.getElementById(
          "model"
        ).value = `${hardwareInfo.total_storage_gb}GB`;
        document.getElementById("manufacturer").value = "System Storage";
      }
      break;

    case "Other":
      // Leave fields empty for manual entry
      break;
  }

  // Set default values for manual entry fields
  document.getElementById("purchase-date").value = "";
  document.getElementById("warranty-start").value = "";
  document.getElementById("status").value = "Active";

  console.log(`✅ Form populated for ${componentType} component`);
}

// Clear form fields (but keep component type and name)
function clearFormFields() {
  // Don't clear component name - let user modify it
  // document.getElementById("component-name").value = "";
  document.getElementById("model").value = "";
  document.getElementById("serial-number").value = "";
  document.getElementById("manufacturer").value = "";
  document.getElementById("vendor").value = "";
  document.getElementById("purchase-date").value = "";
  document.getElementById("warranty-start").value = "";
  document.getElementById("warranty-end").value = "";
  document.getElementById("warranty-duration").value = "";
  document.getElementById("purchase-price").value = "";
  document.getElementById("status").value = "Active";
  document.getElementById("notes").value = "";
}

// Clear form fields
function clearForm() {
  document.getElementById("component-form").reset();
  clearFormFields();
  // Don't clear component name when clearing form
  document.getElementById("component-name").value = "";
}

// Load warranty alerts for selected asset
async function loadWarrantyAlerts() {
  if (!currentAssetId) return;

  try {
    const response = await fetch(
      `${API_BASE}/assets/${currentAssetId}/warranty-alerts`
    );
    const result = await response.json();

    if (result.success) {
      warrantyAlerts = result.data;
      updateWarrantySummary();
      console.log(`🚨 Loaded ${warrantyAlerts.length} warranty alerts`);
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error loading warranty alerts:", error);
    warrantyAlerts = [];
  }
}

// Display components
function displayComponents() {
  const container = document.getElementById("components-list");

  if (componentsData.length === 0) {
    container.innerHTML =
      '<p class="loading">No hardware components found for this asset.</p>';
    return;
  }

  container.innerHTML = componentsData
    .map(
      (component, index) => `
    <div class="component-card">
      <div class="component-header">
        <h3 class="component-title">${component.component_name}</h3>
        <span class="component-status status-${component.status.toLowerCase()}">${
        component.status
      }</span>
      </div>
      
      <div class="component-details">
        <div class="detail-item">
          <span class="detail-label">Type:</span> ${component.component_type}
        </div>
        ${
          component.model
            ? `<div class="detail-item">
          <span class="detail-label">Model:</span> ${component.model}
        </div>`
            : ""
        }
        ${
          component.manufacturer
            ? `<div class="detail-item">
          <span class="detail-label">Manufacturer:</span> ${component.manufacturer}
        </div>`
            : ""
        }
        ${
          component.serial_number
            ? `<div class="detail-item">
          <span class="detail-label">Serial:</span> ${component.serial_number}
        </div>`
            : ""
        }
        ${
          component.vendor
            ? `<div class="detail-item">
          <span class="detail-label">Vendor:</span> ${component.vendor}
        </div>`
            : ""
        }
        ${
          component.purchase_price
            ? `<div class="detail-item">
          <span class="detail-label">Price:</span> $${component.purchase_price}
        </div>`
            : ""
        }
      </div>

      ${
        component.purchase_date || component.warranty_end_date
          ? `
        <div class="warranty-info">
          ${
            component.purchase_date
              ? `<div class="detail-item">
            <span class="detail-label">Purchase Date:</span> ${formatDate(
              component.purchase_date
            )}
          </div>`
              : ""
          }
          ${
            component.warranty_end_date
              ? `<div class="detail-item">
            <span class="detail-label">Warranty End:</span> ${formatDate(
              component.warranty_end_date
            )}
          </div>`
              : ""
          }
          ${getWarrantyAlertForComponent(component)}
        </div>
      `
          : ""
      }

      ${
        component.notes
          ? `
        <div class="detail-item">
          <span class="detail-label">Notes:</span> ${component.notes}
        </div>
      `
          : ""
      }

      <div class="component-actions">
        <button class="btn-edit" onclick="editComponent(${index})">Edit</button>
        <button class="btn-delete" onclick="deleteComponent(${index})">Delete</button>
      </div>
    </div>
  `
    )
    .join("");
}

// Get warranty alert for a specific component
function getWarrantyAlertForComponent(component) {
  if (!component.warranty_end_date) return "";

  const alert = warrantyAlerts.find(
    (a) => a.component === component.component_name
  );
  if (!alert) return "";

  let alertClass = "warranty-alert";
  if (alert.severity === "Critical") alertClass += " warranty-critical";
  if (alert.severity === "Expired") alertClass += " warranty-expired";

  return `<div class="${alertClass}">⚠️ ${alert.message}</div>`;
}

// Update warranty summary
function updateWarrantySummary() {
  const summary = document.getElementById("warranty-summary");

  if (warrantyAlerts.length === 0) {
    summary.style.display = "none";
    return;
  }

  const expired = warrantyAlerts.filter((a) => a.severity === "Expired").length;
  const critical = warrantyAlerts.filter(
    (a) => a.severity === "Critical"
  ).length;
  const warning = warrantyAlerts.filter((a) => a.severity === "Warning").length;
  const good = componentsData.length - (expired + critical + warning);

  document.getElementById("expired-count").textContent = expired;
  document.getElementById("critical-count").textContent = critical;
  document.getElementById("warning-count").textContent = warning;
  document.getElementById("good-count").textContent = good;

  summary.style.display = "block";
}

// Hide components when no asset selected
function hideComponents() {
  document.getElementById("components-list").innerHTML =
    '<p class="loading">Select an asset to view components...</p>';
  document.getElementById("warranty-summary").style.display = "none";
}

// Add new component
async function addComponent() {
  if (!currentAssetId) {
    showError("Please select an asset first");
    return;
  }

  const formData = {
    component_type: document.getElementById("component-type").value,
    component_name: document.getElementById("component-name").value,
    model: document.getElementById("model").value,
    serial_number: document.getElementById("serial-number").value,
    manufacturer: document.getElementById("manufacturer").value,
    vendor: document.getElementById("vendor").value,
    purchase_date: document.getElementById("purchase-date").value,
    warranty_start_date: document.getElementById("warranty-start").value,
    warranty_end_date: document.getElementById("warranty-end").value,
    warranty_duration_months:
      parseInt(document.getElementById("warranty-duration").value) || null,
    purchase_price:
      parseFloat(document.getElementById("purchase-price").value) || null,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value,
  };

  try {
    const response = await fetch(
      `${API_BASE}/assets/${currentAssetId}/components`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log("✅ Component added successfully");
      document.getElementById("component-form").reset();
      loadComponents();
      loadWarrantyAlerts();
      showSuccess("Component added successfully");
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error adding component:", error);
    showError("Failed to add component");
  }
}

// Edit component
function editComponent(index) {
  const component = componentsData[index];

  // Populate form with component data
  document.getElementById("component-type").value = component.component_type;
  document.getElementById("component-name").value = component.component_name;
  document.getElementById("model").value = component.model || "";
  document.getElementById("serial-number").value =
    component.serial_number || "";
  document.getElementById("manufacturer").value = component.manufacturer || "";
  document.getElementById("vendor").value = component.vendor || "";
  document.getElementById("purchase-date").value = component.purchase_date
    ? formatDateForInput(component.purchase_date)
    : "";
  document.getElementById("warranty-start").value =
    component.warranty_start_date
      ? formatDateForInput(component.warranty_start_date)
      : "";
  document.getElementById("warranty-end").value = component.warranty_end_date
    ? formatDateForInput(component.warranty_end_date)
    : "";
  document.getElementById("warranty-duration").value =
    component.warranty_duration_months || "";
  document.getElementById("purchase-price").value =
    component.purchase_price || "";
  document.getElementById("status").value = component.status;
  document.getElementById("notes").value = component.notes || "";

  // Change form button to update
  const submitBtn = document.querySelector(
    "#component-form button[type='submit']"
  );
  submitBtn.textContent = "Update Component";
  submitBtn.onclick = (e) => {
    e.preventDefault();
    updateComponent(index);
  };

  // Scroll to form
  document
    .querySelector(".component-form")
    .scrollIntoView({ behavior: "smooth" });
}

// Update component
async function updateComponent(index) {
  const formData = {
    component_type: document.getElementById("component-type").value,
    component_name: document.getElementById("component-name").value,
    model: document.getElementById("model").value,
    serial_number: document.getElementById("serial-number").value,
    manufacturer: document.getElementById("manufacturer").value,
    vendor: document.getElementById("vendor").value,
    purchase_date: document.getElementById("purchase-date").value,
    warranty_start_date: document.getElementById("warranty-start").value,
    warranty_end_date: document.getElementById("warranty-end").value,
    warranty_duration_months:
      parseInt(document.getElementById("warranty-duration").value) || null,
    purchase_price:
      parseFloat(document.getElementById("purchase-price").value) || null,
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value,
  };

  try {
    const response = await fetch(
      `${API_BASE}/assets/${currentAssetId}/components/${index}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log("✅ Component updated successfully");
      document.getElementById("component-form").reset();

      // Reset form button
      const submitBtn = document.querySelector(
        "#component-form button[type='submit']"
      );
      submitBtn.textContent = "Add Component";
      submitBtn.onclick = null;

      loadComponents();
      loadWarrantyAlerts();
      showSuccess("Component updated successfully");
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error updating component:", error);
    showError("Failed to update component");
  }
}

// Delete component
async function deleteComponent(index) {
  if (!confirm("Are you sure you want to delete this component?")) {
    return;
  }

  try {
    const response = await fetch(
      `${API_BASE}/assets/${currentAssetId}/components/${index}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (result.success) {
      console.log("✅ Component deleted successfully");
      loadComponents();
      loadWarrantyAlerts();
      showSuccess("Component deleted successfully");
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error("Error deleting component:", error);
    showError("Failed to delete component");
  }
}

// Calculate warranty end date based on start date and duration
function calculateWarrantyEndDate() {
  const startDate = document.getElementById("warranty-start").value;
  const duration = parseInt(document.getElementById("warranty-duration").value);

  if (startDate && duration) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + duration);

    document.getElementById("warranty-end").value = formatDateForInput(end);
  }
}

// Helper functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatDateForInput(date) {
  const dateObj = new Date(date);
  return dateObj.toISOString().split("T")[0];
}

function showSuccess(message) {
  // Simple success message - could be enhanced with a proper notification system
  alert(`Success: ${message}`);
}

function showError(message) {
  console.error("Error:", message);
  alert(`Error: ${message}`);
}

// Update last updated timestamp
function updateLastUpdated() {
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();
}

// Auto-refresh every 30 seconds
setInterval(() => {
  if (currentAssetId) {
    loadComponents();
    loadWarrantyAlerts();
  }
  updateLastUpdated();
}, 30000);
