#!/usr/bin/env python3
"""
Hourly ML Analysis Job
Runs automated ML analysis on all active assets
"""

import schedule
import time
import logging
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.prediction_service import PredictionService
from config import *

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MLAnalysisJob:
    """Scheduled ML analysis job"""
    
    def __init__(self):
        self.prediction_service = PredictionService()
        self.job_count = 0
    
    def run_hourly_analysis(self):
        """Run the hourly ML analysis"""
        try:
            self.job_count += 1
            start_time = datetime.now()
            
            logger.info(f"Starting hourly ML analysis #{self.job_count}")
            logger.info(f"⏰ Started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Run analysis for all assets
            results = self.prediction_service.run_analysis_for_all_assets()
            
            # Calculate job statistics
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Count successful analyses
            successful_analyses = sum(1 for r in results if any([
                r['disk_prediction'],
                r['anomaly_detection'], 
                r['performance_analysis']
            ]))
            
            logger.info(f"✅ Hourly analysis #{self.job_count} completed")
            logger.info(f"📊 Assets analyzed: {len(results)}")
            logger.info(f"✅ Successful analyses: {successful_analyses}")
            logger.info(f"⏱️ Duration: {duration:.2f} seconds")
            logger.info(f"🔚 Finished at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            # Log any issues
            failed_analyses = len(results) - successful_analyses
            if failed_analyses > 0:
                logger.warning(f"⚠️ {failed_analyses} assets had insufficient data or errors")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error in hourly analysis job: {e}")
            return False
    
    def start_scheduler(self):
        """Start the scheduled analysis job"""
        logger.info(f"📅 Scheduling ML analysis every {ANALYSIS_INTERVAL_HOURS} hour(s)")
        
        # Schedule the job
        schedule.every(ANALYSIS_INTERVAL_HOURS).hours.do(self.run_hourly_analysis)
        
        # Run initial analysis
        logger.info("🚀 Running initial ML analysis...")
        self.run_hourly_analysis()
        
        # Main scheduler loop
        logger.info("⏰ ML Analysis Scheduler started - Press Ctrl+C to stop")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
                
        except KeyboardInterrupt:
            logger.info("🛑 ML Analysis Scheduler stopped by user")
        except Exception as e:
            logger.error(f"❌ Scheduler error: {e}")

def main():
    """Main function"""
    print("="*60)
    print("SIMPLE ASSET MONITOR - ML ANALYSIS JOB")
    print("="*60)
    
    # Test database connection
    try:
        service = PredictionService()
        assets = service.get_all_active_assets()
        print(f"📊 Connected to database - {len(assets)} active assets found")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Make sure MongoDB is running and accessible")
        sys.exit(1)
    
    # Start the job scheduler
    job = MLAnalysisJob()
    job.start_scheduler()

if __name__ == "__main__":
    main()

