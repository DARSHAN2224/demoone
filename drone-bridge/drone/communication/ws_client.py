# drone/communication/ws_client.py
import asyncio
import json
import websockets
import logging
from typing import Callable

# --- Project Imports ---
from config.config import FOOD_APP_WS_URL

log = logging.getLogger("ws_client")

class WSClient:
    def __init__(self, on_command_callback: Callable):
        self.ws_url = FOOD_APP_WS_URL
        self.websocket: websockets.WebSocketClientProtocol = None
        self.on_command = on_command_callback
        self.is_connected = False

    async def connect(self):
        """
        Connects to the backend WebSocket and enters a reconnect loop.
        """
        while True:
            try:
                log.info(f"🔌 Connecting to Food App backend: {self.ws_url}")
                async with websockets.connect(self.ws_url) as ws:
                    self.websocket = ws
                    self.is_connected = True
                    log.info("✅ Connected to Food App backend")
                    await self._receive_loop()
            except Exception as e:
                log.warning(f"❌ Failed to connect to Food App: {e}. Retrying in 5 seconds...")
            finally:
                self.is_connected = False
                await asyncio.sleep(5)

    async def _receive_loop(self):
        """
        Listens for incoming messages from the WebSocket server.
        """
        async for message in self.websocket:
            # Socket.IO messages often start with '42', indicating an event packet.
            if isinstance(message, str) and message.startswith("42"):
                try:
                    payload = json.loads(message[2:])
                    if isinstance(payload, list) and len(payload) > 1:
                        event_name = payload[0]
                        data = payload[1]
                        if event_name == "drone:command":
                            # Process the command in a new task to avoid blocking the receive loop.
                            asyncio.create_task(self.on_command(data))
                except json.JSONDecodeError:
                    log.warning(f"Could not decode WebSocket JSON: {message}")
                except Exception as e:
                    log.error(f"Error processing WebSocket message: {e}")

    async def emit(self, event: str, data: dict):
        """
        Sends (emits) an event to the backend in the Socket.IO format.
        """
        if self.websocket and self.is_connected:
            try:
                # Format the message as a Socket.IO event packet.
                message = f'42["{event}",{json.dumps(data)}]'
                await self.websocket.send(message)
            except websockets.exceptions.ConnectionClosed:
                log.warning("Could not send message, WebSocket connection is closed.")
                self.is_connected = False
            except Exception as e:
                log.error(f"Error sending WebSocket message: {e}")

    async def close(self):
        """Closes the WebSocket connection."""
        if self.websocket and not self.websocket.closed:
            await self.websocket.close()
            log.info("WebSocket connection closed.")