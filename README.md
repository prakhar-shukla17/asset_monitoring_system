# Simple IT Asset Monitor

A basic web-based system to monitor IT assets with AI/ML predictions and detailed hardware component tracking.

## Features

- 🖥️ Auto Hardware Detection
- 📊 Performance Monitoring  
- 🤖 AI/ML Predictions
- 📝 Manual Asset Info
- 🚨 Real-time Alerts
- 🔧 **Hardware Component Management**
- 📅 **Warranty Tracking & Alerts**

## New Features (v1.1)

### 🔧 Hardware Component Management
- **Individual Component Tracking**: Track CPU, RAM, Storage, Motherboard, GPU, Network Cards, Power Supply, Monitors, Keyboards, Mice, and more
- **Detailed Component Info**: Model, serial number, manufacturer, vendor, purchase price
- **Component Status**: Active, Failed, Replaced, Under Warranty
- **Notes & Documentation**: Add detailed notes for each component

### 📅 Warranty Management
- **Purchase Date Tracking**: Record when each component was purchased
- **Warranty Period Management**: Set warranty start date and duration
- **Automatic Expiry Calculation**: System calculates warranty end dates
- **Smart Alerts**: 
  - 🚨 **Critical**: Warranty expires in ≤7 days
  - ⚠️ **Warning**: Warranty expires in ≤30 days  
  - ❌ **Expired**: Warranty has expired
- **Warranty Dashboard**: Dedicated page to view all warranty alerts

### 🎯 Alert System
- **Component-level Alerts**: Get notified about specific component warranties
- **Asset-level Summary**: See warranty status for all components in an asset
- **Cross-asset View**: View all warranty alerts across your entire infrastructure
- **Filtering & Search**: Filter by severity, component type, or search terms

## Windows Setup

### 1. Install MongoDB
Download and install: https://www.mongodb.com/try/download/community

### 2. Install Dependencies
```powershell
npm install
cd agent
pip install -r requirements.txt
cd ../ml-service  
pip install -r requirements.txt
cd ..
```

### 3. Setup Environment
```powershell
copy env.example .env
# Edit .env file with your MongoDB connection
```

### 4. Start Services (3 separate terminals)

**Terminal 1 - Main Server:**
```powershell
node server/app.js
```

**Terminal 2 - ML Service:**
```powershell
python start_ml_service.py
```

**Terminal 3 - Asset Agent:**
```powershell
cd agent
python asset_agent.py
```

### 5. Open Dashboard
http://localhost:3000

## Using Hardware Component Management

### Adding Components
1. Go to **Components** page
2. Select an asset from the dropdown
3. Fill out the component form:
   - **Component Type**: CPU, RAM, Storage, etc.
   - **Component Name**: Descriptive name (e.g., "Intel i7-10700K")
   - **Model**: Specific model number
   - **Serial Number**: Component serial number
   - **Manufacturer**: Intel, Samsung, etc.
   - **Vendor**: Where you purchased it
   - **Purchase Date**: When you bought it
   - **Warranty Start**: When warranty begins
   - **Warranty Duration**: Number of months
   - **Purchase Price**: Cost of the component
   - **Notes**: Any additional information

### Managing Warranty Alerts
1. **Dashboard**: Click the "Warranty Alerts" card to see critical alerts
2. **Warranty Alerts Page**: View all warranty alerts with filtering options
3. **Asset Components**: See warranty status for each component in an asset
4. **Automatic Calculations**: System automatically calculates warranty end dates

### Alert Levels
- 🔴 **Expired**: Warranty has expired - immediate action needed
- 🟠 **Critical**: Warranty expires in ≤7 days - urgent attention required
- 🟡 **Warning**: Warranty expires in ≤30 days - plan for renewal/replacement

## Test Components

```powershell
# Test hardware detection
cd agent
python hardware_detector.py

# Test ML models
cd ../ml-service
python models/disk_predictor.py
```

## API Endpoints

### Hardware Components
- `GET /api/assets/:id` - Get asset with components
- `POST /api/assets/:id/components` - Add component
- `PUT /api/assets/:id/components/:index` - Update component
- `DELETE /api/assets/:id/components/:index` - Delete component

### Warranty Alerts
- `GET /api/assets/:id/warranty-alerts` - Get alerts for specific asset
- `GET /api/assets/warranty-alerts/all` - Get all warranty alerts

## Troubleshooting

### MongoDB Issues
```powershell
# Check MongoDB
mongod --version
net start MongoDB
```

### Port Issues
```powershell
# Check if ports are free
netstat -an | findstr :3000
netstat -an | findstr :5000
```

### Component Management Issues
- Ensure asset is registered before adding components
- Check that warranty dates are in correct format (YYYY-MM-DD)
- Verify component type is from the allowed list

That's it! Keep it simple. 🚀

## Screenshots

### Hardware Components Page
- Asset selector dropdown
- Component form with all fields
- Component cards with warranty alerts
- Warranty summary statistics

### Warranty Alerts Page  
- Overview of all warranty alerts
- Filtering by severity and component type
- Search functionality
- Direct links to manage components

### Dashboard Integration
- Warranty alerts count in summary cards
- Clickable warranty alerts card
- Navigation to component management