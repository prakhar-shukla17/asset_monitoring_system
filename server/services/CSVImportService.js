const csv = require("csv-parser");
const fs = require("fs");
const Asset = require("../models/Asset");
const mongoose = require("mongoose");

class CSVImportService {
  constructor() {
    this.importStats = {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      errors_list: [],
    };
  }

  /**
   * Import CSV file into database
   * @param {string} filePath - Path to CSV file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import statistics
   */
  async importCSV(filePath, options = {}) {
    const {
      updateExisting = false,
      skipDuplicates = true,
      dryRun = false,
    } = options;

    this.importStats = {
      total: 0,
      imported: 0,
      skipped: 0,
      errors: 0,
      errors_list: [],
    };

    return new Promise((resolve, reject) => {
      const results = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          results.push(data);
        })
        .on("end", async () => {
          try {
            await this.processCSVData(results, options);
            resolve(this.importStats);
          } catch (error) {
            reject(error);
          }
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process CSV data and import into database
   * @param {Array} data - CSV data array
   * @param {Object} options - Import options
   */
  async processCSVData(data, options) {
    const {
      updateExisting = false,
      skipDuplicates = true,
      dryRun = false,
    } = options;

    // Filter out empty rows and rows without essential data
    const validData = data.filter((row) => {
      return (
        row["Asset ID"] &&
        row["Asset Name"] &&
        row["Branch"] &&
        row["Asset ID"].trim() !== "" &&
        row["Asset Name"].trim() !== "" &&
        row["Branch"].trim() !== ""
      );
    });

    this.importStats.total = validData.length;

    for (let i = 0; i < validData.length; i++) {
      const row = validData[i];

      try {
        // Transform CSV row to asset object
        const assetData = this.transformCSVRow(row);

        if (dryRun) {
          console.log(`[DRY RUN] Would import: ${assetData.asset_id}`);
          this.importStats.imported++;
          continue;
        }

        // Check if asset already exists
        const existingAsset = await Asset.findOne({
          asset_id: assetData.asset_id,
        });

        if (existingAsset) {
          if (skipDuplicates) {
            this.importStats.skipped++;
            continue;
          } else if (updateExisting) {
            // Update existing asset
            await Asset.findByIdAndUpdate(existingAsset._id, assetData, {
              new: true,
            });
            this.importStats.imported++;
          }
        } else {
          // Create new asset
          const newAsset = new Asset(assetData);
          await newAsset.save();
          this.importStats.imported++;
        }
      } catch (error) {
        this.importStats.errors++;
        this.importStats.errors_list.push({
          row: i + 1,
          asset_id: row["Asset ID"] || "Unknown",
          error: error.message,
        });
        console.error(`Error processing row ${i + 1}:`, error.message);
      }
    }
  }

  /**
   * Transform CSV row to asset object
   * @param {Object} row - CSV row data
   * @returns {Object} Asset object
   */
  transformCSVRow(row) {
    // Clean and validate data
    const cleanString = (str) => (str ? str.trim() : "");
    const cleanNumber = (num) => {
      const cleaned = cleanString(num);
      return cleaned ? parseFloat(cleaned) : null;
    };

    // Parse dates
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Map criticality levels
    const mapCriticality = (criticality) => {
      const mapping = {
        Critical: "Critical",
        High: "High",
        Medium: "Medium",
        Low: "Low",
      };
      return mapping[criticality] || "Medium";
    };

    // Map sensitivity levels
    const mapSensitivity = (sensitivity) => {
      const mapping = {
        Sensitive: "Sensitive",
        Private: "Private",
        Public: "Public",
      };
      return mapping[sensitivity] || "Private";
    };

    // Generate unique asset ID if not present
    let assetId = cleanString(row["Asset ID"]);
    if (!assetId) {
      const branch = cleanString(row["Branch"]);
      const assetName = cleanString(row["Asset Name"]);
      const srNo = cleanNumber(row["Sr. No."]);
      assetId = `${branch}/${assetName}/${
        srNo?.toString().padStart(2, "0") || "01"
      }`;
    }

    return {
      sr_no: cleanNumber(row["Sr. No."]),
      asset_id: assetId,
      asset_name: cleanString(row["Asset Name"]),
      hostname: cleanString(row["Asset Name"]) || cleanString(row["Asset ID"]),
      branch: cleanString(row["Branch"]),
      asset_category:
        cleanString(row["Asset Category"]) ||
        cleanString(row["Asset Name"]) ||
        "Other",
      make: cleanString(row["Make"]),
      model: cleanString(row["Model"]),
      ip_address: cleanString(row["IP"]),
      serial_number: cleanString(row["Serial Number"]),
      criticality: mapCriticality(cleanString(row["Criticality of Asset"])),
      sensitivity: mapSensitivity(cleanString(row["Sensitivity"])),
      software_services: cleanString(row["Software/Services Installed"]),
      vendor: cleanString(row["Vendor"]),
      allocation_date: parseDate(row["Allocation Date"]),
      warranty_expiry: parseDate(row["Warranty Expiry"]),
      purchase_value: cleanNumber(row["Purchase Value"]),
      status: cleanString(row["Status"]) === "Inactive" ? "Inactive" : "Active",
      handled_by: cleanString(row["Handled by/Key Personnel"]),
      approved_by: cleanString(row["Approved By"]),
      notes: cleanString(row["Color Definition"]),
      color_definition: cleanString(row["Color Definition"]),

      // Set default values for required fields
      last_seen: new Date(),
      agent_installed: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  /**
   * Get import statistics
   * @returns {Object} Import statistics
   */
  getImportStats() {
    return this.importStats;
  }

  /**
   * Validate CSV file structure
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} Validation result
   */
  async validateCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const requiredColumns = ["Asset ID", "Asset Name", "Branch"];
      const foundColumns = new Set();
      let headerRow = null;

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data) => {
          results.push(data);
          // Find the first non-empty row with actual data
          if (
            !headerRow &&
            Object.keys(data).some(
              (key) => data[key] && data[key].trim() !== ""
            )
          ) {
            headerRow = data;
            Object.keys(data).forEach((col) => foundColumns.add(col));
          }
        })
        .on("end", () => {
          const missingColumns = requiredColumns.filter(
            (col) => !foundColumns.has(col)
          );

          const validation = {
            isValid: missingColumns.length === 0,
            totalRows: results.length,
            foundColumns: Array.from(foundColumns),
            missingColumns: missingColumns,
            sampleData: results.slice(0, 5), // First 5 rows as sample
            headerRow: headerRow,
          };

          resolve(validation);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  /**
   * Export assets to CSV format
   * @param {Array} assets - Array of asset objects
   * @returns {string} CSV string
   */
  exportToCSV(assets) {
    const headers = [
      "Sr. No.",
      "Branch",
      "Asset ID",
      "Asset Name",
      "Asset Category",
      "Make",
      "Model",
      "IP",
      "Serial Number",
      "Criticality of Asset",
      "Sensitivity",
      "Software/Services Installed",
      "Vendor",
      "Allocation Date",
      "Warranty Expiry",
      "Purchase Value",
      "Status",
      "Handled by/Key Personnel",
      "Approved By",
      "Notes",
    ];

    const csvRows = [headers.join(",")];

    assets.forEach((asset, index) => {
      const row = [
        asset.sr_no || index + 1,
        asset.branch || "",
        asset.asset_id || "",
        asset.asset_name || "",
        asset.asset_category || "",
        asset.make || "",
        asset.model || "",
        asset.ip_address || "",
        asset.serial_number || "",
        asset.criticality || "",
        asset.sensitivity || "",
        asset.software_services || "",
        asset.vendor || "",
        asset.allocation_date
          ? asset.allocation_date.toISOString().split("T")[0]
          : "",
        asset.warranty_expiry
          ? asset.warranty_expiry.toISOString().split("T")[0]
          : "",
        asset.purchase_value || "",
        asset.status || "",
        asset.handled_by || "",
        asset.approved_by || "",
        asset.notes || "",
      ];

      csvRows.push(row.map((field) => `"${field}"`).join(","));
    });

    return csvRows.join("\n");
  }
}

module.exports = CSVImportService;
