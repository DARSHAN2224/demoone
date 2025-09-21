import os

"""
Centralized configuration settings for the Drone Bridge application.
"""
class Config:
    """
    Holds all configuration variables, loaded from environment variables with sane defaults.
    """
    # --- Backend Connection ---
    # The URL for the Node.js backend's WebSocket server. The drone bridge acts as a client
    # to this server, pushing telemetry and mission updates.
    # FIXED: The port is now correctly set to 8080 and the path includes the '/drone' namespace.
    BACKEND_WS_URL = os.getenv("BACKEND_WS_URL", "ws://localhost:8080/drone")

    # --- Drone Bridge Server ---
    # The host and port for the drone bridge's own HTTP server. The Node.js backend
    # sends commands (like 'start-mission') to this API.
    HTTP_HOST = os.getenv("HTTP_HOST", "localhost")
    HTTP_PORT = int(os.getenv("HTTP_PORT", 8001))
    API_V1_STR = "/api/v1"

    # --- Drone Connection ---
    # The address for the MAVSDK server to connect to the drone's flight controller.
    # For SITL (Software in the Loop) simulation, this is typically a local UDP port.
    MAVSDK_SERVER_ADDRESS = os.getenv("MAVSDK_SERVER_ADDRESS", "udp://:14540")

    # --- Identification ---
    # A unique identifier for this drone instance.
    DRONE_ID = os.getenv("DRONE_ID", "DRONE-001")
    
    # --- Mission Parameters ---
    # Default altitude for missions in meters.
    DEFAULT_MISSION_ALTITUDE = float(os.getenv("DEFAULT_MISSION_ALTITUDE", 15.0))