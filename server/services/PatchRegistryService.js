const axios = require("axios");
const cheerio = require("cheerio");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Asset = require("../models/Asset");
const PatchAlert = require("../models/PatchAlert");

class PatchRegistryService {
  constructor() {
    // Initialize Gemini AI
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.gemini.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      console.log(
        "✅ Gemini AI initialized successfully with model: gemini-2.0-flash"
      );
    } catch (error) {
      console.error("❌ Failed to initialize Gemini AI:", error.message);
      console.error("Please check your GEMINI_API_KEY in the .env file");
      this.model = null;
    }

    // Cache for vendor info to reduce API calls
    this.vendorCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    // Enhanced predefined vendor database for common software
    this.vendorDatabase = {
      // Web Browsers
      "Google Chrome": {
        vendor_name: "Google",
        vendor_website: "https://www.google.com/chrome/",
        version_check_url: "https://omahaproxy.appspot.com/all.json",
        version_selector: "version",
        notes: "Chrome version from Omaha proxy",
      },
      "Mozilla Firefox": {
        vendor_name: "Mozilla",
        vendor_website: "https://www.mozilla.org/firefox/",
        version_check_url:
          "https://product-details.mozilla.org/1.0/firefox_versions.json",
        version_selector: "LATEST_FIREFOX_VERSION",
        notes: "Firefox version from Mozilla API",
      },
      "Microsoft Edge": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/edge",
        version_check_url:
          "https://edgeupdates.microsoft.com/api/products?view=enterprise",
        version_selector: "releases",
        notes: "Edge version from Microsoft API",
      },
      Opera: {
        vendor_name: "Opera Software",
        vendor_website: "https://www.opera.com/",
        version_check_url:
          "https://www.opera.com/computer/thanks?ni=stable&os=windows",
        version_selector: "version",
        notes: "Opera browser updates",
      },

      // Development Tools
      "Visual Studio Code": {
        vendor_name: "Microsoft",
        vendor_website: "https://code.visualstudio.com/",
        version_check_url:
          "https://code.visualstudio.com/sha/download?build=stable&os=win32-x64-user",
        version_selector: "version",
        notes: "VS Code version from download page",
      },
      "Visual Studio": {
        vendor_name: "Microsoft",
        vendor_website: "https://visualstudio.microsoft.com/",
        version_check_url: "https://visualstudio.microsoft.com/downloads/",
        version_selector: "version",
        notes: "Visual Studio updates",
      },
      "Node.js": {
        vendor_name: "Node.js Foundation",
        vendor_website: "https://nodejs.org/",
        version_check_url: "https://nodejs.org/dist/index.json",
        version_selector: "version",
        notes: "Node.js version from official API",
      },
      Python: {
        vendor_name: "Python Software Foundation",
        vendor_website: "https://www.python.org/",
        version_check_url: "https://www.python.org/downloads/",
        version_selector: "version",
        notes: "Python interpreter updates",
      },
      Git: {
        vendor_name: "Git",
        vendor_website: "https://git-scm.com/",
        version_check_url: "https://git-scm.com/download/win",
        version_selector: "version",
        notes: "Git for Windows updates",
      },
      "Docker Desktop": {
        vendor_name: "Docker",
        vendor_website: "https://www.docker.com/products/docker-desktop",
        version_check_url:
          "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe",
        version_selector: "version",
        notes: "Docker Desktop for Windows",
      },

      // Antivirus & Security
      "Windows Defender": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/security",
        version_check_url: "https://www.microsoft.com/security/updates",
        version_selector: "version",
        notes: "Windows Defender updates",
      },
      McAfee: {
        vendor_name: "McAfee",
        vendor_website: "https://www.mcafee.com/",
        version_check_url:
          "https://www.mcafee.com/enterprise/en-us/downloads.html",
        version_selector: "version",
        notes: "McAfee antivirus updates",
      },
      Norton: {
        vendor_name: "Norton",
        vendor_website: "https://us.norton.com/",
        version_check_url: "https://us.norton.com/downloads",
        version_selector: "version",
        notes: "Norton antivirus updates",
      },
      Avast: {
        vendor_name: "Avast",
        vendor_website: "https://www.avast.com/",
        version_check_url:
          "https://www.avast.com/download-thank-you.php?product=FAV-FREE",
        version_selector: "version",
        notes: "Avast antivirus updates",
      },
      AVG: {
        vendor_name: "AVG",
        vendor_website: "https://www.avg.com/",
        version_check_url:
          "https://www.avg.com/en-us/download-thank-you?product=FAV-FREE",
        version_selector: "version",
        notes: "AVG antivirus updates",
      },
      Malwarebytes: {
        vendor_name: "Malwarebytes",
        vendor_website: "https://www.malwarebytes.com/",
        version_check_url: "https://www.malwarebytes.com/mwb-download/thankyou",
        version_selector: "version",
        notes: "Malwarebytes antimalware updates",
      },
      Bitdefender: {
        vendor_name: "Bitdefender",
        vendor_website: "https://www.bitdefender.com/",
        version_check_url: "https://www.bitdefender.com/solutions/free.html",
        version_selector: "version",
        notes: "Bitdefender antivirus updates",
      },

      // Microsoft Office & Productivity
      "Microsoft Office": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/microsoft-365",
        version_check_url: "https://www.microsoft.com/microsoft-365/updates",
        version_selector: "version",
        notes: "Microsoft Office updates",
      },
      "Microsoft Word": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/microsoft-365/word",
        version_check_url: "https://www.microsoft.com/microsoft-365/updates",
        version_selector: "version",
        notes: "Microsoft Word updates",
      },
      "Microsoft Excel": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/microsoft-365/excel",
        version_check_url: "https://www.microsoft.com/microsoft-365/updates",
        version_selector: "version",
        notes: "Microsoft Excel updates",
      },
      "Microsoft PowerPoint": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/microsoft-365/powerpoint",
        version_check_url: "https://www.microsoft.com/microsoft-365/updates",
        version_selector: "version",
        notes: "Microsoft PowerPoint updates",
      },
      "Microsoft Teams": {
        vendor_name: "Microsoft",
        vendor_website: "https://www.microsoft.com/microsoft-teams",
        version_check_url:
          "https://www.microsoft.com/microsoft-teams/download-app",
        version_selector: "version",
        notes: "Microsoft Teams updates",
      },

      // Adobe Products
      "Adobe Reader": {
        vendor_name: "Adobe",
        vendor_website: "https://get.adobe.com/reader/",
        version_check_url: "https://get.adobe.com/reader/",
        version_selector: "version",
        notes: "Adobe Reader updates",
      },
      "Adobe Acrobat": {
        vendor_name: "Adobe",
        vendor_website: "https://www.adobe.com/acrobat/acrobat-pro.html",
        version_check_url: "https://www.adobe.com/acrobat/acrobat-pro.html",
        version_selector: "version",
        notes: "Adobe Acrobat updates",
      },
      "Adobe Photoshop": {
        vendor_name: "Adobe",
        vendor_website: "https://www.adobe.com/products/photoshop.html",
        version_check_url: "https://www.adobe.com/products/photoshop.html",
        version_selector: "version",
        notes: "Adobe Photoshop updates",
      },

      // Media Players
      "VLC Media Player": {
        vendor_name: "VideoLAN",
        vendor_website: "https://www.videolan.org/vlc/",
        version_check_url: "https://www.videolan.org/vlc/download-windows.html",
        version_selector: "version",
        notes: "VLC Media Player updates",
      },
      "Windows Media Player": {
        vendor_name: "Microsoft",
        vendor_website:
          "https://www.microsoft.com/windows/windows-media-player",
        version_check_url:
          "https://www.microsoft.com/windows/windows-media-player",
        version_selector: "version",
        notes: "Windows Media Player updates",
      },

      // Compression Tools
      "7-Zip": {
        vendor_name: "7-Zip",
        vendor_website: "https://www.7-zip.org/",
        version_check_url: "https://www.7-zip.org/download.html",
        version_selector: "version",
        notes: "7-Zip compression tool updates",
      },
      WinRAR: {
        vendor_name: "RARLAB",
        vendor_website: "https://www.win-rar.com/",
        version_check_url: "https://www.win-rar.com/download.html",
        version_selector: "version",
        notes: "WinRAR compression tool updates",
      },

      // System Utilities
      CCleaner: {
        vendor_name: "Piriform",
        vendor_website: "https://www.ccleaner.com/",
        version_check_url: "https://www.ccleaner.com/ccleaner/download",
        version_selector: "version",
        notes: "CCleaner system utility updates",
      },
      "Advanced SystemCare": {
        vendor_name: "IObit",
        vendor_website: "https://www.iobit.com/en/advancedsystemcarefree.php",
        version_check_url:
          "https://www.iobit.com/en/advancedsystemcarefree.php",
        version_selector: "version",
        notes: "Advanced SystemCare updates",
      },

      // Communication Tools
      Discord: {
        vendor_name: "Discord",
        vendor_website: "https://discord.com/",
        version_check_url:
          "https://discord.com/api/downloads/distro/app/win32/x86/stable/latest",
        version_selector: "version",
        notes: "Discord chat application updates",
      },
      Slack: {
        vendor_name: "Slack",
        vendor_website: "https://slack.com/",
        version_check_url: "https://slack.com/downloads/windows",
        version_selector: "version",
        notes: "Slack communication platform updates",
      },
      Zoom: {
        vendor_name: "Zoom",
        vendor_website: "https://zoom.us/",
        version_check_url: "https://zoom.us/download",
        version_selector: "version",
        notes: "Zoom video conferencing updates",
      },

      // Gaming Platforms
      Steam: {
        vendor_name: "Valve",
        vendor_website: "https://store.steampowered.com/",
        version_check_url: "https://store.steampowered.com/about/",
        version_selector: "version",
        notes: "Steam gaming platform updates",
      },
      "Epic Games Launcher": {
        vendor_name: "Epic Games",
        vendor_website: "https://www.epicgames.com/store/",
        version_check_url: "https://www.epicgames.com/store/",
        version_selector: "version",
        notes: "Epic Games Launcher updates",
      },

      // Database Tools
      MySQL: {
        vendor_name: "Oracle",
        vendor_website: "https://www.mysql.com/",
        version_check_url: "https://dev.mysql.com/downloads/mysql/",
        version_selector: "version",
        notes: "MySQL database updates",
      },
      PostgreSQL: {
        vendor_name: "PostgreSQL",
        vendor_website: "https://www.postgresql.org/",
        version_check_url: "https://www.postgresql.org/download/windows/",
        version_selector: "version",
        notes: "PostgreSQL database updates",
      },

      // Cloud Storage
      Dropbox: {
        vendor_name: "Dropbox",
        vendor_website: "https://www.dropbox.com/",
        version_check_url: "https://www.dropbox.com/downloading",
        version_selector: "version",
        notes: "Dropbox cloud storage updates",
      },
      "Google Drive": {
        vendor_name: "Google",
        vendor_website: "https://drive.google.com/",
        version_check_url: "https://www.google.com/drive/download/",
        version_selector: "version",
        notes: "Google Drive desktop app updates",
      },
      OneDrive: {
        vendor_name: "Microsoft",
        vendor_website: "https://onedrive.live.com/",
        version_check_url: "https://onedrive.live.com/about/en-us/download/",
        version_selector: "version",
        notes: "Microsoft OneDrive updates",
      },
    };
  }

  async getInstalledSoftware() {
    try {
      const assets = await Asset.find({});
      const softwareList = [];

      assets.forEach((asset) => {
        if (asset.software_info && asset.software_info.software_list) {
          asset.software_info.software_list.forEach((software) => {
            softwareList.push({
              asset_id: asset.asset_id,
              asset_name: asset.asset_name,
              hostname: asset.hostname,
              software_name: software.name,
              current_version: software.version,
              vendor: software.vendor || "Unknown",
              install_date: software.install_date,
            });
          });
        }
      });

      return softwareList;
    } catch (error) {
      console.error("Error getting installed software:", error);
      return [];
    }
  }

  async getVendorInfo(softwareName) {
    try {
      // Check cache first
      const cacheKey = softwareName.toLowerCase().trim();
      const cached = this.vendorCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`✅ Using cached vendor info for "${softwareName}"`);
        return cached.data;
      }

      // Check predefined database first
      if (this.vendorDatabase[softwareName]) {
        console.log(`✅ Found vendor info for "${softwareName}" in database`);
        return this.vendorDatabase[softwareName];
      }

      // Try partial matching in database
      const normalizedName = softwareName.toLowerCase().trim();
      for (const [key, value] of Object.entries(this.vendorDatabase)) {
        const normalizedKey = key.toLowerCase();
        if (
          normalizedName.includes(normalizedKey) ||
          normalizedKey.includes(normalizedName)
        ) {
          console.log(
            `✅ Found vendor info for "${softwareName}" using match: "${key}"`
          );
          return value;
        }
      }

      // Use Gemini AI to find vendor info
      console.log(
        `🤖 Using Gemini AI to find vendor info for "${softwareName}"`
      );
      const vendorInfo = await this.getVendorInfoFromGemini(softwareName);

      if (vendorInfo) {
        // Cache the result
        this.vendorCache.set(cacheKey, {
          data: vendorInfo,
          timestamp: Date.now(),
        });
        return vendorInfo;
      }

      return null;
    } catch (error) {
      console.error(
        `Error getting vendor info for ${softwareName}:`,
        error.message
      );
      return null;
    }
  }

  async getVendorInfoFromGemini(softwareName) {
    try {
      // Check if Gemini model is available
      if (!this.model) {
        console.log(
          `⚠️ Gemini AI not available, skipping vendor discovery for "${softwareName}"`
        );
        return null;
      }

      const prompt = `
      For the software "${softwareName}", provide the following information in JSON format:
      {
        "vendor_name": "Official vendor/company name",
        "vendor_website": "Official download/update page URL",
        "version_check_url": "URL where latest version is displayed",
        "version_selector": "CSS selector or pattern to find version on page",
        "notes": "Any special instructions for version checking"
      }
      
      IMPORTANT: Focus on finding official vendor websites and reliable sources.
      Do NOT provide version numbers - only website URLs and API endpoints.
      This is for finding vendor websites only, not current versions.
      
      If you don't know the exact URL, provide the main vendor website.
      Return only valid JSON, no additional text.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const vendorInfo = JSON.parse(jsonMatch[0]);
        console.log(
          `✅ Gemini found vendor info for "${softwareName}": ${vendorInfo.vendor_name}`
        );
        return vendorInfo;
      }

      return null;
    } catch (error) {
      console.error(`Gemini error for ${softwareName}:`, error.message);
      return null;
    }
  }

  async getLatestVersion(vendorInfo) {
    if (!vendorInfo || !vendorInfo.version_check_url) {
      return null;
    }

    try {
      const response = await axios.get(vendorInfo.version_check_url, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      // Handle different response types
      if (response.headers["content-type"]?.includes("application/json")) {
        return this.extractVersionFromJSON(response.data, vendorInfo);
      } else {
        const $ = cheerio.load(response.data);
        return this.extractVersionFromHTML($, vendorInfo);
      }
    } catch (error) {
      console.error(
        `Version check failed for ${vendorInfo.vendor_name}:`,
        error.message
      );

      // Try using Gemini to extract version from the page
      try {
        const response = await axios.get(vendorInfo.vendor_website, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        return await this.extractVersionWithGemini(response.data, vendorInfo);
      } catch (geminiError) {
        console.error(`Gemini version extraction failed:`, geminiError.message);
        return null;
      }
    }
  }

  async extractVersionWithGemini(htmlContent, vendorInfo) {
    try {
      // Check if Gemini model is available
      if (!this.model) {
        console.log(
          `⚠️ Gemini AI not available, skipping version extraction for "${vendorInfo.vendor_name}"`
        );
        return null;
      }

      const prompt = `
      From this webpage content, extract the latest version number for ${
        vendorInfo.vendor_name
      }.
      
      Look for version patterns like:
      - X.Y.Z (e.g., 1.2.3)
      - X.Y (e.g., 2.1)
      - v1.2.3
      - Version 2023.1
      - Any other common version formats
      
      IMPORTANT: This is real-time web scraping data, so extract the CURRENT version from the page.
      Return only the version number, nothing else.
      If no version is found, return "null".
      
      Webpage content:
      ${htmlContent.substring(0, 5000)} // Limit content length
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const version = response.text().trim();

      if (version && version !== "null" && version !== "None") {
        console.log(`✅ Gemini extracted version: ${version}`);
        return version;
      }

      return null;
    } catch (error) {
      console.error(`Gemini version extraction error:`, error.message);
      return null;
    }
  }

  extractVersionFromJSON(data, vendorInfo) {
    try {
      // Handle different JSON structures
      if (vendorInfo.version_selector === "version") {
        if (data.version) return data.version;
        if (data.current_version) return data.current_version;
        if (data.latest_version) return data.latest_version;

        if (Array.isArray(data) && data.length > 0) {
          const firstItem = data[0];
          if (firstItem.version) return firstItem.version;
          if (firstItem.current_version) return firstItem.current_version;
        }
      } else if (vendorInfo.version_selector === "LATEST_FIREFOX_VERSION") {
        return data.LATEST_FIREFOX_VERSION;
      } else if (vendorInfo.version_selector === "releases") {
        if (data && data.length > 0) {
          const latestRelease = data[0].releases?.find(
            (r) => r.product === "Stable"
          );
          return latestRelease?.version;
        }
      }

      // Fallback: search for version patterns in JSON
      const jsonString = JSON.stringify(data);
      const versionPatterns = [
        /\b(\d+\.\d+\.\d+)\b/g,
        /\b(\d+\.\d+)\b/g,
        /\b(\d+\.\d+\.\d+\.\d+)\b/g,
      ];

      for (const pattern of versionPatterns) {
        const matches = jsonString.match(pattern);
        if (matches && matches.length > 0) {
          return matches[matches.length - 1];
        }
      }

      return null;
    } catch (error) {
      console.error(
        `JSON parsing failed for ${vendorInfo.vendor_name}:`,
        error.message
      );
      return null;
    }
  }

  extractVersionFromHTML($, vendorInfo) {
    try {
      // Try CSS selector first
      if (
        vendorInfo.version_selector &&
        vendorInfo.version_selector !== "body"
      ) {
        const element = $(vendorInfo.version_selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const version = this.extractVersionFromText(text);
          if (version) return version;
        }
      }

      // Fallback: search entire page
      const pageText = $.text();
      return this.extractVersionFromText(pageText);
    } catch (error) {
      console.error(
        `HTML parsing failed for ${vendorInfo.vendor_name}:`,
        error.message
      );
      return null;
    }
  }

  extractVersionFromText(text) {
    const patterns = [
      /\b(\d+\.\d+\.\d+)\b/g,
      /\b(\d+\.\d+)\b/g,
      /\b(\d+\.\d+\.\d+\.\d+)\b/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[matches.length - 1];
      }
    }

    return null;
  }

  async getPatchNotes(vendorInfo, version) {
    if (!vendorInfo || !vendorInfo.vendor_website) {
      return "Patch notes not available";
    }

    try {
      // Try to find release notes or changelog
      const releaseNotesUrl = vendorInfo.vendor_website.replace(
        "/download",
        "/release-notes"
      );
      const response = await axios.get(releaseNotesUrl, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const $ = cheerio.load(response.data);
      return this.extractPatchNotes($, version);
    } catch (error) {
      return "Patch notes not available";
    }
  }

  extractPatchNotes($, version) {
    const notes = [];
    $("p, div, li").each((i, elem) => {
      const text = $(elem).text();
      if (
        text.includes(version) ||
        text.includes("security") ||
        text.includes("fix") ||
        text.includes("update")
      ) {
        notes.push(text.trim());
      }
    });

    return notes.slice(0, 5).join("\n");
  }

  needsUpdate(currentVersion, latestVersion) {
    if (!currentVersion || !latestVersion) return false;
    return this.compareVersions(currentVersion, latestVersion) < 0;
  }

  compareVersions(version1, version2) {
    try {
      const v1Parts = version1.split(".").map((part) => {
        const num = parseInt(part);
        return isNaN(num) ? 0 : num;
      });

      const v2Parts = version2.split(".").map((part) => {
        const num = parseInt(part);
        return isNaN(num) ? 0 : num;
      });

      const maxLength = Math.max(v1Parts.length, v2Parts.length);
      while (v1Parts.length < maxLength) v1Parts.push(0);
      while (v2Parts.length < maxLength) v2Parts.push(0);

      for (let i = 0; i < maxLength; i++) {
        if (v1Parts[i] < v2Parts[i]) return -1;
        if (v1Parts[i] > v2Parts[i]) return 1;
      }

      return 0;
    } catch (error) {
      console.error(
        `Error comparing versions ${version1} and ${version2}:`,
        error.message
      );
      return 0;
    }
  }

  calculatePriority(currentVersion, latestVersion) {
    if (!currentVersion || !latestVersion) return "Low";

    try {
      const current = currentVersion.split(".").map((part) => {
        const num = parseInt(part);
        return isNaN(num) ? 0 : num;
      });

      const latest = latestVersion.split(".").map((part) => {
        const num = parseInt(part);
        return isNaN(num) ? 0 : num;
      });

      const maxLength = Math.max(current.length, latest.length);
      while (current.length < maxLength) current.push(0);
      while (latest.length < maxLength) latest.push(0);

      if (latest[0] > current[0]) return "Critical";
      if (latest[1] > current[1]) return "High";
      if (latest[2] > current[2]) return "Medium";
      if (latest[3] > current[3]) return "Low";

      return "Low";
    } catch (error) {
      console.error(
        `Error calculating priority for ${currentVersion} vs ${latestVersion}:`,
        error.message
      );
      return "Medium";
    }
  }

  async checkForUpdates() {
    console.log("🔍 Starting Hybrid Patch Registry Update Check...");
    console.log(
      "📋 Strategy: AI for vendor discovery + Real-time web scraping for versions"
    );

    try {
      const installedSoftware = await this.getInstalledSoftware();
      console.log(
        `Found ${installedSoftware.length} software entries to check`
      );

      const updateResults = [];
      let processedCount = 0;

      for (const software of installedSoftware) {
        try {
          processedCount++;
          console.log(
            `Processing ${processedCount}/${installedSoftware.length}: ${software.software_name}`
          );

          const vendorInfo = await this.getVendorInfo(software.software_name);

          if (!vendorInfo) {
            console.log(
              `⚠️ No vendor info for ${software.software_name}, creating manual review entry`
            );
            updateResults.push({
              asset_id: software.asset_id,
              asset_name: software.asset_name,
              hostname: software.hostname,
              software_name: software.software_name,
              current_version: software.current_version,
              latest_version: "Unknown",
              vendor: "Manual Review Required",
              vendor_website: "",
              patch_notes: "Please manually check for updates",
              priority: "Medium",
              check_date: new Date(),
              status: "Manual Review",
            });
            continue;
          }

          if (vendorInfo && vendorInfo.version_check_url) {
            const latestVersion = await this.getLatestVersion(vendorInfo);

            if (latestVersion) {
              const needsUpdate = this.needsUpdate(
                software.current_version,
                latestVersion
              );
              const comparison = this.compareVersions(
                software.current_version,
                latestVersion
              );

              console.log(
                `📊 Version comparison for ${software.software_name}:`
              );
              console.log(`   Current: ${software.current_version}`);
              console.log(`   Latest:  ${latestVersion}`);
              console.log(
                `   Result:  ${
                  comparison < 0
                    ? "UPDATE NEEDED"
                    : comparison > 0
                    ? "CURRENT IS NEWER"
                    : "VERSIONS EQUAL"
                }`
              );

              if (needsUpdate) {
                const patchNotes = await this.getPatchNotes(
                  vendorInfo,
                  latestVersion
                );

                updateResults.push({
                  asset_id: software.asset_id,
                  asset_name: software.asset_name,
                  hostname: software.hostname,
                  software_name: software.software_name,
                  current_version: software.current_version,
                  latest_version: latestVersion,
                  vendor: vendorInfo.vendor_name,
                  vendor_website: vendorInfo.vendor_website,
                  patch_notes: patchNotes,
                  priority: this.calculatePriority(
                    software.current_version,
                    latestVersion
                  ),
                  check_date: new Date(),
                });

                console.log(
                  `✅ Update found: ${software.software_name} ${software.current_version} -> ${latestVersion}`
                );
              } else if (comparison > 0) {
                console.log(
                  `ℹ️ Current version is newer: ${software.software_name} ${software.current_version} > ${latestVersion}`
                );
              } else {
                console.log(
                  `✅ Up to date: ${software.software_name} ${software.current_version} = ${latestVersion}`
                );
              }
            }
          }

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error checking ${software.software_name}:`, error);
        }
      }

      console.log(
        `✅ Update check completed. Found ${updateResults.length} updates.`
      );
      return updateResults;
    } catch (error) {
      console.error("Error in checkForUpdates:", error);
      return [];
    }
  }

  async saveUpdateResults(updateResults) {
    try {
      let savedCount = 0;

      for (const update of updateResults) {
        await PatchAlert.findOneAndUpdate(
          {
            asset_id: update.asset_id,
            software_name: update.software_name,
          },
          update,
          { upsert: true, new: true }
        );
        savedCount++;
      }

      console.log(`✅ Saved ${savedCount} update results to database`);
      return savedCount;
    } catch (error) {
      console.error("Error saving update results:", error);
      return 0;
    }
  }
}

module.exports = PatchRegistryService;
