#!/usr/bin/env python3
"""
Simple IT Asset Monitoring Agent
Detects hardware/software and sends telemetry to server
"""

import time
import json
import requests
import schedule
import sys
import uuid
from datetime import datetime

# Import our modules
from config import *
from hardware_detector import detect_hardware, detect_hardware_and_software
from telemetry_collector import collect_telemetry

class AssetAgent:
    def __init__(self):
        self.asset_id = None
        self.registered = False
        print(f"🤖 Asset Agent v{AGENT_VERSION} starting...")
        print(f"🏠 Hostname: {HOSTNAME}")
        
    def generate_asset_id(self, hardware_info):
        """Generate a unique asset ID based on machine characteristics"""
        try:
            # Create a consistent UUID based on hostname and MAC address
            hostname = hardware_info.get('os', {}).get('hostname', HOSTNAME)
            mac = hardware_info.get('network', {}).get('primary_mac', '')
            
            # Create a namespace-based UUID (consistent for same machine)
            machine_identifier = f"{hostname}-{mac}".encode('utf-8')
            machine_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, machine_identifier.decode('utf-8'))
            
            # Use first 12 characters for shorter ID
            uuid_short = str(machine_uuid).replace('-', '').upper()[:12]
            return f"{ASSET_ID_PREFIX}-{uuid_short}"
        except:
            # Fallback to MAC address if UUID fails
            try:
                mac = hardware_info['network']['primary_mac']
                if mac:
                    mac_clean = mac.replace(':', '').replace('-', '').upper()
                    return f"{ASSET_ID_PREFIX}-{mac_clean[:8]}"
                else:
                    return f"{ASSET_ID_PREFIX}-{HOSTNAME}-FALLBACK"
            except:
                return f"{ASSET_ID_PREFIX}-{HOSTNAME}-FALLBACK"
    
    def register_asset(self):
        """Register this asset with the server"""
        try:
            print("🔍 Detecting hardware and software, then registering asset...")
            
            # Detect both hardware and software
            detection_info = detect_hardware_and_software()
            hardware_info = detection_info['hardware']
            software_info = detection_info['software']
            
            # Generate asset ID
            self.asset_id = self.generate_asset_id(hardware_info)
            
            # Prepare registration data
            registration_data = {
                'asset_id': self.asset_id,
                'hostname': hardware_info['os']['hostname'],
                'ip_address': hardware_info['network']['primary_ip'],
                'mac_address': hardware_info['network']['primary_mac'],
                'hardware_info': {
                    'cpu_model': hardware_info['cpu']['cpu_model'],
                    'total_ram_gb': hardware_info['memory']['total_ram_gb'],
                    'total_storage_gb': hardware_info['disk']['total_storage_gb']
                },
                'os_info': {
                    'name': hardware_info['os']['name'],
                    'version': hardware_info['os']['version'],
                    'release': hardware_info['os']['release']
                },
                'software_info': {
                    'software_list': software_info['software_list'],
                    'software_count': software_info['software_count'],
                    'last_software_scan': datetime.now().isoformat()
                }
            }
            
            # Log software info being sent
            print(f"📊 Sending software info: {software_info['software_count']} applications")
            
            # Send registration to server
            response = requests.post(
                API_ENDPOINTS['register'],
                json=registration_data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                if result.get('success'):
                    self.registered = True
                    print(f"✅ Asset registered successfully!")
                    print(f"🆔 Asset ID: {self.asset_id}")
                    return True
                else:
                    print(f"❌ Registration failed: {result.get('message')}")
                    return False
            else:
                print(f"❌ Server error: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error during registration: {e}")
            return False
        except Exception as e:
            print(f"❌ Error during registration: {e}")
            return False
    
    def send_telemetry(self):
        """Send telemetry data to server"""
        if not self.registered or not self.asset_id:
            print("⚠️ Asset not registered, skipping telemetry")
            return False
            
        try:
            print("📊 Collecting and sending telemetry...")
            
            # Collect telemetry
            telemetry_data = collect_telemetry()
            if not telemetry_data:
                print("❌ Failed to collect telemetry data")
                return False
            
            # Add asset ID
            telemetry_data['asset_id'] = self.asset_id
            
            # Send to server
            response = requests.post(
                API_ENDPOINTS['telemetry'],
                json=telemetry_data,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"✅ Telemetry sent successfully")
                    print(f"   CPU: {telemetry_data['cpu_usage_percent']:.1f}%")
                    print(f"   RAM: {telemetry_data['ram_usage_percent']:.1f}%")
                    print(f"   Disk: {telemetry_data['disk_usage_percent']:.1f}%")
                    return True
                else:
                    print(f"❌ Telemetry failed: {result.get('message')}")
                    return False
            else:
                print(f"❌ Server error: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error during telemetry: {e}")
            return False
        except Exception as e:
            print(f"❌ Error during telemetry: {e}")
            return False
    
    def run_discovery(self):
        """Run asset discovery (re-registration)"""
        print(f"\n🔄 Running asset discovery - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.register_asset()
    
    def run_telemetry(self):
        """Run telemetry collection"""
        print(f"\n📊 Running telemetry collection - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.send_telemetry()
    
    def start(self):
        """Start the agent"""
        print(f"\n🚀 Starting Asset Agent...")
        
        # Initial registration
        if not self.register_asset():
            print("❌ Initial registration failed. Please check server connection.")
            print("🔄 Will retry on next scheduled discovery...")
        
        # Schedule discovery (re-registration) every hour
        schedule.every(DISCOVERY_INTERVAL // 60).minutes.do(self.run_discovery)
        
        # Schedule telemetry every 5 minutes
        schedule.every(TELEMETRY_INTERVAL // 60).minutes.do(self.run_telemetry)
        
        print(f"\n⏰ Scheduled Tasks:")
        print(f"   🔍 Asset Discovery: Every {DISCOVERY_INTERVAL // 60} minutes")
        print(f"   📊 Telemetry Collection: Every {TELEMETRY_INTERVAL // 60} minutes")
        print(f"\n🔄 Agent running... Press Ctrl+C to stop")
        
        try:
            # Run initial telemetry if registered
            if self.registered:
                time.sleep(5)  # Wait a bit after registration
                self.send_telemetry()
            
            # Main loop
            while True:
                schedule.run_pending()
                time.sleep(10)  # Check every 10 seconds
                
        except KeyboardInterrupt:
            print(f"\n🛑 Agent stopped by user")
        except Exception as e:
            print(f"\n❌ Agent error: {e}")

def main():
    """Main function"""
    print("="*60)
    print("🖥️  SIMPLE IT ASSET MONITORING AGENT")
    print("="*60)
    
    agent = AssetAgent()
    agent.start()

if __name__ == "__main__":
    main()

