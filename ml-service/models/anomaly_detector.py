import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import logging

class PerformanceAnomalyDetector:
    """Simple anomaly detection using Isolation Forest"""
    
    def __init__(self, contamination=0.1):
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100
        )
        self.scaler = StandardScaler()
        self.logger = logging.getLogger(__name__)
        self.is_trained = False
    
    def prepare_features(self, telemetry_data):
        """Extract features from telemetry data"""
        try:
            if len(telemetry_data) < 10:  # Need at least 10 data points
                return None
            
            # Convert to DataFrame
            df = pd.DataFrame(telemetry_data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp')
            
            # Basic features
            features = df[[
                'cpu_usage_percent',
                'ram_usage_percent', 
                'disk_usage_percent'
            ]].fillna(0)  # Fill missing values with 0
            
            # Add time-based features
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek
            
            # Add derived features
            features['hour'] = df['hour']
            features['day_of_week'] = df['day_of_week']
            features['total_usage'] = (
                features['cpu_usage_percent'] + 
                features['ram_usage_percent'] + 
                features['disk_usage_percent']
            ) / 3
            
            return features.values
            
        except Exception as e:
            self.logger.error(f"Error preparing features: {e}")
            return None
    
    def train_baseline(self, telemetry_data):
        """Train the model on baseline 'normal' data"""
        try:
            features = self.prepare_features(telemetry_data)
            
            if features is None:
                return False
            
            # Scale features
            features_scaled = self.scaler.fit_transform(features)
            
            # Train model
            self.model.fit(features_scaled)
            self.is_trained = True
            
            self.logger.info(f"Model trained on {len(features)} data points")
            return True
            
        except Exception as e:
            self.logger.error(f"Error training model: {e}")
            return False
    
    def detect_anomalies(self, recent_telemetry_data, baseline_data=None):
        """Detect anomalies in recent telemetry data"""
        try:
            # If baseline data provided, retrain model
            if baseline_data and len(baseline_data) >= 10:
                if not self.train_baseline(baseline_data):
                    return {
                        'success': False,
                        'message': 'Failed to train baseline model',
                        'anomalies': []
                    }
            
            if not self.is_trained:
                return {
                    'success': False,
                    'message': 'Model not trained - need baseline data',
                    'anomalies': []
                }
            
            # Prepare recent data
            recent_features = self.prepare_features(recent_telemetry_data)
            if recent_features is None:
                return {
                    'success': False,
                    'message': 'Insufficient recent data',
                    'anomalies': []
                }
            
            # Scale features using existing scaler
            recent_features_scaled = self.scaler.transform(recent_features)
            
            # Predict anomalies
            predictions = self.model.predict(recent_features_scaled)
            anomaly_scores = self.model.decision_function(recent_features_scaled)
            
            # Find anomalies (prediction = -1)
            anomalies = []
            for i, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
                if prediction == -1:  # Anomaly detected
                    telemetry_point = recent_telemetry_data[i]
                    anomalies.append({
                        'timestamp': telemetry_point['timestamp'],
                        'anomaly_score': round(float(score), 3),
                        'cpu_usage': telemetry_point.get('cpu_usage_percent', 0),
                        'ram_usage': telemetry_point.get('ram_usage_percent', 0),
                        'disk_usage': telemetry_point.get('disk_usage_percent', 0),
                        'severity': self._calculate_severity(score, telemetry_point)
                    })
            
            return {
                'success': True,
                'message': f'Analyzed {len(recent_telemetry_data)} data points',
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
                'anomaly_rate': round(len(anomalies) / len(recent_telemetry_data), 3)
            }
            
        except Exception as e:
            self.logger.error(f"Error detecting anomalies: {e}")
            return {
                'success': False,
                'message': f'Anomaly detection error: {str(e)}',
                'anomalies': []
            }
    
    def _calculate_severity(self, anomaly_score, telemetry_point):
        """Calculate severity based on anomaly score and usage levels"""
        # More negative score = more anomalous
        score_severity = "Low"
        if anomaly_score < -0.5:
            score_severity = "High"
        elif anomaly_score < -0.3:
            score_severity = "Medium"
        
        # Check if any usage is critically high
        cpu = telemetry_point.get('cpu_usage_percent', 0)
        ram = telemetry_point.get('ram_usage_percent', 0)
        disk = telemetry_point.get('disk_usage_percent', 0)
        
        if any(usage > 95 for usage in [cpu, ram, disk]):
            return "High"
        elif any(usage > 85 for usage in [cpu, ram, disk]):
            return "Medium" if score_severity != "High" else "High"
        
        return score_severity
    
    def get_anomaly_explanation(self, anomaly):
        """Generate human-readable explanation for anomaly"""
        cpu = anomaly['cpu_usage']
        ram = anomaly['ram_usage'] 
        disk = anomaly['disk_usage']
        
        explanations = []
        
        if cpu > 90:
            explanations.append(f"Very high CPU usage ({cpu:.1f}%)")
        if ram > 90:
            explanations.append(f"Very high RAM usage ({ram:.1f}%)")
        if disk > 90:
            explanations.append(f"Very high disk usage ({disk:.1f}%)")
        
        if not explanations:
            explanations.append("Unusual usage pattern detected")
        
        return " | ".join(explanations)

# Test function
if __name__ == "__main__":
    import random
    
    detector = PerformanceAnomalyDetector()
    
    # Generate sample baseline data (normal usage)
    baseline_data = []
    base_time = datetime.now() - timedelta(days=7)
    
    for i in range(168):  # 7 days * 24 hours
        baseline_data.append({
            'timestamp': base_time + timedelta(hours=i),
            'cpu_usage_percent': random.uniform(20, 60),  # Normal range
            'ram_usage_percent': random.uniform(40, 70),  # Normal range
            'disk_usage_percent': random.uniform(50, 70)  # Normal range
        })
    
    # Generate recent data with some anomalies
    recent_data = []
    recent_time = datetime.now() - timedelta(hours=24)
    
    for i in range(24):  # Last 24 hours
        if i in [5, 12, 18]:  # Add some anomalies
            recent_data.append({
                'timestamp': recent_time + timedelta(hours=i),
                'cpu_usage_percent': random.uniform(95, 100),  # Anomaly
                'ram_usage_percent': random.uniform(90, 100),  # Anomaly
                'disk_usage_percent': random.uniform(50, 70)
            })
        else:
            recent_data.append({
                'timestamp': recent_time + timedelta(hours=i),
                'cpu_usage_percent': random.uniform(20, 60),
                'ram_usage_percent': random.uniform(40, 70),
                'disk_usage_percent': random.uniform(50, 70)
            })
    
    # Test anomaly detection
    result = detector.detect_anomalies(recent_data, baseline_data)
    
    print("\n🧪 Test Anomaly Detection Result:")
    print(f"Success: {result['success']}")
    print(f"Anomalies Found: {result['anomaly_count']}")
    print(f"Anomaly Rate: {result['anomaly_rate']:.1%}")
    
    if result['anomalies']:
        print("\n🚨 Detected Anomalies:")
        for anomaly in result['anomalies']:
            print(f"  Time: {anomaly['timestamp']}")
            print(f"  Severity: {anomaly['severity']}")
            print(f"  CPU: {anomaly['cpu_usage']:.1f}%")
            print(f"  RAM: {anomaly['ram_usage']:.1f}%")
            print(f"  Explanation: {detector.get_anomaly_explanation(anomaly)}")
            print("  ---")

