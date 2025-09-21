import asyncio
from aiohttp import web
import logging

class EnhancedHTTPServer:
    """
    An asynchronous HTTP server using aiohttp to receive commands from the backend.
    """
    def __init__(self, host, port, mission_manager):
        self.host = host
        self.port = port
        self.mission_manager = mission_manager
        self.app = web.Application()
        self._setup_routes()

    def _setup_routes(self):
        """Configures the API routes for drone control."""
        router = self.app.router
        # Define routes with a /api/v1 prefix for consistency
        api_v1 = web.Application()
        api_v1.router.add_post('/commands/start-mission', self.handle_start_mission)
        api_v1.router.add_post('/commands/return-to-launch', self.handle_return_to_launch)
        self.app.add_subapp('/api/v1/', api_v1)
        logging.info("HTTP routes configured under /api/v1")


    async def handle_start_mission(self, request):
        """Handles requests to start a new mission."""
        try:
            data = await request.json()
            waypoints = data.get('waypoints')
            if not waypoints or not isinstance(waypoints, list):
                return web.json_response({'error': 'Waypoints are required and must be a list.'}, status=400)
            
            # Start the mission in the background without blocking the HTTP response
            asyncio.create_task(self.mission_manager.run_mission(waypoints))
            
            return web.json_response({'status': 'success', 'message': 'Mission start command received.'}, status=202)
        except Exception as e:
            logging.error(f"Error handling start mission request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def handle_return_to_launch(self, request):
        """Handles requests to command the drone to return to launch."""
        try:
            # Start the RTL command in the background
            result = await self.mission_manager.return_to_launch()
            if result.get("status") == "success":
                return web.json_response(result, status=202)
            else:
                 return web.json_response(result, status=500)
        except Exception as e:
            logging.error(f"Error handling return to launch request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def start(self):
        """Starts the aiohttp server."""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        logging.info(f"HTTP server started on http://{self.host}:{self.port}")