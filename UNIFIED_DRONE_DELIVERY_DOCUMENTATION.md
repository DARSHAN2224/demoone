# 🚁 Unified Drone Delivery System Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Quick Start Guide](#quick-start-guide)
4. [First Time Setup](#first-time-setup)
5. [Drone Bridge Integration](#drone-bridge-integration)
6. [PX4 SITL Integration](#px4-sitl-integration)
7. [Testing & Development](#testing--development)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)
11. [Quick Reference Commands](#quick-reference-commands)

---

## 🎯 Project Overview

**FoodApp with Drone Delivery** is a comprehensive food delivery application featuring:
- **Dual-Mode Operation**: Testing/Simulation + Production Automation
- **Real-time Drone Control**: Manual testing and automated delivery
- **Cross-Platform Integration**: Ubuntu PX4 SITL ↔ Windows Drone Bridge
- **QGroundControl-Style Dashboard**: Live tracking, telemetry, mission planning
- **Full Food Delivery Workflow**: Order → Kitchen → Drone → Customer

### 🌟 Key Features
- **🧪 Testing Mode**: Manual drone control, QR testing, simulation
- **🏭 Production Mode**: Fully automated delivery lifecycle
- **🎮 Manual Control**: Takeoff, land, RTL, emergency stop
- **🗺️ Mission Planning**: Waypoint-based delivery routes
- **📡 Real-time Telemetry**: Live GPS, battery, altitude, speed
- **📱 QR Code Integration**: Secure delivery verification
- **🌐 Web Dashboard**: Admin, Seller, and User interfaces

---

## 🏗️ System Architecture

### **Frontend (React + Vite)**
```
FoodFrontend/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin drone testing & management
│   │   ├── seller/         # Seller drone testing
│   │   ├── user/           # User drone testing
│   │   └── ui/             # Reusable UI components
│   ├── services/           # Drone automation & management
│   ├── stores/             # Zustand state management
│   └── hooks/              # Custom React hooks
```

### **Backend (Node.js + Express)**
```
FoodBackend/
├── src/
│   ├── controllers/        # Business logic
│   ├── routes/            # API endpoints
│   ├── services/          # Drone telemetry & automation
│   └── middlewares/       # Authentication & validation
```

### **Drone Bridge (Python)**
```
drone-bridge/
├── drone/                     # Core modules (bridge, mavsdk, mission)
├── config/                    # Configuration and requirements
├── scripts/                   # Test scripts (PowerShell)
├── start.py                   # Launcher
└── README.md                  # Documentation
```

### **Communication Flow**
```
PX4 SITL (Ubuntu) ←→ Drone Bridge (Windows) ←→ Food App Backend ←→ React Frontend
     ↓                    ↓                        ↓                    ↓
  MAVLink UDP        WebSocket/Socket.IO      REST API + Socket.IO   Real-time UI
```

---

## 🚀 Quick Start Guide

### **Prerequisites**
- **Ubuntu**: PX4 SITL environment
- **Windows**: Node.js, Python 3.8+, PowerShell
- **Network**: Cross-platform connectivity (172.17.x.x range)

### **1. Start PX4 SITL (Ubuntu)**
```bash
cd ~/PX4-Autopilot
make px4_sitl_default none_iris

# Configure MAVLink for cross-platform stability
pxh> mavlink stop-all
pxh> mavlink start -u 14550 -o 14540 -t 172.17.176.1 -p -r 1000000
pxh> mavlink stream -u 14550 -s GLOBAL_POSITION_INT -r 10
pxh> mavlink stream -u 14550 -s ATTITUDE -r 10
pxh> mavlink stream -u 14550 -s VFR_HUD -r 5
pxh> mavlink stream -u 14550 -s BATTERY_STATUS -r 1
pxh> param set MAV_1_BROADCAST 1
pxh> param set MAV_1_RATE 1000000
pxh> param set MAV_1_MODE 2
pxh> param set MAV_1_FORWARD 1
```

### **2. Start Food App Backend (Windows)**
```cmd
cd FoodBackend
npm install
npm start
# Backend runs on port 8000
```

### **3. Start Drone Bridge (Windows)**
```cmd
cd drone-bridge
pip install -r config/requirements.txt
python start.py
# Enhanced drone bridge with health monitoring and multi-drone support
```

### **4. Start Frontend (Windows)**
```cmd
cd FoodFrontend
npm install
npm run dev
# Frontend accessible at localhost:5173
```

### **5. Test Drone Integration**
```powershell
cd drone-bridge
.\scripts\test_drone_api.ps1
# Choose option 8 for full test sequence
```

---

## ⚙️ First Time Setup

### **Environment Setup**
1. **Clone Repository**
   ```bash
   git clone <your-repo-url>
   cd FoodApp
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd FoodBackend
   npm install
   
   # Frontend
   cd ../FoodFrontend
   npm install
   
   # Drone Bridge
   cd ../drone-bridge
   pip install -r config/requirements.txt
   ```

3. **Environment Configuration**
   ```bash
   # Copy and configure environment files
   cp env.example .env
   cp FoodBackend/.env.example FoodBackend/.env
   ```

### **Database Setup**
```bash
cd FoodBackend
node check-db.js
node create-admin.js
```

### **Email Configuration**
```bash
cd FoodBackend
node test-email.js
# Configure SMTP settings in .env
```

---

## 🚁 Drone Bridge Integration

### **Dual-Mode Operation**

#### **Testing Mode**
- ✅ **Manual Control**: Takeoff, land, RTL, emergency stop
- ✅ **QR Testing**: Generate and scan test QR codes
- ✅ **Map Testing**: Interactive waypoint placement
- ✅ **Simulation**: Fallback when PX4 connection fails
- ✅ **Safe for Development**: No real drone hardware

#### **Production Mode**
- 🚨 **Real Hardware Only**: No simulation fallback
- 🚨 **Safety Protocols**: Emergency stop, failsafe modes
- 🚨 **Automated Workflow**: Complete delivery lifecycle
- 🚨 **Real-time Monitoring**: Live telemetry and status

### **Cross-Platform Communication**

#### **Network Configuration**
```
Ubuntu (PX4 SITL): 172.17.187.151
Windows (Drone Bridge): 172.17.176.1
MAVLink Ports: 14550 (outgoing) → 14540 (incoming)
Protocol: UDP MAVLink → WebSocket → Socket.IO
```

#### **Connection Flow**
1. **PX4 SITL** broadcasts MAVLink telemetry on port 14550
2. **Drone Bridge** receives on port 14540 via UDP
3. **Drone Bridge** forwards to Food App via WebSocket
4. **Backend** broadcasts to frontend via Socket.IO
5. **Frontend** displays real-time drone data

### **Drone Bridge Features**
- **Real-time Telemetry**: GPS, battery, altitude, speed, heading
- **Command Execution**: Takeoff, land, RTL, emergency stop
- **Mission Management**: Waypoint-based delivery routes
- **Connection Monitoring**: Automatic fallback to simulation
- **Cross-Platform Stability**: Optimized for Ubuntu→Windows

---

## 🎮 PX4 SITL Integration

### **MAVLink Configuration**
```bash
# Essential streams for drone control
pxh> mavlink stream -u 14550 -s GLOBAL_POSITION_INT -r 10
pxh> mavlink stream -u 14550 -s ATTITUDE -r 10
pxh> mavlink stream -u 14550 -s VFR_HUD -r 5
pxh> mavlink stream -u 14550 -s BATTERY_STATUS -r 1
pxh> mavlink stream -u 14550 -s COMMAND_LONG -r 1
pxh> mavlink stream -u 14550 -s HEARTBEAT -r 1
```

### **Network Optimization**
```bash
# Cross-platform stability parameters
pxh> param set MAV_1_BROADCAST 1
pxh> param set MAV_1_RATE 1000000
pxh> param set MAV_1_MODE 2
pxh> param set MAV_1_FORWARD 1
pxh> param set MAV_1_FLOW_CONTROL 1
pxh> param set MAV_1_BUFFER_SIZE 1000
```

### **Expected Output**
```
INFO  [mavlink] mode: Normal, data rate: 1000000 B/s on udp port 14550 remote port 14540
INFO  [mavlink] using network interface eth0, IP: 172.17.187.151
INFO  [commander] Ready for takeoff!
# NO "Connection to ground station lost" messages
```

---

## 🧪 Testing & Development

### **Testing Tools**

#### **PowerShell Testing Script**
```powershell
cd drone-bridge
.\scripts\test_drone_api.ps1

# Available Tests:
# 1. Backend Connection
# 2. Takeoff (Watch UE drone lift off!)
# 3. Land (Watch UE drone descend!)
# 4. Return to Launch
# 5. Emergency Stop
# 6. Mission Start
# 7. Drone Status
# 8. Full Test Sequence
```

#### **Manual Testing via Frontend**
1. **Admin Testing**: `/admin/drone-testing`
2. **Seller Testing**: `/seller/drone-testing`
3. **User Testing**: `/user/drone-testing`
4. **Mission Planning**: `/admin/mission-planning`
5. **QGroundControl Dashboard**: `/admin/qgroundcontrol`

### **Development Workflow**
1. **Start PX4 SITL** in Ubuntu
2. **Start Backend** in Windows Terminal 1
3. **Start Drone Bridge** in Windows Terminal 2
4. **Start Frontend** in Windows Terminal 3
5. **Test Commands** via PowerShell script
6. **Watch Unreal Engine** for drone movements
7. **Debug Issues** using browser console and terminal logs

### **Testing Scenarios**
- **Connection Test**: Verify PX4 ↔ Drone Bridge ↔ Backend
- **Command Test**: Takeoff, land, RTL, emergency stop
- **Mission Test**: Waypoint-based delivery simulation
- **Integration Test**: Full food delivery workflow
- **Fallback Test**: Disconnect PX4, verify simulation mode

---

## 🚀 Production Deployment

### **Production Checklist**
- [ ] **Real Drone Hardware** configured and tested
- [ ] **Safety Protocols** implemented and verified
- [ ] **Emergency Procedures** documented and trained
- [ ] **Network Security** hardened and monitored
- [ ] **Backup Systems** in place and tested
- [ ] **Monitoring & Alerting** configured
- [ ] **Compliance** with local drone regulations

### **Production Mode Configuration**
```python
# In drone_bridge_dual_mode.py
drone_bridge = DroneBridge(
    drone_id="PROD-DRONE-001",
    mode=DroneMode.PRODUCTION  # No simulation fallback
)
```

### **Safety Features**
- **Emergency Stop**: Immediate halt of all drone operations
- **Return to Launch**: Automatic return on connection loss
- **Geofencing**: Prevent drones from leaving safe zones
- **Battery Monitoring**: Automatic landing on low battery
- **Weather Monitoring**: Ground drones in unsafe conditions

---

## 🔧 Troubleshooting

### **Common Issues & Solutions**

#### **1. PX4 Connection Lost**
```bash
# Symptoms: "Connection to ground station lost"
# Solution: Optimize MAVLink configuration
pxh> mavlink stop-all
pxh> mavlink start -u 14550 -o 14540 -t 172.17.176.1 -p -r 1000000 -f 1
pxh> param set MAV_1_FLOW_CONTROL 1
pxh> param set MAV_1_BUFFER_SIZE 1000
```

#### **2. Drone Bridge Connection Failed**
```bash
# Check network connectivity
ping 172.17.176.1
nc -u 172.17.176.1 14540

# Verify PX4 is running and ready
# Look for "Ready for takeoff!" message
```

#### **3. Backend Connection Failed**
```bash
# Check if backend is running on port 8000
netstat -an | findstr 8000

# Verify firewall settings
netsh advfirewall firewall show rule name=all | findstr 8000
```

#### **4. Frontend Not Loading**
```bash
# Check if frontend is running on port 5173
netstat -an | findstr 5173

# Verify all dependencies installed
npm install
```

### **Debug Commands**

#### **Ubuntu PX4 Debug**
```bash
pxh> mavlink status
pxh> param show MAV_*
pxh> dmesg | grep mavlink
ping 172.17.176.1
nc -u 172.17.176.1 14540
```

#### **Windows Debug**
```cmd
netstat -an | findstr 14540
netstat -an | findstr 8000
netstat -an | findstr 5173
ping 172.17.176.1
```

#### **Cross-Platform Test**
```bash
# Ubuntu: Test UDP communication
nc -u 172.17.176.1 14540

# Windows: Test UDP listening
netcat -u -l -p 14540
```

---

## 📚 API Reference

### **Drone Control Endpoints**

#### **Takeoff**
```http
POST /api/v1/drone/launch/{droneId}
Content-Type: application/json

{
  "altitude": 20
}
```

#### **Land**
```http
POST /api/v1/drone/land/{droneId}
```

#### **Return to Launch**
```http
POST /api/v1/drone/rtl/{droneId}
```

#### **Emergency Stop**
```http
POST /api/v1/drone/emergency/{droneId}
```

#### **Start Mission**
```http
POST /api/v1/drone/mission/start/{droneId}
Content-Type: application/json

{
  "mission_id": "mission_001",
  "waypoints": [
    {"lat": 47.6414678, "lng": -122.1401649, "alt": 30},
    {"lat": 47.6415678, "lng": -122.1402649, "alt": 35}
  ]
}
```

#### **Get Drone Status**
```http
GET /api/v1/drone/status/{droneId}
```

### **Socket.IO Events**

#### **Drone Telemetry**
```javascript
// Listen for real-time drone data
socket.on('drone:telemetry', (data) => {
  console.log('Drone telemetry:', data);
  // data: {drone_id, lat, lng, alt, battery, speed, heading, status}
});
```

#### **Drone Commands**
```javascript
// Send commands to drone
socket.emit('drone:command', {
  drone_id: 'DRONE-001',
  command: 'takeoff',
  parameters: { altitude: 20 }
});
```

---

## 📋 Quick Reference Commands

### **Startup Sequence**
```bash
# 1. Ubuntu: Start PX4 SITL
make px4_sitl_default none_iris

# 2. Windows: Start Backend
cd FoodBackend && npm start

# 3. Windows: Start Drone Bridge
cd DroneBridge && python start.py

# 4. Windows: Start Frontend
cd FoodFrontend && npm run dev

# 5. Test Integration
cd DroneBridge && .\test_drone_api.ps1
```

### **PX4 MAVLink Commands**
```bash
# Stop all MAVLink instances
pxh> mavlink stop-all

# Start with optimized settings
pxh> mavlink start -u 14550 -o 14540 -t 172.17.176.1 -p -r 1000000

# Enable essential streams
pxh> mavlink stream -u 14550 -s GLOBAL_POSITION_INT -r 10
pxh> mavlink stream -u 14550 -s ATTITUDE -r 10
pxh> mavlink stream -u 14550 -s VFR_HUD -r 5

# Set stability parameters
pxh> param set MAV_1_BROADCAST 1
pxh> param set MAV_1_RATE 1000000
pxh> param set MAV_1_MODE 2
```

### **Testing Commands**
```powershell
# Test backend connection
.\test_drone_api.ps1
# Choose option 1

# Test full drone sequence
.\test_drone_api.ps1
# Choose option 8

# Test individual commands
.\test_drone_api.ps1
# Choose options 2-7
```

### **Network Diagnostics**
```cmd
# Check Windows ports
netstat -an | findstr 14540
netstat -an | findstr 8000
netstat -an | findstr 5173

# Test connectivity
ping 172.17.176.1
telnet 172.17.176.1 14540
```

---

## 🎯 Success Indicators

### **✅ System Running Correctly**
- **PX4 SITL**: No "Connection to ground station lost" messages
- **Drone Bridge**: Connected to PX4 and backend
- **Backend**: Running on port 8000 with Socket.IO active
- **Frontend**: Accessible at localhost:5173
- **Integration**: Drone commands working, telemetry flowing

### **✅ Testing Successful**
- **Takeoff**: Drone lifts off to specified altitude
- **Landing**: Drone descends and lands smoothly
- **Mission**: Drone follows waypoint path
- **Fallback**: Simulation mode activates when PX4 disconnected
- **Real-time**: Live telemetry updates in frontend

### **✅ Production Ready**
- **Safety**: Emergency procedures tested and working
- **Reliability**: Stable connections under load
- **Monitoring**: Real-time status and alerting
- **Compliance**: Meets regulatory requirements
- **Documentation**: Complete operational procedures

---

## 📞 Support & Maintenance

### **Regular Maintenance**
- **Daily**: Check system status and logs
- **Weekly**: Test emergency procedures
- **Monthly**: Update software and dependencies
- **Quarterly**: Full system testing and validation

### **Monitoring & Alerting**
- **System Health**: Backend, drone bridge, PX4 status
- **Network Connectivity**: Cross-platform communication
- **Drone Status**: Battery, GPS signal, connection quality
- **Performance Metrics**: Response times, throughput

### **Documentation Updates**
- **API Changes**: Update endpoint documentation
- **Configuration Changes**: Update setup guides
- **Troubleshooting**: Add new solutions and workarounds
- **Best Practices**: Incorporate lessons learned

---

**🚁 Your unified drone delivery system is now fully documented and ready for development, testing, and production deployment! ✨**

**For questions or issues, refer to the troubleshooting section or check the system logs for detailed error information.**
