#!/usr/bin/env node

/**
 * Simple Asset Monitor - Setup Script
 * Helps initialize the project and check dependencies
 */

const fs = require("fs");
const path = require("path");

console.log("🚀 Simple Asset Monitor - Setup Script");
console.log("=====================================\n");

// Check if .env file exists
function checkEnvFile() {
  const envPath = ".env";
  const envExamplePath = "env.example";

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log("📝 Creating .env file from example...");
      fs.copyFileSync(envExamplePath, envPath);
      console.log("✅ .env file created");
      console.log("⚠️  Please edit .env file with your settings");
    } else {
      console.log("❌ No .env.example file found");
    }
  } else {
    console.log("✅ .env file exists");
  }
}

// Check MongoDB connection
function checkMongoDB() {
  console.log("\n📊 MongoDB Setup:");
  console.log("1. Install MongoDB locally or use MongoDB Atlas");
  console.log("2. Update MONGODB_URI in .env file");
  console.log("3. Default: mongodb://localhost:27017/asset_monitor");
}

// Display startup instructions
function showStartupInstructions() {
  console.log("\n🚀 Getting Started:");
  console.log("==================");
  console.log("");
  console.log("1. Install dependencies:");
  console.log("   npm install");
  console.log("   cd agent && pip install -r requirements.txt");
  console.log("");
  console.log("2. Setup environment:");
  console.log("   - Edit .env file with your settings");
  console.log("   - Ensure MongoDB is running");
  console.log("");
  console.log("3. Start the server:");
  console.log("   npm start");
  console.log("");
  console.log("4. Deploy agent on target machines:");
  console.log("   cd agent");
  console.log("   python asset_agent.py");
  console.log("");
  console.log("5. Open dashboard:");
  console.log("   http://localhost:3000");
  console.log("");
  console.log("📚 For detailed instructions, see README.md");
}

// Main setup function
function main() {
  try {
    checkEnvFile();
    checkMongoDB();
    showStartupInstructions();

    console.log("\n✅ Setup completed!");
    console.log('🔧 Run "npm start" to begin');
  } catch (error) {
    console.error("❌ Setup error:", error.message);
    process.exit(1);
  }
}

// Run setup
main();

