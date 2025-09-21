import asyncio
import websockets
import json
import logging

class WebSocketClient:
    """
    Manages the WebSocket connection to the Node.js backend, handling sending
    of structured messages like telemetry and mission updates.
    """
    def __init__(self, uri):
        self.uri = uri
        self.websocket = None
        self.is_connected = False

    async def connect(self):
        """Establishes connection to the backend and keeps it alive."""
        while True:
            try:
                logging.info(f"Attempting to connect to WebSocket at {self.uri}...")
                self.websocket = await websockets.connect(self.uri)
                self.is_connected = True
                logging.info(f"Successfully connected to WebSocket at {self.uri}")
                # Keep the connection alive by waiting for it to close
                await self.websocket.wait_closed()
            except (websockets.exceptions.ConnectionClosedError, ConnectionRefusedError) as e:
                logging.warning(f"WebSocket connection lost or refused: {e}. Retrying in 5 seconds...")
            except Exception as e:
                logging.error(f"An unexpected WebSocket error occurred: {e}. Retrying in 5 seconds...")
            finally:
                self.is_connected = False
                await asyncio.sleep(5)

    async def send_message(self, data):
        """Sends a JSON-formatted message to the backend if connected."""
        if self.is_connected and self.websocket:
            try:
                await self.websocket.send(json.dumps(data))
            except websockets.exceptions.ConnectionClosed:
                logging.warning("Failed to send message, WebSocket is closed.")
        else:
            logging.warning("Cannot send message, WebSocket is not connected.")

    async def send_telemetry(self, telemetry_data):
        """Specifically sends telemetry data under the 'drone_telemetry' event."""
        message = {
            "type": "drone_telemetry",
            "payload": telemetry_data
        }
        await self.send_message(message)

    async def send_mission_update(self, update_data):
        """Specifically sends mission updates under the 'mission_update' event."""
        message = {
            "type": "mission_update",
            "payload": update_data
        }
        await self.send_message(message)