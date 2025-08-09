import psutil
import platform
import socket
import json
from software_detector import detect_software, get_software_summary

def get_cpu_info():
    """Get basic CPU information"""
    try:
        cpu_freq = psutil.cpu_freq()
        return {
            'cpu_model': platform.processor() or 'Unknown',
            'cores': psutil.cpu_count(logical=False),
            'threads': psutil.cpu_count(logical=True),
            'frequency_ghz': round(cpu_freq.current / 1000, 2) if cpu_freq else 0
        }
    except Exception as e:
        print(f"Error getting CPU info: {e}")
        return {'cpu_model': 'Unknown', 'cores': 0, 'threads': 0, 'frequency_ghz': 0}

def get_memory_info():
    """Get memory information"""
    try:
        memory = psutil.virtual_memory()
        return {
            'total_ram_gb': round(memory.total / (1024**3), 2),
            'available_ram_gb': round(memory.available / (1024**3), 2)
        }
    except Exception as e:
        print(f"Error getting memory info: {e}")
        return {'total_ram_gb': 0, 'available_ram_gb': 0}

def get_disk_info():
    """Get disk information"""
    try:
        disks = []
        partitions = psutil.disk_partitions()
        
        total_storage = 0
        for partition in partitions:
            try:
                # Skip system partitions that might cause issues
                if partition.fstype == '' or 'System' in partition.device:
                    continue
                    
                usage = psutil.disk_usage(partition.mountpoint)
                disk_info = {
                    'device': str(partition.device),
                    'mountpoint': str(partition.mountpoint),
                    'fstype': str(partition.fstype),
                    'total_gb': round(usage.total / (1024**3), 2),
                    'used_gb': round(usage.used / (1024**3), 2),
                    'free_gb': round(usage.free / (1024**3), 2)
                }
                disks.append(disk_info)
                total_storage += usage.total
            except (PermissionError, OSError) as e:
                print(f"Skipping partition {partition.device}: {str(e)}")
                continue
        
        return {
            'disks': disks,
            'total_storage_gb': round(total_storage / (1024**3), 2)
        }
    except Exception as e:
        print(f"Error getting disk info: {str(e)}")
        return {'disks': [], 'total_storage_gb': 0}

def get_network_info():
    """Get network information"""
    try:
        interfaces = []
        net_if_addrs = psutil.net_if_addrs()
        
        for interface_name, interface_addresses in net_if_addrs.items():
            for address in interface_addresses:
                if address.family == socket.AF_INET:  # IPv4
                    interfaces.append({
                        'interface': interface_name,
                        'ip_address': address.address,
                        'netmask': address.netmask
                    })
                elif address.family == psutil.AF_LINK:  # MAC address
                    # Find the corresponding IPv4 interface and add MAC
                    for iface in interfaces:
                        if iface['interface'] == interface_name:
                            iface['mac_address'] = address.address
                            break
                    else:
                        # Create new interface entry with MAC
                        interfaces.append({
                            'interface': interface_name,
                            'mac_address': address.address,
                            'ip_address': None,
                            'netmask': None
                        })
        
        # Get primary IP and MAC
        primary_ip = None
        primary_mac = None
        
        for iface in interfaces:
            if iface.get('ip_address') and not iface['ip_address'].startswith('127.'):
                primary_ip = iface['ip_address']
                primary_mac = iface.get('mac_address')
                break
        
        return {
            'interfaces': interfaces,
            'primary_ip': primary_ip,
            'primary_mac': primary_mac
        }
    except Exception as e:
        print(f"Error getting network info: {e}")
        return {'interfaces': [], 'primary_ip': None, 'primary_mac': None}

def get_os_info():
    """Get operating system information"""
    try:
        return {
            'name': platform.system(),
            'version': platform.version(),
            'release': platform.release(),
            'architecture': platform.architecture()[0],
            'hostname': platform.node()
        }
    except Exception as e:
        print(f"Error getting OS info: {e}")
        return {'name': 'Unknown', 'version': 'Unknown', 'release': 'Unknown', 'architecture': 'Unknown', 'hostname': 'Unknown'}

def detect_hardware():
    """Main function to detect all hardware information"""
    print("🔍 Detecting hardware information...")
    
    hardware_info = {
        'cpu': get_cpu_info(),
        'memory': get_memory_info(),
        'disk': get_disk_info(),
        'network': get_network_info(),
        'os': get_os_info()
    }
    
    print("✅ Hardware detection completed")
    return hardware_info

def detect_hardware_and_software():
    """Detect both hardware and software information"""
    print("🔍 Detecting hardware and software information...")
    
    # Get hardware info
    hardware_info = detect_hardware()
    
    # Get software info
    software_list = detect_software()
    software_summary = get_software_summary(software_list)
    
    software_info = {
        'software_list': software_list,
        'software_count': software_summary['total_count'],
        'software_summary': software_summary
    }
    
    return {
        'hardware': hardware_info,
        'software': software_info
    }

if __name__ == "__main__":
    # Test the hardware detection
    info = detect_hardware()
    print("\n📋 Hardware Information:")
    print(json.dumps(info, indent=2))

