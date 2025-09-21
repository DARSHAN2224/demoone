# drone/communication/enhanced_http_server.py
import asyncio
import logging
from aiohttp import web

# Use a named logger.
log = logging.getLogger("http_server")

class EnhancedHTTPServer:
    def __init__(self, drone_name: str, state_snapshot: callable, command_handler: callable, http_port: int, drone_bridge=None):
        self.drone_name = drone_name
        self.state_snapshot = state_snapshot
        self.command_handler = command_handler
        self.http_port = http_port
        self.drone_bridge = drone_bridge
        self.last_command_result = None
        
        self.app = web.Application()
        self.runner = None
        self._setup_routes()

    def _setup_routes(self):
        """Sets up all the API endpoints for the HTTP server."""
        self.app.router.add_get('/status', self.get_status)
        # This is the main endpoint for receiving commands from the backend.
        self.app.router.add_post('/drone/command', self.handle_command)

    async def get_status(self, request: web.Request):
        """Handler for the /status endpoint."""
        return web.json_response(self.state_snapshot())

    async def handle_command(self, request: web.Request):
        """Handler for the /drone/command endpoint."""
        try:
            data = await request.json()
            # Basic validation
            if data.get("droneId") != self.drone_name:
                return web.json_response({
                    "success": False,
                    "message": f"Drone ID mismatch. Expected {self.drone_name}, got {data.get('droneId')}"
                }, status=400)
            
            # Execute the command and wait for result
            await self.command_handler(data)
            
            # Small delay to ensure command completes
            import asyncio
            await asyncio.sleep(0.1)
            
            # Get the command result from the drone bridge
            command_result = None
            if self.drone_bridge and hasattr(self.drone_bridge, 'last_command_result'):
                command_result = self.drone_bridge.last_command_result
                log.info(f"[{self.drone_name}] HTTP Server retrieved command result: {command_result}")
                self.drone_bridge.last_command_result = None  # Clear the result
            else:
                log.warning(f"[{self.drone_name}] HTTP Server: No command result available from drone bridge")
            
            # Return the command result if available
            if command_result:
                return web.json_response(command_result)
            else:
                return web.json_response({
                    "success": True,
                    "message": f"Command '{data.get('command')}' executed for {self.drone_name}"
                })
        except Exception as e:
            log.error(f"[{self.drone_name}] Error handling HTTP command: {e}")
            return web.json_response({"success": False, "message": str(e)}, status=500)

    async def run(self):
        """Starts and runs the aiohttp server."""
        self.runner = web.AppRunner(self.app)
        await self.runner.setup()
        site = web.TCPSite(self.runner, '127.0.0.1', self.http_port)
        try:
            await site.start()
            log.info(f"[{self.drone_name}] 🌐 HTTP command server running on http://127.0.0.1:{self.http_port}")
        except OSError as e:
            log.error(f"[{self.drone_name}] ❌ Failed to start HTTP server on port {self.http_port}: {e}. Is the port in use?")
            # Don't keep running if the server can't start.
            await self.stop()

    async def stop(self):
        """Stops the aiohttp server."""
        if self.runner:
            await self.runner.cleanup()
            log.info(f"[{self.drone_name}] HTTP server stopped.")