# Simple Agent Configuration
import os
import platform

# Server Configuration
SERVER_URL = os.getenv('SERVER_URL', 'http://localhost:3000')
API_ENDPOINTS = {
    'register': f'{SERVER_URL}/api/assets/register',
    'telemetry': f'{SERVER_URL}/api/telemetry'
}

# Collection Settings
TELEMETRY_INTERVAL = 300  # 5 minutes
DISCOVERY_INTERVAL = 3600  # 1 hour in seconds

# Asset ID Generation
HOSTNAME = platform.node()
ASSET_ID_PREFIX = 'AST'

# Agent Settings
AGENT_VERSION = '1.0.0'
DEBUG = True

print(f"🔧 Agent Configuration:")
print(f"   Server URL: {SERVER_URL}")
print(f"   Hostname: {HOSTNAME}")
print(f"   Telemetry Interval: {TELEMETRY_INTERVAL}s")
print(f"   Discovery Interval: {DISCOVERY_INTERVAL}s")

