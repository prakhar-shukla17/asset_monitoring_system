import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.disk_predictor import DiskSpacePredictor
from models.anomaly_detector import PerformanceAnomalyDetector
from models.performance_analyzer import PerformanceAnalyzer
from config import *

class PredictionService:
    """Main service for running ML predictions"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize ML models
        self.disk_predictor = DiskSpacePredictor()
        self.anomaly_detector = PerformanceAnomalyDetector()
        self.performance_analyzer = PerformanceAnalyzer()
        
        # Database connection
        self.client = MongoClient(MONGODB_URI)
        self.db = self.client[DATABASE_NAME]
        
        print("Prediction Service initialized")
    
    def get_telemetry_data(self, asset_id, hours=168):  # Default 7 days
        """Get telemetry data for an asset"""
        try:
            start_time = datetime.now() - timedelta(hours=hours)
            
            # Debug: Get all telemetry for this asset first
            all_data = list(self.db.telemetries.find({'asset_id': asset_id}).sort('timestamp', 1))
            self.logger.info(f"🔍 Debug: Found {len(all_data)} total records for {asset_id}")
            
            if all_data:
                self.logger.info(f"🔍 Debug: Latest timestamp: {all_data[-1].get('timestamp')}")
                self.logger.info(f"🔍 Debug: Oldest timestamp: {all_data[0].get('timestamp')}")
                self.logger.info(f"🔍 Debug: Looking for data after: {start_time}")
            
            # Get recent data
            telemetry_data = list(self.db.telemetries.find({
                'asset_id': asset_id,
                'timestamp': {'$gte': start_time}
            }).sort('timestamp', 1))
            
            self.logger.info(f"🔍 Debug: Found {len(telemetry_data)} recent records")
            return telemetry_data
            
        except Exception as e:
            self.logger.error(f"Error fetching telemetry data: {e}")
            return []
    
    def get_all_active_assets(self):
        """Get all active assets"""
        try:
            # Get assets seen in last 24 hours
            last_24h = datetime.now() - timedelta(hours=24)
            
            assets = list(self.db.assets.find({
                'status': 'Active',
                'last_seen': {'$gte': last_24h}
            }))
            
            return assets
            
        except Exception as e:
            self.logger.error(f"Error fetching assets: {e}")
            return []
    
    def save_prediction(self, asset_id, prediction_type, prediction_data):
        """Save ML prediction to database"""
        try:
            prediction_doc = {
                'asset_id': asset_id,
                'prediction_type': prediction_type,
                'prediction_data': prediction_data,
                'created_at': datetime.now(),
                'model_version': '1.0.0'
            }
            
            result = self.db.ml_predictions.insert_one(prediction_doc)
            return result.inserted_id
            
        except Exception as e:
            self.logger.error(f"Error saving prediction: {e}")
            return None
    
    def create_ml_alert(self, asset_id, alert_type, message, severity='Medium', prediction_data=None):
        """Create an alert based on ML prediction"""
        try:
            alert_doc = {
                'asset_id': asset_id,
                'type': alert_type,
                'message': message,
                'severity': severity,
                'status': 'Open',
                'created_at': datetime.now(),
                'email_sent': False,
                'ml_generated': True,
                'prediction_data': prediction_data
            }
            
            result = self.db.alerts.insert_one(alert_doc)
            self.logger.info(f"ML alert created for {asset_id}: {message}")
            return result.inserted_id
            
        except Exception as e:
            self.logger.error(f"Error creating ML alert: {e}")
            return None
    
    def run_disk_prediction(self, asset_id):
        """Run disk space prediction for an asset"""
        try:
            print(f"📊 Running disk prediction for {asset_id}")
            
            # Get telemetry data
            telemetry_data = self.get_telemetry_data(asset_id, hours=168)  # 7 days
            
            if len(telemetry_data) < MINIMUM_DATA_POINTS:
                self.logger.warning(f"Insufficient data for {asset_id}: {len(telemetry_data)} points")
                return None
            
            # Run prediction
            prediction = self.disk_predictor.predict_disk_full_date(telemetry_data)
            
            if prediction['success']:
                # Save prediction
                prediction_id = self.save_prediction(asset_id, 'disk_space_prediction', prediction)
                
                # Create alert if needed
                days_remaining = prediction['days_remaining']
                if days_remaining is not None and days_remaining < DISK_FULL_WARNING_DAYS:
                    severity = 'High' if days_remaining < 3 else 'Medium'
                    message = f"ML Prediction: Disk will be full in {days_remaining:.1f} days"
                    
                    self.create_ml_alert(
                        asset_id, 
                        'ml_prediction', 
                        message, 
                        severity,
                        prediction
                    )
                
                return prediction
            else:
                self.logger.warning(f"Disk prediction failed for {asset_id}: {prediction['message']}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error in disk prediction for {asset_id}: {e}")
            return None
    
    def run_anomaly_detection(self, asset_id):
        """Run anomaly detection for an asset"""
        try:
            print(f"🔍 Running anomaly detection for {asset_id}")
            
            # Get baseline data (last 7 days)
            baseline_data = self.get_telemetry_data(asset_id, hours=168)
            
            # Get recent data (last 24 hours)
            recent_data = self.get_telemetry_data(asset_id, hours=24)
            
            if len(baseline_data) < MINIMUM_DATA_POINTS or len(recent_data) < 5:
                self.logger.warning(f"Insufficient data for anomaly detection: {asset_id}")
                return None
            
            # Run anomaly detection
            result = self.anomaly_detector.detect_anomalies(recent_data, baseline_data)
            
            if result['success'] and result['anomaly_count'] > 0:
                # Save prediction
                prediction_id = self.save_prediction(asset_id, 'anomaly_detection', result)
                
                # Create alert for significant anomalies
                high_severity_anomalies = [a for a in result['anomalies'] if a['severity'] == 'High']
                
                if len(high_severity_anomalies) > 0:
                    message = f"ML Alert: {len(high_severity_anomalies)} high-severity anomalies detected"
                    
                    self.create_ml_alert(
                        asset_id,
                        'performance_anomaly',
                        message,
                        'High',
                        result
                    )
                elif result['anomaly_count'] >= 3:  # Multiple anomalies
                    message = f"ML Alert: {result['anomaly_count']} performance anomalies detected"
                    
                    self.create_ml_alert(
                        asset_id,
                        'performance_anomaly',
                        message,
                        'Medium',
                        result
                    )
                
                return result
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error in anomaly detection for {asset_id}: {e}")
            return None
    
    def run_performance_analysis(self, asset_id):
        """Run performance trend analysis for an asset"""
        try:
            print(f"📈 Running performance analysis for {asset_id}")
            
            # Get telemetry data (last 7 days)
            telemetry_data = self.get_telemetry_data(asset_id, hours=168)
            
            if len(telemetry_data) < MINIMUM_DATA_POINTS:
                self.logger.warning(f"Insufficient data for performance analysis: {asset_id}")
                return None
            
            # Run analysis
            analysis = self.performance_analyzer.analyze_performance_trends(telemetry_data)
            
            if analysis['success']:
                # Save analysis
                prediction_id = self.save_prediction(asset_id, 'performance_analysis', analysis)
                
                # Create alerts for high-priority recommendations
                high_priority_recs = [r for r in analysis['recommendations'] if r['priority'] == 'High']
                
                if high_priority_recs:
                    for rec in high_priority_recs:
                        message = f"ML Recommendation: {rec['message']}"
                        
                        self.create_ml_alert(
                            asset_id,
                            'maintenance_recommendation',
                            message,
                            'Medium',
                            rec
                        )
                
                return analysis
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error in performance analysis for {asset_id}: {e}")
            return None
    
    def run_full_analysis(self, asset_id):
        """Run all ML analyses for a single asset"""
        print(f"\n🔬 Running full ML analysis for {asset_id}")
        
        results = {
            'asset_id': asset_id,
            'timestamp': datetime.now(),
            'disk_prediction': None,
            'anomaly_detection': None,
            'performance_analysis': None
        }
        
        # Run all analyses
        results['disk_prediction'] = self.run_disk_prediction(asset_id)
        results['anomaly_detection'] = self.run_anomaly_detection(asset_id)
        results['performance_analysis'] = self.run_performance_analysis(asset_id)
        
        print(f"✅ Completed ML analysis for {asset_id}")
        return results
    
    def run_analysis_for_all_assets(self):
        """Run ML analysis for all active assets"""
        print("\n🚀 Starting ML analysis for all assets...")
        
        assets = self.get_all_active_assets()
        print(f"📋 Found {len(assets)} active assets")
        
        results = []
        for asset in assets:
            try:
                result = self.run_full_analysis(asset['asset_id'])
                results.append(result)
            except Exception as e:
                self.logger.error(f"Error analyzing {asset['asset_id']}: {e}")
        
        print(f"✅ Completed ML analysis for {len(results)} assets")
        return results

# Test function
if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    service = PredictionService()
    
    # Test with a single asset (if any exist)
    assets = service.get_all_active_assets()
    
    if assets:
        test_asset = assets[0]
        print(f"\n🧪 Testing ML analysis on {test_asset['asset_id']}")
        result = service.run_full_analysis(test_asset['asset_id'])
        print("\n📊 Analysis Results:")
        print(f"Disk Prediction: {'✅' if result['disk_prediction'] else '❌'}")
        print(f"Anomaly Detection: {'✅' if result['anomaly_detection'] else '❌'}")
        print(f"Performance Analysis: {'✅' if result['performance_analysis'] else '❌'}")
    else:
        print("❌ No active assets found for testing")
        print("💡 Start the agent first to register some assets")

