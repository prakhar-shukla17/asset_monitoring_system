#!/usr/bin/env python3
"""
System Unique ID Generator
Different methods to create a unique identifier for a system
"""

import uuid
import hashlib
import platform
import subprocess
import psutil
import socket

def method1_machine_uuid():
    """Method 1: Use system's machine UUID (most reliable)"""
    try:
        # Windows: Get machine GUID from registry
        if platform.system() == "Windows":
            result = subprocess.run(['wmic', 'csproduct', 'get', 'UUID'], 
                                  capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and line != 'UUID' and len(line) > 10:
                    return f"SYS-{line.replace('-', '')[:12].upper()}"
        
        # Linux/Mac: Try to read machine-id
        elif platform.system() in ["Linux", "Darwin"]:
            try:
                with open('/etc/machine-id', 'r') as f:
                    machine_id = f.read().strip()
                    return f"SYS-{machine_id[:12].upper()}"
            except:
                try:
                    with open('/var/lib/dbus/machine-id', 'r') as f:
                        machine_id = f.read().strip()
                        return f"SYS-{machine_id[:12].upper()}"
                except:
                    pass
    except:
        pass
    return None

def method2_hardware_fingerprint():
    """Method 2: Create fingerprint from hardware info"""
    try:
        # Get system info
        hostname = platform.node()
        system = platform.system()
        processor = platform.processor()
        
        # Get motherboard info (Windows)
        motherboard_serial = "Unknown"
        if platform.system() == "Windows":
            try:
                result = subprocess.run(['wmic', 'baseboard', 'get', 'serialnumber'], 
                                      capture_output=True, text=True)
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    line = line.strip()
                    if line and line != 'SerialNumber' and len(line) > 3:
                        motherboard_serial = line
                        break
            except:
                pass
        
        # Create fingerprint
        fingerprint_data = f"{hostname}-{system}-{processor}-{motherboard_serial}"
        fingerprint_hash = hashlib.sha256(fingerprint_data.encode()).hexdigest()[:12].upper()
        return f"SYS-{fingerprint_hash}"
        
    except Exception as e:
        print(f"Error in hardware fingerprint: {e}")
        return None

def method3_network_mac():
    """Method 3: Use primary network MAC address"""
    try:
        # Get all network interfaces
        interfaces = psutil.net_if_addrs()
        
        # Look for primary network interface (not loopback, virtual, etc.)
        for interface_name, addresses in interfaces.items():
            # Skip loopback and virtual interfaces
            if any(skip in interface_name.lower() for skip in 
                   ['loopback', 'virtual', 'vmware', 'vbox', 'docker', 'wsl']):
                continue
                
            for addr in addresses:
                if addr.family == psutil.AF_LINK:  # MAC address
                    mac = addr.address
                    if mac and mac != '00:00:00:00:00:00':
                        mac_clean = mac.replace(':', '').replace('-', '').upper()
                        return f"SYS-{mac_clean[:12]}"
    except Exception as e:
        print(f"Error getting MAC: {e}")
    return None

def method4_cpu_serial():
    """Method 4: Use CPU serial number (Windows)"""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['wmic', 'cpu', 'get', 'processorid'], 
                                  capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and line != 'ProcessorId' and len(line) > 8:
                    return f"SYS-{line[:12].upper()}"
    except:
        pass
    return None

def method5_disk_serial():
    """Method 5: Use primary disk serial number"""
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['wmic', 'diskdrive', 'get', 'serialnumber'], 
                                  capture_output=True, text=True)
            lines = result.stdout.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and line != 'SerialNumber' and len(line) > 5:
                    serial_clean = line.replace(' ', '').replace('-', '').upper()
                    return f"SYS-{serial_clean[:12]}"
    except:
        pass
    return None

def method6_combined_hash():
    """Method 6: Combine multiple system attributes"""
    try:
        # Gather multiple system identifiers
        hostname = platform.node()
        system = platform.system()
        machine = platform.machine()
        processor = platform.processor()
        
        # Get MAC address
        mac = "unknown"
        try:
            mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) 
                           for elements in range(0,2*6,2)][::-1])
        except:
            pass
        
        # Combine all data
        combined_data = f"{hostname}-{system}-{machine}-{processor}-{mac}"
        combined_hash = hashlib.md5(combined_data.encode()).hexdigest()[:12].upper()
        return f"SYS-{combined_hash}"
        
    except Exception as e:
        print(f"Error in combined hash: {e}")
        return None

def generate_system_id():
    """Generate system ID using the best available method"""
    
    print("🔍 Testing different methods to generate unique system ID...\n")
    
    methods = [
        ("Machine UUID", method1_machine_uuid),
        ("Hardware Fingerprint", method2_hardware_fingerprint),
        ("Network MAC", method3_network_mac),
        ("CPU Serial", method4_cpu_serial),
        ("Disk Serial", method5_disk_serial),
        ("Combined Hash", method6_combined_hash)
    ]
    
    results = {}
    
    for name, method in methods:
        try:
            result = method()
            results[name] = result
            status = "✅" if result else "❌"
            print(f"{status} {name:20}: {result}")
        except Exception as e:
            results[name] = None
            print(f"❌ {name:20}: Error - {e}")
    
    print("\n" + "="*50)
    
    # Choose the best available method
    priority_order = [
        "Machine UUID",      # Most reliable
        "Hardware Fingerprint", # Very reliable
        "Network MAC",       # Good
        "CPU Serial",        # Good for Windows
        "Disk Serial",       # Good for Windows
        "Combined Hash"      # Fallback
    ]
    
    for method_name in priority_order:
        if results.get(method_name):
            print(f"🎯 RECOMMENDED: Using '{method_name}'")
            print(f"🆔 System ID: {results[method_name]}")
            return results[method_name]
    
    # Last resort - random UUID
    fallback_id = f"SYS-{str(uuid.uuid4())[:12].upper()}"
    print(f"⚠️ FALLBACK: Using random UUID")
    print(f"🆔 System ID: {fallback_id}")
    return fallback_id

if __name__ == "__main__":
    print("🖥️ System Unique ID Generator")
    print("="*50)
    print(f"Operating System: {platform.system()} {platform.release()}")
    print(f"Hostname: {platform.node()}")
    print(f"Architecture: {platform.machine()}")
    print()
    
    system_id = generate_system_id()
    
    print("\n" + "="*50)
    print("💡 RECOMMENDATIONS:")
    print("1. Machine UUID - Most reliable, survives hardware changes")
    print("2. Hardware Fingerprint - Good balance of uniqueness and stability")
    print("3. Network MAC - Simple but can change with network cards")
    print("4. CPU/Disk Serial - Hardware specific, very unique")
    print("5. Combined Hash - Fallback option, consistent per system")
