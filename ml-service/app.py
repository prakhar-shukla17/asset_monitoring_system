#!/usr/bin/env python3
"""
Simple Asset Monitor - ML Service
Flask API for machine learning predictions and analysis
"""

from flask import Flask, request, jsonify
import logging
from datetime import datetime, timedelta
import sys
import os

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.prediction_service import PredictionService
from config import *

# Initialize Flask app
app = Flask(__name__)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize prediction service
prediction_service = PredictionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'service': 'ML Service',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict/disk/<asset_id>', methods=['GET'])
def predict_disk_space(asset_id):
    """Get disk space prediction for a specific asset"""
    try:
        logger.info(f"Disk prediction requested for {asset_id}")
        
        result = prediction_service.run_disk_prediction(asset_id)
        
        if result:
            return jsonify({
                'success': True,
                'asset_id': asset_id,
                'prediction': result,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Unable to generate disk prediction',
                'asset_id': asset_id
            }), 400
            
    except Exception as e:
        logger.error(f"Error in disk prediction API: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/detect/anomalies/<asset_id>', methods=['GET'])
def detect_anomalies(asset_id):
    """Detect performance anomalies for a specific asset"""
    try:
        logger.info(f"Anomaly detection requested for {asset_id}")
        
        result = prediction_service.run_anomaly_detection(asset_id)
        
        if result:
            return jsonify({
                'success': True,
                'asset_id': asset_id,
                'anomaly_detection': result,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Unable to detect anomalies',
                'asset_id': asset_id
            }), 400
            
    except Exception as e:
        logger.error(f"Error in anomaly detection API: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/analyze/performance/<asset_id>', methods=['GET'])
def analyze_performance(asset_id):
    """Analyze performance trends for a specific asset"""
    try:
        logger.info(f"Performance analysis requested for {asset_id}")
        
        result = prediction_service.run_performance_analysis(asset_id)
        
        if result:
            return jsonify({
                'success': True,
                'asset_id': asset_id,
                'analysis': result,
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Unable to analyze performance',
                'asset_id': asset_id
            }), 400
            
    except Exception as e:
        logger.error(f"Error in performance analysis API: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/analyze/full/<asset_id>', methods=['GET'])
def full_analysis(asset_id):
    """Run complete ML analysis for a specific asset"""
    try:
        logger.info(f"Full ML analysis requested for {asset_id}")
        
        result = prediction_service.run_full_analysis(asset_id)
        
        return jsonify({
            'success': True,
            'asset_id': asset_id,
            'analysis_results': result,
            'timestamp': datetime.now().isoformat()
        })
            
    except Exception as e:
        logger.error(f"Error in full analysis API: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/analyze/all', methods=['POST'])
def analyze_all_assets():
    """Run ML analysis for all active assets (triggered by scheduler)"""
    try:
        logger.info("Full ML analysis requested for all assets")
        
        results = prediction_service.run_analysis_for_all_assets()
        
        return jsonify({
            'success': True,
            'message': f'Analysis completed for {len(results)} assets',
            'results_count': len(results),
            'timestamp': datetime.now().isoformat()
        })
            
    except Exception as e:
        logger.error(f"Error in full analysis API: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/predictions/<asset_id>', methods=['GET'])
def get_predictions(asset_id):
    """Get recent ML predictions for an asset"""
    try:
        # Get query parameters
        limit = int(request.args.get('limit', 10))
        prediction_type = request.args.get('type', None)
        
        # Build query
        query = {'asset_id': asset_id}
        if prediction_type:
            query['prediction_type'] = prediction_type
        
        # Fetch predictions
        predictions = list(prediction_service.db.ml_predictions.find(query)
                          .sort('created_at', -1)
                          .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for pred in predictions:
            pred['_id'] = str(pred['_id'])
        
        return jsonify({
            'success': True,
            'asset_id': asset_id,
            'predictions': predictions,
            'count': len(predictions)
        })
        
    except Exception as e:
        logger.error(f"Error fetching predictions: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@app.route('/statistics', methods=['GET'])
def get_ml_statistics():
    """Get overall ML service statistics"""
    try:
        # Count predictions by type
        pipeline = [
            {'$group': {
                '_id': '$prediction_type',
                'count': {'$sum': 1}
            }}
        ]
        
        prediction_stats = list(prediction_service.db.ml_predictions.aggregate(pipeline))
        
        # Count ML-generated alerts
        ml_alerts_count = prediction_service.db.alerts.count_documents({
            'ml_generated': True
        })
        
        # Get recent activity
        last_24h = datetime.now() - timedelta(hours=24)
        recent_predictions = prediction_service.db.ml_predictions.count_documents({
            'created_at': {'$gte': last_24h}
        })
        
        return jsonify({
            'success': True,
            'statistics': {
                'prediction_types': prediction_stats,
                'ml_alerts_total': ml_alerts_count,
                'predictions_last_24h': recent_predictions,
                'service_uptime': 'Active',
                'last_updated': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

def main():
    """Main function to start the ML service"""
    print("="*60)
    print("SIMPLE ASSET MONITOR - ML SERVICE")
    print("="*60)
    print(f"Starting ML Service on port {ML_SERVICE_PORT}")
    print(f"Database: {MONGODB_URI}")
    print(f"Main Server: {MAIN_SERVER_URL}")
    print("="*60)
    
    try:
        app.run(
            host='0.0.0.0',
            port=ML_SERVICE_PORT,
            debug=False
        )
    except Exception as e:
        logger.error(f"Failed to start ML service: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()

