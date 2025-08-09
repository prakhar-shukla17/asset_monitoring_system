#!/usr/bin/env python3
"""
Simple Asset Monitor - ML Service Startup Script
Starts both the ML API service and the scheduled analysis job
"""

import subprocess
import sys
import os
import time
import signal
from threading import Thread

def start_ml_api():
    """Start the ML Flask API service"""
    print("Starting ML API Service...")
    try:
        os.chdir('ml-service')
        subprocess.run([sys.executable, 'app.py'])
    except KeyboardInterrupt:
        print("🛑 ML API Service stopped")
    except Exception as e:
        print(f"Error starting ML API: {e}")

def start_analysis_job():
    """Start the scheduled analysis job"""
    print("Starting ML Analysis Job...")
    try:
        os.chdir('ml-service')
        subprocess.run([sys.executable, 'jobs/hourly_analysis.py'])
    except KeyboardInterrupt:
        print("🛑 ML Analysis Job stopped")
    except Exception as e:
        print(f"Error starting analysis job: {e}")

def main():
    """Main function to start both services"""
    print("="*60)
    print("SIMPLE ASSET MONITOR - ML SERVICE STARTER")
    print("="*60)
    print("Starting ML API Service and Analysis Job...")
    print("Press Ctrl+C to stop both services")
    print("="*60)
    
    try:
        # Start ML API in a separate thread
        api_thread = Thread(target=start_ml_api, daemon=True)
        api_thread.start()
        
        # Wait a moment for API to start
        time.sleep(3)
        
        # Start analysis job in main thread
        start_analysis_job()
        
    except KeyboardInterrupt:
        print("\n🛑 Stopping all ML services...")
        print("✅ ML services stopped")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

