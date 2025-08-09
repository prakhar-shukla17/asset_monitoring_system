import subprocess
import json
import platform
import re
from datetime import datetime

def get_installed_software_windows():
    """Get installed software on Windows using WMI"""
    try:
        software_list = []
        
        # Use PowerShell to get installed software
        cmd = [
            'powershell', '-Command',
            "Get-WmiObject -Class Win32_Product | Select-Object Name, Version, Vendor, InstallDate | ConvertTo-Json"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode == 0 and result.stdout.strip():
            try:
                data = json.loads(result.stdout)
                if isinstance(data, list):
                    for item in data:
                        if item.get('Name'):
                            software_list.append({
                                'name': item.get('Name', 'Unknown'),
                                'version': item.get('Version', 'Unknown'),
                                'vendor': item.get('Vendor', 'Unknown'),
                                'install_date': item.get('InstallDate', None)
                            })
                elif isinstance(data, dict) and data.get('Name'):
                    software_list.append({
                        'name': data.get('Name', 'Unknown'),
                        'version': data.get('Version', 'Unknown'),
                        'vendor': data.get('Vendor', 'Unknown'),
                        'install_date': data.get('InstallDate', None)
                    })
            except json.JSONDecodeError:
                print("Failed to parse software data from PowerShell")
        
        # Alternative method using registry (faster but less complete)
        if len(software_list) < 5:  # If WMI didn't work well, try registry
            try:
                cmd_reg = [
                    'powershell', '-Command',
                    """
                    $software = @()
                    $paths = @(
                        'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
                        'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
                    )
                    foreach ($path in $paths) {
                        Get-ItemProperty $path | Where-Object {$_.DisplayName} | Select-Object DisplayName, DisplayVersion, Publisher | ForEach-Object {
                            $software += @{
                                Name = $_.DisplayName
                                Version = $_.DisplayVersion
                                Vendor = $_.Publisher
                            }
                        }
                    }
                    $software | ConvertTo-Json
                    """
                ]
                
                result_reg = subprocess.run(cmd_reg, capture_output=True, text=True, timeout=30)
                
                if result_reg.returncode == 0 and result_reg.stdout.strip():
                    try:
                        reg_data = json.loads(result_reg.stdout)
                        if isinstance(reg_data, list):
                            for item in reg_data:
                                if item.get('Name'):
                                    software_list.append({
                                        'name': item.get('Name', 'Unknown'),
                                        'version': item.get('Version', 'Unknown'),
                                        'vendor': item.get('Vendor', 'Unknown'),
                                        'install_date': None
                                    })
                        elif isinstance(reg_data, dict) and reg_data.get('Name'):
                            software_list.append({
                                'name': reg_data.get('Name', 'Unknown'),
                                'version': reg_data.get('Version', 'Unknown'),
                                'vendor': reg_data.get('Vendor', 'Unknown'),
                                'install_date': None
                            })
                    except json.JSONDecodeError:
                        print("Failed to parse registry software data")
            except Exception as e:
                print(f"Registry method failed: {e}")
        
        return software_list
        
    except Exception as e:
        print(f"Error getting Windows software: {e}")
        return []

def get_installed_software_linux():
    """Get installed software on Linux"""
    try:
        software_list = []
        
        # Try different package managers
        package_managers = [
            # Debian/Ubuntu (apt)
            {
                'cmd': ['dpkg', '-l'],
                'parser': 'dpkg'
            },
            # Red Hat/CentOS (rpm)
            {
                'cmd': ['rpm', '-qa'],
                'parser': 'rpm'
            },
            # Arch Linux (pacman)
            {
                'cmd': ['pacman', '-Q'],
                'parser': 'pacman'
            }
        ]
        
        for pm in package_managers:
            try:
                result = subprocess.run(pm['cmd'], capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    if pm['parser'] == 'dpkg':
                        lines = result.stdout.split('\n')
                        for line in lines:
                            if line.startswith('ii'):
                                parts = line.split()
                                if len(parts) >= 3:
                                    software_list.append({
                                        'name': parts[1],
                                        'version': parts[2],
                                        'vendor': 'Unknown',
                                        'install_date': None
                                    })
                    elif pm['parser'] == 'rpm':
                        lines = result.stdout.split('\n')
                        for line in lines:
                            if line.strip():
                                # Parse RPM format: name-version-release.arch
                                match = re.match(r'^(.+)-([^-]+)-([^-]+)\.(.+)$', line.strip())
                                if match:
                                    software_list.append({
                                        'name': match.group(1),
                                        'version': f"{match.group(2)}-{match.group(3)}",
                                        'vendor': 'Unknown',
                                        'install_date': None
                                    })
                    elif pm['parser'] == 'pacman':
                        lines = result.stdout.split('\n')
                        for line in lines:
                            if line.strip():
                                parts = line.split()
                                if len(parts) >= 2:
                                    software_list.append({
                                        'name': parts[0],
                                        'version': parts[1],
                                        'vendor': 'Unknown',
                                        'install_date': None
                                    })
                    break  # If one package manager works, use it
            except FileNotFoundError:
                continue  # Try next package manager
            except Exception as e:
                print(f"Error with {pm['parser']}: {e}")
                continue
        
        return software_list
        
    except Exception as e:
        print(f"Error getting Linux software: {e}")
        return []

def get_installed_software_macos():
    """Get installed software on macOS"""
    try:
        software_list = []
        
        # Get applications from /Applications
        try:
            result = subprocess.run(['ls', '/Applications'], capture_output=True, text=True)
            if result.returncode == 0:
                apps = result.stdout.split('\n')
                for app in apps:
                    if app.endswith('.app'):
                        app_name = app.replace('.app', '')
                        software_list.append({
                            'name': app_name,
                            'version': 'Unknown',
                            'vendor': 'Unknown',
                            'install_date': None
                        })
        except Exception as e:
            print(f"Error getting macOS applications: {e}")
        
        # Try to get more detailed info using system_profiler
        try:
            result = subprocess.run(
                ['system_profiler', 'SPApplicationsDataType', '-json'],
                capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                data = json.loads(result.stdout)
                if 'SPApplicationsDataType' in data:
                    for app in data['SPApplicationsDataType']:
                        software_list.append({
                            'name': app.get('_name', 'Unknown'),
                            'version': app.get('version', 'Unknown'),
                            'vendor': app.get('obtained_from', 'Unknown'),
                            'install_date': app.get('lastModified', None)
                        })
        except Exception as e:
            print(f"Error getting detailed macOS software info: {e}")
        
        return software_list
        
    except Exception as e:
        print(f"Error getting macOS software: {e}")
        return []

def detect_software():
    """Main function to detect installed software based on OS"""
    print("🔍 Detecting installed software...")
    
    try:
        system = platform.system().lower()
        
        if system == 'windows':
            software_list = get_installed_software_windows()
        elif system == 'linux':
            software_list = get_installed_software_linux()
        elif system == 'darwin':  # macOS
            software_list = get_installed_software_macos()
        else:
            print(f"Unsupported operating system: {system}")
            return []
        
        # Remove duplicates and sort
        seen = set()
        unique_software = []
        for software in software_list:
            key = (software['name'].lower(), software['version'])
            if key not in seen:
                seen.add(key)
                unique_software.append(software)
        
        unique_software.sort(key=lambda x: x['name'].lower())
        
        print(f"✅ Software detection completed - Found {len(unique_software)} applications")
        return unique_software
        
    except Exception as e:
        print(f"❌ Error detecting software: {e}")
        return []

def get_software_summary(software_list):
    """Get a summary of detected software"""
    if not software_list:
        return {
            'total_count': 0,
            'by_vendor': {},
            'recent_installs': []
        }
    
    # Count by vendor
    vendor_count = {}
    for software in software_list:
        vendor = software.get('vendor', 'Unknown')
        vendor_count[vendor] = vendor_count.get(vendor, 0) + 1
    
    # Get software with known install dates (recent)
    recent_installs = []
    for software in software_list:
        if software.get('install_date'):
            recent_installs.append(software)
    
    recent_installs.sort(key=lambda x: x.get('install_date', ''), reverse=True)
    recent_installs = recent_installs[:10]  # Top 10 recent
    
    return {
        'total_count': len(software_list),
        'by_vendor': dict(sorted(vendor_count.items(), key=lambda x: x[1], reverse=True)[:10]),
        'recent_installs': recent_installs
    }

if __name__ == "__main__":
    # Test the software detection
    software = detect_software()
    summary = get_software_summary(software)
    
    print(f"\n📋 Software Detection Results:")
    print(f"   Total Applications: {summary['total_count']}")
    print(f"   Top Vendors: {list(summary['by_vendor'].keys())[:5]}")
    
    if software:
        print(f"\n🔍 Sample Applications:")
        for i, app in enumerate(software[:10]):
            print(f"   {i+1}. {app['name']} (v{app['version']}) - {app['vendor']}")
        
        if len(software) > 10:
            print(f"   ... and {len(software) - 10} more")
