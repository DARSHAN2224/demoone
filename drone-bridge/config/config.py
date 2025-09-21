# config.py
import os
import logging
import logging.config
from enum import Enum

# --- Advanced Logging Setup ---
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '[%(asctime)s] [%(name)-12s] [%(levelname)-8s] %(message)s',
            'datefmt': '%H:%M:%S',
        },
    },
    'handlers': {
        'default': {
            'level': 'INFO',
            'formatter': 'standard',
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        '': { 'handlers': ['default'], 'level': 'INFO', 'propagate': True },
        'mavsdk': { 'level': 'INFO', 'propagate': False, 'handlers': ['default'] },
        'ws_client': { 'level': 'WARNING', 'propagate': False, 'handlers': ['default'] },
        'weather': { 'level': 'WARNING', 'propagate': False, 'handlers': ['default'] },
    }
}

# --- Drone Operation Mode ---
class DroneMode(str, Enum):
    TESTING = "testing"
    PRODUCTION = "production"
    SIMULATION = "simulation"

# --- PX4 / MAVSDK Configuration ---
PX4_HOST_IP = os.getenv("PX4_HOST_IP", "172.17.176.1")
PX4_BASE_PORT = int(os.getenv("PX4_BASE_PORT", 14540))
MAX_DRONES = int(os.getenv("MAX_DRONES", 10))  # Increased default to 10

def discover_px4_instances():
    """Dynamically discover PX4 instances based on environment configuration"""
    instances = {}
    max_drones = MAX_DRONES
    
    # Check for custom drone configuration
    custom_drones = os.getenv("CUSTOM_DRONES", "")
    if custom_drones:
        try:
            # Parse custom drone configuration: "DRONE-001:14540,DRONE-002:14541"
            for drone_config in custom_drones.split(","):
                if ":" in drone_config:
                    drone_name, port = drone_config.strip().split(":")
                    addr = f"udpin://{PX4_HOST_IP}:{int(port)}"
                    instances[drone_name] = addr
            return instances
        except Exception as e:
            print(f"Warning: Failed to parse CUSTOM_DRONES: {e}")
    
    # Default sequential discovery
    for i in range(max_drones):
        port = PX4_BASE_PORT + i
        addr = f"udpin://{PX4_HOST_IP}:{port}"
        drone_name = f"DRONE-{str(i+1).zfill(3)}"
        instances[drone_name] = addr
    return instances

# --- Fleet Configuration ---
DRONES = discover_px4_instances()
DEFAULT_MODE = DroneMode.TESTING
DISPATCHER_MODE = os.getenv("DISPATCHER_MODE", "parallel")

# --- Backend API (Node.js) Configuration ---
FOOD_APP_HOST = os.getenv("FOOD_APP_HOST", "127.0.0.1")
FOOD_APP_PORT = int(os.getenv("FOOD_APP_PORT", 8000))
FOOD_APP_WS_URL = f"ws://{FOOD_APP_HOST}:{FOOD_APP_PORT}/socket.io/?EIO=4&transport=websocket"

# --- Local Drone Bridge HTTP Server ---
BRIDGE_HTTP_HOST = os.getenv("BRIDGE_HTTP_HOST", "127.0.0.1")
BRIDGE_HTTP_PORT_BASE = int(os.getenv("BRIDGE_HTTP_PORT_BASE", 8001))
BRIDGE_HTTP_PORT_RANGE = int(os.getenv("BRIDGE_HTTP_PORT_RANGE", 100))  # Port range for dynamic allocation

# --- MAVSDK Server Ports (for isolating drone instances) ---
MAVSDK_SERVER_PORT_BASE = int(os.getenv("MAVSDK_SERVER_PORT_BASE", 50041))
MAVSDK_SERVER_PORT_RANGE = int(os.getenv("MAVSDK_SERVER_PORT_RANGE", 100))  # Port range for dynamic allocation

# --- Weather & Safety Gates ---
WEATHER_BLOCK_ENABLED = False
WEATHER_CHECK_SECONDS = 600
WIND_MAX_M_S = 10.0
RAIN_MAX = 0.7

# --- Battery Management ---
# Lower thresholds for testing/simulation to avoid PX4 health check failures
BATTERY_MIN_PERCENT_TAKEOFF = float(os.getenv("BATTERY_MIN_PERCENT_TAKEOFF", "10.0"))  # Lowered from 30.0
RETURN_BATTERY_PERCENT_RTL = float(os.getenv("RETURN_BATTERY_PERCENT_RTL", "5.0"))   # Lowered from 20.0

# --- Mission & Flight Parameters ---
TAKEOFF_ALTITUDE = 20.0
REACH_TOLERANCE_M = 2.0
SIM_SPEED_M_S = 15.0
COLLISION_RETRY_ALTITUDE_ADJUST = 2.0

# --- Proof of Delivery (QR + Camera) ---
QR_TEXT_PREFIX = "Delivery Confirmed: Package "
QR_WINDOW_TITLE = "Delivery QR Code"
CAPTURE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captures")
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")