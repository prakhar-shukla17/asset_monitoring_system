# Simple IT Asset Monitor

A basic web-based system to monitor IT assets with AI/ML predictions.

## Features

- 🖥️ Auto Hardware Detection
- 📊 Performance Monitoring  
- 🤖 AI/ML Predictions
- 📝 Manual Asset Info
- 🚨 Real-time Alerts

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

### 4. Start System
```powershell
npm run start-all
```

### 5. Open Dashboard
http://localhost:3000

## Test Components

```powershell
# Test hardware detection
cd agent
python hardware_detector.py

# Test ML models
cd ../ml-service
python models/disk_predictor.py
```

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

That's it! Keep it simple. 🚀