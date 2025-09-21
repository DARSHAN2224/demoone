# 🚁 Dynamic Drone Bridge Configuration

This document explains how the drone bridge has been updated to remove all static/demo data and make everything configurable through environment variables.

## 🎯 What Changed

### Before (Static/Demo Data)
- Hardcoded Seattle coordinates (47.6414678, -122.1401649)
- Fixed battery values (100%, 12.6V, 25°C)
- Random weather simulation
- Fixed mission parameters
- Static telemetry values

### After (Dynamic Configuration)
- Environment-configurable home position
- Realistic battery simulation with activity-based drain
- Configurable weather patterns (realistic, random, static)
- Dynamic mission parameters
- Realistic telemetry based on actual drone state

## 🔧 Configuration Options

### 1. Drone Home Position
```bash
# Set your drone's home/launch position
DRONE_HOME_LAT=47.6414678
DRONE_HOME_LNG=-122.1401649
```

### 2. Initial Drone State
```bash
# Initial values when drone starts
DRONE_INITIAL_BATTERY=100.0
DRONE_INITIAL_VOLTAGE=12.6
DRONE_INITIAL_TEMP=25.0
```

### 3. Battery Simulation
```bash
# How battery behaves during simulation
DRONE_BATTERY_DRAIN_RATE=0.02      # Base drain rate per second
DRONE_BATTERY_CHARGE_RATE=0.2      # Charge rate per second
DRONE_BASE_TEMP=25.0               # Base temperature in Celsius
```

**Battery Behavior:**
- **Charging**: Voltage increases, current = 2.0A
- **Flying**: Drain based on speed and altitude
- **Idle**: Minimal drain (0.1x rate)
- **Temperature**: Varies with current draw and battery level

### 4. Mission Simulation
```bash
# Mission behavior parameters
DRONE_SIM_SPEED=15.0               # Simulation speed in m/s
DRONE_REACH_TOLERANCE=2.0          # Waypoint reach tolerance in meters
DRONE_ALT_ADJUST_RATE=0.1          # Altitude change rate
DRONE_SIM_INTERVAL=0.5             # Simulation update interval in seconds
DRONE_DEFAULT_ALTITUDE=30.0        # Default mission altitude
```

### 5. Weather Simulation
```bash
# Weather behavior (choose one)
WEATHER_PATTERN=realistic          # realistic, random, static
WEATHER_BASE_WIND=3.0              # Base wind speed in m/s
WEATHER_BASE_RAIN=0.1              # Base rain level (0-1)
WEATHER_CYCLE_TIME=3600.0          # Weather cycle time in seconds
```

**Weather Patterns:**
- **realistic**: Daily cycles with realistic wind/rain patterns
- **random**: Random values (original behavior)
- **static**: No changes, uses base values

### 6. MAVSDK Configuration
```bash
# MAVSDK connection parameters
MAVSDK_CONNECTION_TIMEOUT=10.0     # Connection timeout in seconds
DRONE_DEFAULT_TEMP=25.0            # Default temperature for PX4 drones
```

## 🚀 How to Use

### 1. Copy Environment Template
```bash
# From the main FoodApp directory
cp env.example .env
```

### 2. Customize Your Configuration
Edit `.env` file with your desired values:
```bash
# Example: Set home position to New York
DRONE_HOME_LAT=40.7128
DRONE_HOME_LNG=-74.0060

# Example: More aggressive battery drain
DRONE_BATTERY_DRAIN_RATE=0.05

# Example: Faster simulation
DRONE_SIM_SPEED=25.0
```

### 3. Run with Environment Variables
```bash
# From the main FoodApp directory, load environment and run drone bridge
source .env
cd drone-bridge
python start.py

# Or run with specific overrides
cd drone-bridge
DRONE_HOME_LAT=40.7128 DRONE_HOME_LNG=-74.0060 python start.py
```

## 📊 Realistic Simulation Features

### Battery Simulation
- **Activity-based drain**: Higher speed = more battery drain
- **Altitude penalty**: Flying higher uses more battery
- **Realistic voltage**: Decreases with usage, increases when charging
- **Temperature correlation**: Higher current = higher temperature
- **Low battery protection**: Temperature increases when battery is low

### Weather Simulation
- **Daily patterns**: Wind higher during day, lower at night
- **Rain cycles**: More likely in afternoon/evening
- **Realistic variation**: Gradual changes with some noise
- **Configurable patterns**: Choose between realistic, random, or static

### Mission Simulation
- **Configurable speeds**: Set your preferred simulation speed
- **Realistic movement**: Gradual altitude changes
- **Tolerance settings**: Adjustable waypoint reach tolerance
- **Dynamic parameters**: All mission parameters configurable

## 🔍 Monitoring Dynamic Values

### Check Current Configuration
```bash
# View current environment variables
env | grep DRONE_
env | grep WEATHER_
```

### Monitor Battery Behavior
The battery now shows realistic behavior:
- Voltage changes with usage
- Current varies with activity
- Temperature correlates with current draw
- Drain rate depends on speed and altitude

### Weather Monitoring
Weather now follows realistic patterns:
- Check weather status via drone commands
- Observe daily cycles over time
- Configure different patterns for testing

## 🛠️ Development Notes

### Adding New Dynamic Parameters
1. Add environment variable to `env.dynamic.example`
2. Read in the relevant service class
3. Use `os.getenv()` with sensible defaults
4. Update this documentation

### Testing Different Configurations
```bash
# Test with different weather patterns
WEATHER_PATTERN=static python start.py
WEATHER_PATTERN=random python start.py
WEATHER_PATTERN=realistic python start.py

# Test with different battery drain rates
DRONE_BATTERY_DRAIN_RATE=0.01 python start.py  # Slower drain
DRONE_BATTERY_DRAIN_RATE=0.05 python start.py  # Faster drain
```

## ✅ Benefits

1. **No More Static Data**: Everything is configurable
2. **Realistic Simulation**: Battery, weather, and mission behavior are realistic
3. **Environment Flexibility**: Easy to adapt to different locations and scenarios
4. **Testing Support**: Easy to test different configurations
5. **Production Ready**: Can be configured for real-world deployment

## 🎉 Result

The drone bridge now provides a fully dynamic, configurable simulation environment that can be easily adapted to different locations, scenarios, and testing requirements without any hardcoded values!
