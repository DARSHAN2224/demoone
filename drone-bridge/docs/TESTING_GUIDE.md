# 🧪 Drone Bridge Testing Guide

This guide explains how to test the backend-drone bridge integration with comprehensive logging and error handling.

## 🚀 Quick Start

### 1. **Check Prerequisites**
```bash
# Check if backend is running
python check_backend.py

# Check if drone bridge is running
python start_with_logs.py
```

### 2. **Run Integration Tests**
```bash
# Comprehensive integration test
python test_integration.py

# Run the PowerShell test script
.\scripts\test_drone_api.ps1
```

## 📋 Testing Scripts

### **1. `check_backend.py`** - Quick Health Check
- ✅ Checks if backend is running on port 8000
- ✅ Checks if drone bridge is running on ports 8001/8002
- ✅ Shows overall system health status
- ✅ Provides clear next steps

**Usage:**
```bash
python check_backend.py
```

### **2. `test_integration.py`** - Comprehensive Integration Test
- ✅ Tests backend health endpoint
- ✅ Tests drone bridge health endpoints
- ✅ Tests backend-drone communication
- ✅ Tests drone command execution
- ✅ Tests weather service integration
- ✅ Tests battery service integration
- ✅ Saves results to JSON file

**Usage:**
```bash
python test_integration.py
```

### **3. `start_with_logs.py`** - Enhanced Drone Bridge Startup
- ✅ Enhanced logging with timestamps and emojis
- ✅ Backend connection monitoring
- ✅ Graceful shutdown handling (Ctrl+C)
- ✅ Error recovery and retry logic
- ✅ Health checks for all services

**Usage:**
```bash
python start_with_logs.py
```

### **4. `test_drone_api.ps1`** - PowerShell Test Script
- ✅ Interactive drone testing menu
- ✅ Command execution testing
- ✅ Status monitoring
- ✅ Weather and battery testing

**Usage:**
```powershell
.\scripts\test_drone_api.ps1
```

## 🔧 Enhanced Features

### **Error Handling from `droneapi_simple.py`**
- ✅ **Graceful Shutdown**: Proper Ctrl+C handling with `os._exit(0)`
- ✅ **Signal Handlers**: SIGINT and SIGTERM support
- ✅ **Global Shutdown Flag**: `shutdown_requested` for clean exits
- ✅ **Thread-based Force Exit**: Immediate termination when needed

### **Comprehensive Logging**
- ✅ **Timestamps**: Millisecond precision timestamps
- ✅ **Emojis**: Visual indicators for different log levels
- ✅ **Backend Monitoring**: Periodic backend connection checks
- ✅ **Service Status**: Real-time service health monitoring
- ✅ **Error Recovery**: Automatic retry logic with delays

### **Backend Integration**
- ✅ **Health Checks**: Regular backend connectivity tests
- ✅ **Connection Monitoring**: Real-time backend status
- ✅ **Offline Mode**: Continue operation when backend is unavailable
- ✅ **Service Dependencies**: Proper service initialization order

## 🎯 Testing Workflow

### **Step 1: Start Services**
```bash
# Terminal 1: Start Backend
cd FoodBackend
npm run dev

# Terminal 2: Start Drone Bridge
cd drone-bridge
python start_with_logs.py

# Terminal 3: Start PX4 SITL (Optional)
# In WSL2:
cd ~/PX4/Scripts
./run_airsim_sitl.sh 0
```

### **Step 2: Verify Health**
```bash
# Quick health check
python check_backend.py

# Comprehensive integration test
python test_integration.py
```

### **Step 3: Run Tests**
```powershell
# Interactive testing
.\scripts\test_drone_api.ps1
```

## 📊 Expected Output

### **Healthy System:**
```
[14:30:15.123] ✅ Backend: HEALTHY
[14:30:15.456] ✅ DRONE-001: HEALTHY
[14:30:15.789] ✅ DRONE-002: HEALTHY
[14:30:16.012] 🎉 All systems are healthy! Ready for testing.
```

### **Backend Issues:**
```
[14:30:15.123] ❌ Backend: NOT RUNNING
[14:30:15.456] ⚠️ Backend not available, continuing in offline mode
```

### **Drone Bridge Issues:**
```
[14:30:15.123] ✅ Backend: HEALTHY
[14:30:15.456] ❌ DRONE-001: Not accessible - Connection refused
[14:30:15.789] ⚠️ No healthy drones found
```

## 🛠️ Troubleshooting

### **Backend Not Running:**
1. Check if port 8000 is available
2. Start backend: `cd FoodBackend && npm run dev`
3. Check backend logs for errors

### **Drone Bridge Not Running:**
1. Check if ports 8001/8002 are available
2. Start drone bridge: `python start_with_logs.py`
3. Check drone bridge logs for errors

### **PX4 Connection Issues:**
1. Ensure PX4 SITL is running in WSL2
2. Check IP address in config.py
3. Verify MAVSDK connection URL

### **Ctrl+C Not Working:**
1. Use `start_with_logs.py` (has enhanced signal handling)
2. Force kill: `taskkill /f /im python.exe`
3. Check for background processes

## 📁 File Structure

```
drone-bridge/
├── start.py                 # Enhanced with logging & error handling
├── start_with_logs.py       # Enhanced startup script
├── check_backend.py         # Quick health check
├── test_integration.py      # Comprehensive integration test
├── droneapi_simple.py       # Working error handling reference
├── scripts/
│   └── test_drone_api.ps1   # PowerShell test script
└── TESTING_GUIDE.md         # This guide
```

## 🎉 Success Indicators

- ✅ All services show "HEALTHY" status
- ✅ Backend-drone communication works
- ✅ Commands execute successfully
- ✅ Weather and battery services respond
- ✅ Ctrl+C shuts down gracefully
- ✅ Logs show clear status updates

## 🚨 Common Issues

1. **Port Conflicts**: Check if ports 8000, 8001, 8002 are available
2. **Import Errors**: Ensure all dependencies are installed
3. **Connection Timeouts**: Check network connectivity
4. **Permission Issues**: Run as administrator if needed
5. **Python Path Issues**: Use absolute imports in start.py

---

**Ready to test? Start with `python check_backend.py` to verify your setup!** 🚀
