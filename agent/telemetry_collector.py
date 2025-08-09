import psutil
import time
import json

def get_cpu_usage():
    """Get current CPU usage percentage"""
    try:
        return psutil.cpu_percent(interval=1)
    except Exception as e:
        print(f"Error getting CPU usage: {e}")
        return 0

def get_memory_usage():
    """Get current memory usage"""
    try:
        memory = psutil.virtual_memory()
        return {
            'usage_percent': memory.percent,
            'used_gb': round(memory.used / (1024**3), 2),
            'available_gb': round(memory.available / (1024**3), 2)
        }
    except Exception as e:
        print(f"Error getting memory usage: {e}")
        return {'usage_percent': 0, 'used_gb': 0, 'available_gb': 0}

def get_disk_usage():
    """Get current disk usage"""
    try:
        import platform
        # Try Windows C: drive first if on Windows
        if platform.system() == 'Windows':
            disk_usage = psutil.disk_usage('C:\\')
        else:
            disk_usage = psutil.disk_usage('/')
        
        return {
            'usage_percent': round((disk_usage.used / disk_usage.total) * 100, 2),
            'used_gb': round(disk_usage.used / (1024**3), 2),
            'free_gb': round(disk_usage.free / (1024**3), 2),
            'total_gb': round(disk_usage.total / (1024**3), 2)
        }
    except Exception as e:
        print(f"Error getting disk usage: {str(e)}")
        return {'usage_percent': 0, 'used_gb': 0, 'free_gb': 0, 'total_gb': 0}

def get_network_usage():
    """Get current network usage"""
    try:
        # Get network I/O statistics
        net_io = psutil.net_io_counters()
        return {
            'bytes_sent': net_io.bytes_sent,
            'bytes_recv': net_io.bytes_recv,
            'packets_sent': net_io.packets_sent,
            'packets_recv': net_io.packets_recv
        }
    except Exception as e:
        print(f"Error getting network usage: {e}")
        return {'bytes_sent': 0, 'bytes_recv': 0, 'packets_sent': 0, 'packets_recv': 0}

def get_system_info():
    """Get additional system information"""
    try:
        boot_time = psutil.boot_time()
        current_time = time.time()
        uptime_seconds = current_time - boot_time
        
        return {
            'processes_count': len(psutil.pids()),
            'uptime_hours': round(uptime_seconds / 3600, 2),
            'boot_time': boot_time
        }
    except Exception as e:
        print(f"Error getting system info: {e}")
        return {'processes_count': 0, 'uptime_hours': 0, 'boot_time': 0}

def collect_telemetry():
    """Main function to collect all telemetry data"""
    try:
        print("📊 Collecting telemetry data...")
        
        cpu_usage = get_cpu_usage()
        memory_usage = get_memory_usage()
        disk_usage = get_disk_usage()
        network_usage = get_network_usage()
        system_info = get_system_info()
        
        telemetry_data = {
            'timestamp': time.time(),
            'cpu_usage_percent': cpu_usage,
            'ram_usage_percent': memory_usage['usage_percent'],
            'disk_usage_percent': disk_usage['usage_percent'],
            'network_in_kbps': 0,  # Simplified for now
            'network_out_kbps': 0,  # Simplified for now
            'processes_count': system_info['processes_count'],
            'uptime_hours': system_info['uptime_hours']
        }
        
        print("✅ Telemetry collection completed")
        return telemetry_data
        
    except Exception as e:
        print(f"❌ Error collecting telemetry: {e}")
        return None

if __name__ == "__main__":
    # Test telemetry collection
    data = collect_telemetry()
    if data:
        print("\n📊 Telemetry Data:")
        print(json.dumps(data, indent=2))

