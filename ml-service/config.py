import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/asset_monitor')
DATABASE_NAME = 'test'  # MongoDB default database

# API Configuration
MAIN_SERVER_URL = os.getenv('MAIN_SERVER_URL', 'http://localhost:3000')
ML_SERVICE_PORT = int(os.getenv('ML_SERVICE_PORT', 5000))

# ML Configuration
MINIMUM_DATA_POINTS = 3  # Minimum telemetry points needed for prediction
PREDICTION_CONFIDENCE_THRESHOLD = 0.7  # Only show predictions above 70% confidence
ANOMALY_CONTAMINATION = 0.1  # 10% of data considered potential anomalies

# Analysis Schedule
ANALYSIS_INTERVAL_HOURS = 1  # Run analysis every hour
CLEANUP_INTERVAL_DAYS = 30   # Keep predictions for 30 days

# Alert Thresholds
DISK_FULL_WARNING_DAYS = 7   # Alert if disk full in < 7 days
HIGH_USAGE_THRESHOLD = 90    # Alert if usage > 90%
ANOMALY_ALERT_THRESHOLD = 3  # Alert if 3+ anomalies in 24h

print(f"ML Service Configuration:")
print(f"   MongoDB: {MONGODB_URI}")
print(f"   Main Server: {MAIN_SERVER_URL}")
print(f"   ML Service Port: {ML_SERVICE_PORT}")
print(f"   Analysis Interval: {ANALYSIS_INTERVAL_HOURS}h")

