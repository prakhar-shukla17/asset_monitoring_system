# Simple IT Asset Monitor

A basic web-based system to monitor IT assets, collect hardware/software information, and track changes.

## Features

- 🖥️ **Auto Hardware Detection** - CPU, RAM, Storage, Network
- 💿 **Software Inventory** - Installed programs and versions
- 📊 **Basic Telemetry** - CPU, RAM, Disk usage monitoring
- 📝 **Manual Entry** - Purchase dates, warranty, license info
- 🚨 **Change Alerts** - Email notifications when hardware/software changes
- 🌐 **Web Dashboard** - Simple interface to view and manage assets
- 🤖 **AI/ML Predictions** - Disk space prediction, anomaly detection, performance analysis

## Quick Start

### 1. Install Dependencies
```bash
npm run install-all
```

### 2. Setup Database
- Install MongoDB locally or use MongoDB Atlas
- Copy `env.example` to `.env` and update settings

### 3. Start All Services
```bash
# Option 1: Start everything together
npm run start-all

# Option 2: Start services separately
npm start                    # Main server
npm run start-ml            # ML service
```

### 4. Deploy Agent
```bash
cd agent
python asset_agent.py
```

### 5. Open Dashboard
Open `http://localhost:3000` in your browser

## Project Structure

```
simple-asset-monitor/
├── server/          # Node.js API server
├── agent/           # Python detection agent
├── web/             # Simple HTML/CSS/JS frontend
├── ml-service/      # AI/ML Python service
└── database/        # Database initialization
```

## Basic Usage

1. **Deploy Agent**: Run the Python agent on target machines
2. **View Assets**: Open the web dashboard to see detected assets
3. **Add Manual Info**: Click on assets to add purchase dates, warranty info
4. **Monitor Changes**: Receive email alerts when changes are detected

## Simple Configuration

All configuration is done through the `.env` file:
- Database connection
- Email settings for alerts
- Basic authentication

This is a simplified system focused on core functionality!
