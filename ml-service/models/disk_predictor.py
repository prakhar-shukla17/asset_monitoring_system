import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
import logging

class DiskSpacePredictor:
    """Simple disk space prediction using linear regression"""
    
    def __init__(self):
        self.model = LinearRegression()
        self.logger = logging.getLogger(__name__)
    
    def prepare_data(self, telemetry_data):
        """Prepare telemetry data for prediction"""
        try:
            if len(telemetry_data) < 3:  # Need at least 3 data points
                return None, None
            
            # Convert to DataFrame
            df = pd.DataFrame(telemetry_data)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp')
            
            # Create time-based features (hours since first measurement)
            first_time = df['timestamp'].iloc[0]
            df['hours_elapsed'] = (df['timestamp'] - first_time).dt.total_seconds() / 3600
            
            # Features: time elapsed
            X = df[['hours_elapsed']].values
            
            # Target: disk usage percentage
            y = df['disk_usage_percent'].values
            
            return X, y
            
        except Exception as e:
            self.logger.error(f"Error preparing data: {e}")
            return None, None
    
    def predict_disk_full_date(self, telemetry_data):
        """Predict when disk will be full"""
        try:
            X, y = self.prepare_data(telemetry_data)
            
            if X is None or y is None:
                return {
                    'success': False,
                    'message': 'Insufficient data for prediction',
                    'days_remaining': None,
                    'confidence': 0.0
                }
            
            # Train simple linear model
            self.model.fit(X, y)
            
            # Calculate R-squared for confidence
            confidence = max(0.0, min(1.0, self.model.score(X, y)))
            
            # Get current time and usage
            current_time_hours = X[-1][0]  # Last time point
            current_usage = y[-1]  # Last usage
            
            # Predict future usage
            if confidence < 0.3:  # Very poor fit
                return {
                    'success': False,
                    'message': 'Data too inconsistent for reliable prediction',
                    'days_remaining': None,
                    'confidence': confidence
                }
            
            # Calculate when disk reaches 100%
            # Linear equation: y = mx + b, solve for x when y = 100
            slope = self.model.coef_[0]
            intercept = self.model.intercept_
            
            if slope <= 0:  # Disk usage not increasing
                return {
                    'success': True,
                    'message': 'Disk usage stable or decreasing',
                    'days_remaining': 999,  # Essentially infinite
                    'confidence': confidence,
                    'trend': 'stable'
                }
            
            # Calculate hours until 100%
            hours_to_full = (100 - intercept) / slope - current_time_hours
            days_to_full = max(0, hours_to_full / 24)
            
            # Determine trend
            if slope > 0.5:  # More than 0.5% per hour
                trend = 'rapidly_increasing'
            elif slope > 0.1:  # More than 0.1% per hour
                trend = 'increasing'
            else:
                trend = 'slowly_increasing'
            
            return {
                'success': True,
                'message': f'Disk predicted to be full in {days_to_full:.1f} days',
                'days_remaining': round(days_to_full, 1),
                'confidence': round(confidence, 2),
                'trend': trend,
                'daily_increase_rate': round(slope * 24, 2),  # Convert to daily rate
                'current_usage': round(current_usage, 1)
            }
            
        except Exception as e:
            self.logger.error(f"Error in disk prediction: {e}")
            return {
                'success': False,
                'message': f'Prediction error: {str(e)}',
                'days_remaining': None,
                'confidence': 0.0
            }
    
    def get_recommendation(self, prediction_result):
        """Generate actionable recommendations"""
        if not prediction_result['success']:
            return "Unable to generate recommendation - insufficient data"
        
        days = prediction_result['days_remaining']
        trend = prediction_result.get('trend', 'unknown')
        
        if days is None or days > 30:
            return "Disk space is healthy - no immediate action needed"
        elif days < 3:
            return "🚨 URGENT: Disk will be full in <3 days - immediate cleanup required"
        elif days < 7:
            return "⚠️ WARNING: Schedule disk cleanup within next few days"
        elif days < 14:
            return "📅 PLAN: Schedule maintenance within 2 weeks"
        else:
            return "ℹ️ INFO: Monitor disk usage - trending upward"

# Test function
if __name__ == "__main__":
    # Test with sample data
    predictor = DiskSpacePredictor()
    
    # Sample telemetry data (simulating increasing disk usage)
    sample_data = []
    base_time = datetime.now() - timedelta(days=7)
    
    for i in range(168):  # 7 days * 24 hours
        sample_data.append({
            'timestamp': base_time + timedelta(hours=i),
            'disk_usage_percent': 60 + (i * 0.1) + np.random.normal(0, 2)  # Gradual increase with noise
        })
    
    result = predictor.predict_disk_full_date(sample_data)
    print("\n🧪 Test Prediction Result:")
    print(f"Success: {result['success']}")
    print(f"Days Remaining: {result['days_remaining']}")
    print(f"Confidence: {result['confidence']}")
    print(f"Recommendation: {predictor.get_recommendation(result)}")

