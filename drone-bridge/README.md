# 🚁 Drone Bridge - Reorganized Structure

This is the drone bridge component of the FoodApp drone delivery system. The codebase has been reorganized for better maintainability and clarity.

## 📁 Directory Structure

```
drone-bridge/
├── 📁 config/                    # Configuration files
│   ├── config.py                 # Main configuration settings
│   └── requirements.txt          # Python dependencies
├── 📁 docs/                      # Documentation
│   ├── DRONE_CONFIGURATION.md    # Drone configuration guide
│   ├── DYNAMIC_CONFIGURATION.md  # Dynamic configuration options
│   └── TESTING_GUIDE.md          # Testing procedures
├── 📁 tests/                     # Test files
│   ├── check_backend.py          # Backend connectivity test
│   ├── test_camera_views.py      # Camera view tests
│   ├── test_integration.py       # Integration tests
│   ├── test_qr_display.py        # QR code tests
│   └── test_shared_airsim.py     # AirSim connection tests
├── 📁 scripts/                   # Utility scripts
│   └── test_drone_api.ps1        # PowerShell test script
├── 📁 external/                  # External dependencies
│   └── AirSim/                   # AirSim simulator files
├── 📁 drone/                     # Core drone functionality
│   ├── bridge.py                 # Main drone bridge
│   ├── state_store.py            # State management
│   ├── mavsdk_client.py          # MAVSDK communication
│   ├── mission_manager.py        # Mission handling
│   ├── communication/            # Communication modules
│   └── services/                 # Drone services
├── 📁 common/                    # Shared types and utilities
├── 📁 utils/                     # Utility functions
├── 📁 captures/                  # Photo captures
├── 📁 logs/                      # Log files
├── 📁 mavsdk-env/                # MAVSDK Python environment
└── start.py                      # Main entry point
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- MAVSDK Python package
- AirSim (for simulation, optional but recommended)
- PX4 SITL (for MAVLink telemetry and command loop)

### Installation
1. **Set up environment** (from main FoodApp directory):
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Install dependencies**:
   ```bash
   cd drone-bridge
   pip install -r config/requirements.txt
   ```

3. **Run the drone bridge**:
   ```bash
   python start.py
   ```

## ⚙️ Configuration

All configuration is now centralized in the main FoodApp `.env` file. Key settings include:

- **Drone Home Position**: `DRONE_HOME_LAT`, `DRONE_HOME_LNG`
- **Battery Simulation**: `DRONE_BATTERY_DRAIN_RATE`, `DRONE_BATTERY_CHARGE_RATE`
- **Weather Simulation**: `WEATHER_PATTERN`, `WEATHER_BASE_WIND`
- **Mission Parameters**: `DRONE_SIM_SPEED`, `DRONE_REACH_TOLERANCE`

See `docs/DYNAMIC_CONFIGURATION.md` for complete configuration options.

### AirSim `settings.json`
AirSim requires a configuration file at `Documents/AirSim/settings.json` on Windows. Example to send MAVLink UDP to the bridge:

```
{
  "SettingsVersion": 1.2,
  "SimMode": "Multirotor",
  "Vehicles": {
    "Drone1": {
      "VehicleType": "SimpleFlight",
      "AutoCreate": true
    }
  },
  "UdpMavLink": {
    "RemoteIpAddress": "172.17.176.1",
    "RemotePort": 14540,
    "LocalPort": 14550
  }
}
```

If you use PX4 SITL on Ubuntu, ensure PX4 streams to Windows on UDP 14540 and the bridge listens accordingly.

## 🧪 Testing

Run tests from the `tests/` directory:

```bash
# Integration tests
python tests/test_integration.py

# Camera tests
python tests/test_camera_views.py

# QR code tests
python tests/test_qr_display.py

# Backend connectivity
python tests/check_backend.py
```

## 📚 Documentation

- **`docs/DYNAMIC_CONFIGURATION.md`** - Complete configuration guide
- **`docs/DRONE_CONFIGURATION.md`** - Drone setup and configuration
- **`docs/TESTING_GUIDE.md`** - Testing procedures and examples

## 🔧 Development

### Adding New Features
1. Add new services to `drone/services/`
2. Update configuration in `config/config.py`
3. Add tests to `tests/`
4. Update documentation in `docs/`

### Code Organization
- **Core Logic**: `drone/` directory
- **Configuration**: `config/` directory
- **Tests**: `tests/` directory
- **Documentation**: `docs/` directory
- **External Dependencies**: `external/` directory

### VS Code Settings
For a smoother DX, consider adding a workspace `.vscode/settings.json` (see project root README) and set Python to the virtual env in `mavsdk-env`.

## 🌟 Key Features

- **Dynamic Configuration**: All settings configurable via environment variables
- **Realistic Simulation**: Battery, weather, and mission simulation
- **Modular Design**: Clean separation of concerns
- **Comprehensive Testing**: Full test suite included
- **Cross-Platform**: Works on Windows, Linux, and Mac

## 🔗 Integration

The drone bridge integrates with:
- **FoodApp Backend**: HTTP API communication
- **PX4 SITL**: Real drone simulation
- **AirSim**: Visual simulation environment
- **MAVSDK**: Drone communication protocol

#### PX4 UDP Configuration (Ubuntu)
From PX4 `pxh>`:

```
mavlink stop-all
mavlink start -u 14550 -o 14540 -t 172.17.176.1 -p -r 1000000
mavlink stream -u 14550 -s GLOBAL_POSITION_INT -r 10
mavlink stream -u 14550 -s ATTITUDE -r 10
mavlink stream -u 14550 -s VFR_HUD -r 5
param set MAV_1_BROADCAST 1
param set MAV_1_FORWARD 1
```

## 📝 Logs

Logs are stored in the `logs/` directory:
- `bridge.log` - Main bridge operations
- `mavsdk.log` - MAVSDK communication
- `weather.log` - Weather service
- `mission.log` - Mission management
- `camera.log` - Camera operations

## 🎯 Benefits of Reorganization

1. **Cleaner Structure**: Logical grouping of related files
2. **Better Maintainability**: Easier to find and modify code
3. **Improved Testing**: Dedicated test directory
4. **Enhanced Documentation**: Centralized docs folder
5. **Simplified Configuration**: Single config location
6. **External Dependencies**: Isolated external code

---

For the complete system overview, see the main [FoodApp README](../README.md).
