import asyncio
import logging
from config.config import Config
from drone.mavsdk_client import MAVSDKClient
from drone.mission_manager import MissionManager
from drone.communication.ws_client import WebSocketClient
from drone.communication.enhanced_http_server import EnhancedHTTPServer

async def main():
    """
    Main entry point for the Drone Bridge application.
    Initializes and runs all necessary components.
    """
    # 1. Configure logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    
    # 2. Load configuration
    config = Config()
    
    # 3. Initialize the WebSocket client to connect to the Node.js backend
    ws_client = WebSocketClient(uri=config.BACKEND_WS_URL)
    
    # 4. Initialize the MAVSDK client to connect to the drone
    mavsdk_client = MAVSDKClient(
        mavsdk_server_address=config.MAVSDK_SERVER_ADDRESS,
        ws_client=ws_client
    )
    
    # 5. Connect to the drone
    await mavsdk_client.connect()
    
    # 6. Initialize the Mission Manager, passing it the drone object and the ws_client
    mission_manager = MissionManager(drone=mavsdk_client.drone, ws_client=ws_client)
    
    # 7. Initialize the HTTP Server to listen for commands from the backend
    http_server = EnhancedHTTPServer(
        host=config.HTTP_HOST,
        port=config.HTTP_PORT,
        mission_manager=mission_manager
    )
    
    # 8. Start all services to run concurrently
    logging.info("Starting all services...")
    await asyncio.gather(
        ws_client.connect(),      # Task to maintain WebSocket connection
        http_server.start()       # Task to run the HTTP command server
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Application shut down by user.")