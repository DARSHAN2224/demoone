import asyncio
import logging
from mavsdk import System
from .communication.ws_client import WebSocketClient

class MAVSDKClient:
    """
    Handles the connection to the drone via MAVSDK and streams telemetry.
    """
    def __init__(self, mavsdk_server_address: str, ws_client: WebSocketClient):
        self.drone = System()
        self.mavsdk_server_address = mavsdk_server_address
        self.ws_client = ws_client

    async def connect(self):
        """Connects to the drone."""
        logging.info(f"Connecting to drone at {self.mavsdk_server_address}...")
        await self.drone.connect(system_address=self.mavsdk_server_address)
        
        logging.info("Waiting for drone to connect...")
        async for state in self.drone.core.connection_state():
            if state.is_connected:
                logging.info("Drone discovered!")
                break
        
        logging.info("Waiting for drone to have a global position estimate...")
        async for health in self.drone.telemetry.health():
            if health.is_global_position_ok and health.is_home_position_ok:
                logging.info("Global position estimate OK.")
                break
        
        # Start streaming telemetry in the background
        asyncio.ensure_future(self.stream_telemetry())

    async def stream_telemetry(self):
        """Streams telemetry data from the drone to the WebSocket client."""
        logging.info("Starting telemetry streaming.")
        try:
            async for position in self.drone.telemetry.position():
                telemetry_data = {
                    "latitude_deg": position.latitude_deg,
                    "longitude_deg": position.longitude_deg,
                    "absolute_altitude_m": position.absolute_altitude_m,
                    "relative_altitude_m": position.relative_altitude_m
                }
                # Emit telemetry via the WebSocket client
                await self.ws_client.send_telemetry(telemetry_data)
                await asyncio.sleep(1)  # Send updates every 1 second
        except asyncio.CancelledError:
            logging.info("Telemetry streaming task was cancelled.")
        except Exception as e:
            logging.error(f"Error in telemetry streaming: {e}")