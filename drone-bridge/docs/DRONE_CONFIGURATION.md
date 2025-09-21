# Dynamic Drone Fleet Configuration

This document explains how to configure the dynamic drone fleet system.

## Environment Variables

### Drone Fleet Settings
- `MAX_DRONES`: Maximum number of drones to support (default: 10)
- `DEFAULT_MODE`: Drone operation mode - `testing`, `production`, or `simulation` (default: testing)
- `DISPATCHER_MODE`: Fleet dispatcher mode - `parallel` or `sequential` (default: parallel)

### PX4/MAVSDK Configuration
- `PX4_HOST_IP`: PX4 host IP for SITL or real hardware (default: 172.17.176.1)
- `PX4_BASE_PORT`: Base port for PX4 instances (default: 14540)
- `CUSTOM_DRONES`: Custom drone configuration (optional)

### Drone Bridge HTTP Servers
- `BRIDGE_HTTP_PORT_BASE`: Base port for drone bridge HTTP servers (default: 8001)
- `BRIDGE_HTTP_PORT_RANGE`: Port range for dynamic allocation (default: 100)

### MAVSDK Server Ports
- `MAVSDK_SERVER_PORT_BASE`: Base port for MAVSDK servers (default: 50041)
- `MAVSDK_SERVER_PORT_RANGE`: Port range for dynamic allocation (default: 100)

### Backend API Configuration
- `FOOD_APP_HOST`: Food app backend host (default: 127.0.0.1)
- `FOOD_APP_PORT`: Food app backend port (default: 8000)

### Battery Management
- `BATTERY_MIN_PERCENT_TAKEOFF`: Minimum battery percentage for takeoff (default: 30.0)
- `RETURN_BATTERY_PERCENT_RTL`: Battery percentage to trigger RTL (default: 20.0)

### Flight Parameters
- `TAKEOFF_ALTITUDE`: Default takeoff altitude in meters (default: 20.0)
- `REACH_TOLERANCE_M`: Mission waypoint reach tolerance in meters (default: 2.0)
- `SIM_SPEED_M_S`: Simulation speed in m/s (default: 15.0)

### Weather & Safety
- `WEATHER_BLOCK_ENABLED`: Enable weather-based flight blocking (default: false)
- `WEATHER_CHECK_SECONDS`: Weather check interval in seconds (default: 600)
- `WIND_MAX_M_S`: Maximum wind speed in m/s (default: 10.0)
- `RAIN_MAX`: Maximum rain level (default: 0.7)

## Dynamic Port Allocation

The system automatically allocates ports for drones:

### Sequential Allocation (Default)
- PX4 Ports: 14540, 14541, 14542, 14543, 14544, ...
- HTTP Ports: 8001, 8002, 8003, 8004, 8005, ...
- MAVSDK Ports: 50041, 50042, 50043, 50044, 50045, ...

### Custom Configuration
Set `CUSTOM_DRONES` environment variable:
```bash
CUSTOM_DRONES="DRONE-001:14540,DRONE-002:14541,DRONE-003:14542"
```

## API Endpoints

### Fleet Discovery
- `GET /api/v1/test/drone/fleet/discover` - Discover available drones
- `GET /api/v1/test/drone/fleet/status` - Get fleet status

### Drone Commands
- `POST /api/v1/test/drone/command` - Send command to drone
  ```json
  {
    "droneId": "DRONE-001",
    "command": "takeoff",
    "parameters": { "altitude": 20 }
  }
  ```

### Supported Commands
- `takeoff` - Take off to specified altitude
- `land` - Land the drone
- `return_to_launch` - Return to launch position
- `emergency_stop` - Emergency stop (same as RTL)
- `get_status` - Get drone status
- `capture_photo` - Capture photo
- `get_weather` - Get weather information
- `get_battery` - Get battery status

## PowerShell Test Script

The test script now supports dynamic discovery:

```powershell
# Run the test script
.\scripts\test_drone_api.ps1

# The script will automatically:
# 1. Discover available drones
# 2. Show online/offline status
# 3. Allow command execution on available drones
```

## Frontend Integration

The frontend now includes a dynamic drone discovery service:

```javascript
import { droneDiscoveryService } from '../services/droneDiscoveryService';

// Start discovery
droneDiscoveryService.startDiscovery(10000); // Check every 10 seconds

// Get discovered drones
const drones = droneDiscoveryService.getDiscoveredDrones();

// Send command
await droneDiscoveryService.sendDroneCommand('DRONE-001', 'takeoff', { altitude: 20 });
```

## Scaling the Fleet

To add more drones:

1. **Update MAX_DRONES**: Set `MAX_DRONES=20` to support up to 20 drones
2. **Configure PX4 instances**: Set up PX4 SITL instances on ports 14540-14559
3. **Start drone bridges**: The system will automatically discover and manage them
4. **Update frontend**: The discovery service will automatically find new drones

## Troubleshooting

### Drone Not Discovered
1. Check if drone bridge is running on expected port
2. Verify PX4 connection string
3. Check firewall settings
4. Review logs in `drone-bridge/logs/`

### Port Conflicts
1. Check if ports are already in use
2. Adjust `BRIDGE_HTTP_PORT_BASE` or `MAVSDK_SERVER_PORT_BASE`
3. Use custom drone configuration to avoid conflicts

### Backend Connection Issues
1. Verify `FOOD_APP_HOST` and `FOOD_APP_PORT`
2. Check if backend is running
3. Ensure discovery service is started
