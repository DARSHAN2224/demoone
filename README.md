# 🚁 FoodApp with Drone Delivery

## 🎯 Project Overview

**FoodApp with Drone Delivery** is a comprehensive food delivery application featuring real-time drone control, dual-mode operation (testing/simulation + production), and cross-platform integration between Ubuntu PX4 SITL and Windows drone bridge.

## 🌟 Key Features

- **🧪 Testing Mode**: Manual drone control, QR testing, simulation
- **🏭 Production Mode**: Fully automated delivery lifecycle
- **🎮 Manual Control**: Takeoff, land, RTL, emergency stop
- **🗺️ Mission Planning**: Waypoint-based delivery routes
- **📡 Real-time Telemetry**: Live GPS, battery, altitude, speed
- **📱 QR Code Integration**: Secure delivery verification
- **🌐 Web Dashboard**: Admin, Seller, and User interfaces

## 🏗️ System Architecture

```
PX4 SITL (Ubuntu) ←→ Drone Bridge (Windows) ←→ Food App Backend ←→ React Frontend
     ↓                    ↓                        ↓                    ↓
  MAVLink UDP        WebSocket/Socket.IO      REST API + Socket.IO   Real-time UI
```

## 📚 Documentation

### **Project Organization**
- **🏗️ [Project Structure](PROJECT_STRUCTURE.md)** - Complete project organization and file structure

### **Component-Specific Guides**
- **🍽️ [FoodApp Backend Guide](FoodBackend/README.md)** - Backend setup, API endpoints, database
- **🎨 [FoodApp Frontend Guide](FoodFrontend/README.md)** - React components, UI setup, testing
- **🚁 [Drone Bridge Guide](drone-bridge/README.md)** - PX4 integration, drone control, testing
- **🕹️ [Microsoft AirSim (AirSimNH)](AirSimNH/readme.md)** - Running the UE scene and configuring AirSim

### **Quick Start**
- **🚀 [Unified Documentation](UNIFIED_DRONE_DELIVERY_DOCUMENTATION.md)** - Complete system overview and setup

## 🚀 Quick Start

### **Prerequisites**
- **Ubuntu**: PX4 SITL environment
- **Windows**: Node.js, Python 3.8+, PowerShell
- **Network**: Cross-platform connectivity (172.17.x.x range)

### **Environment Setup**
```bash
# Set up environment configuration (choose your platform)
./setup-env.sh        # Linux/Mac
# OR
.\setup-env.ps1       # Windows PowerShell

# Edit .env file with your configuration
# See drone-bridge/DYNAMIC_CONFIGURATION.md for all options
```

### **Startup Sequence**
   ```bash
# 1. Ubuntu: Start PX4 SITL
make px4_sitl_default none_iris

# 2. Windows: Start Backend
cd FoodBackend && npm start

# 3. Windows: Start Drone Bridge
cd drone-bridge && python start.py

# 4. Windows: Start Frontend
cd FoodFrontend && npm run dev

# 5. Test Integration
cd drone-bridge && .\scripts\test_drone_api.ps1
```

## 🧪 Testing

### **Organized Testing Structure**
```
📁 FoodBackend/
├── 📁 scripts/          # Database setup, admin creation
├── 📁 tests/            # API, authentication, service tests
└── 📁 src/              # Main backend source code

📁 FoodFrontend/
├── 📁 scripts/          # Build, deployment, utility scripts
├── 📁 tests/            # Unit, component, E2E tests
└── 📁 src/              # Main frontend source code

📁 DroneBridge/
├── 📁 scripts/          # PowerShell testing, drone control
├── 📁 tests/            # Python tests, PX4 integration
└── 📁 src/              # Main drone bridge source code
```

### **Quick Testing Commands**
```bash
# Backend Testing
cd FoodBackend/scripts
node create-test-drone.js    # Create test drone
node create-admin.js         # Create admin user

cd FoodBackend/tests
node test-auth.js            # Test authentication
node test-email.js           # Test email service

# Frontend Testing
cd FoodFrontend
npm test                     # Run all tests
npm run test:unit           # Unit tests only

# Drone Bridge Testing
cd DroneBridge/scripts
.\test_drone_api.ps1        # PowerShell drone testing
```

## 🔧 Troubleshooting

For detailed troubleshooting, see the [Unified Documentation](UNIFIED_DRONE_DELIVERY_DOCUMENTATION.md) or component-specific guides.

## 🧰 Developer Environment (VS Code)

### Recommended `settings.json`
Create or edit `.vscode/settings.json` at the project root for a smoother DX:

```
{
  "files.eol": "\n",
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/.venv": true,
    "**/mavsdk-env": true,
    "**/node_modules": true,
    "**/dist": true
  },
  "python.defaultInterpreterPath": "${workspaceFolder}/drone-bridge/mavsdk-env/Scripts/python.exe",
  "python.analysis.extraPaths": [
    "${workspaceFolder}/drone-bridge"
  ],
  "eslint.workingDirectories": [
    { "mode": "auto" },
    "FoodFrontend",
    "FoodBackend"
  ]
}
```

### AirSim `settings.json`
AirSim reads configuration from `Documents/AirSim/settings.json` on Windows. Example for UDP MAVLink output to the drone bridge:

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
  "ClockSpeed": 1,
  "LocalHostIp": "127.0.0.1",
  "UdpMavLink": {
    "RemoteIpAddress": "172.17.176.1",
    "RemotePort": 14540,
    "LocalPort": 14550
  }
}
```

## 📞 Support

- **Backend Issues**: Check [FoodBackend/README.md](FoodBackend/README.md)
- **Frontend Issues**: Check [FoodFrontend/README.md](FoodFrontend/README.md)
- **Drone Issues**: Check [drone-bridge/README.md](drone-bridge/README.md)
- **System Issues**: Check [Unified Documentation](UNIFIED_DRONE_DELIVERY_DOCUMENTATION.md)

---

**🚁 Your unified drone delivery system is ready for development, testing, and production deployment! ✨**


