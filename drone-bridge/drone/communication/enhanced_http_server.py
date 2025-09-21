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
        api_v1.router.add_post('/commands/takeoff', self.handle_takeoff)
        api_v1.router.add_post('/commands/land', self.handle_land)
        api_v1.router.add_post('/commands/demo-mission', self.handle_demo_mission)
        api_v1.router.add_post('/commands/mission', self.handle_mission)
        api_v1.router.add_post('/commands/reset', self.handle_reset)
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

    async def handle_takeoff(self, request):
        """Handles requests to takeoff the drone."""
        try:
            data = await request.json()
            altitude = data.get('altitude', 20)
            
            # Simple takeoff - just arm and takeoff
            logging.info(f"Takeoff command received - altitude: {altitude}m")
            
            # Start takeoff in background
            asyncio.create_task(self.mission_manager.simple_takeoff(altitude))
            
            return web.json_response({
                'status': 'success', 
                'message': f'Takeoff command received - altitude: {altitude}m'
            }, status=202)
        except Exception as e:
            logging.error(f"Error handling takeoff request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def handle_land(self, request):
        """Handles requests to land the drone."""
        try:
            logging.info("Land command received")
            
            # Start landing in background
            asyncio.create_task(self.mission_manager.simple_land())
            
            return web.json_response({
                'status': 'success', 
                'message': 'Land command received'
            }, status=202)
        except Exception as e:
            logging.error(f"Error handling land request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def handle_demo_mission(self, request):
        """Handles requests for a small demo mission to test collisions."""
        try:
            logging.info("Demo mission command received")
            
            # Create a small demo mission with 2-3 waypoints
            demo_waypoints = [
                {'lat': 47.3977, 'lng': 8.5456, 'altitude': 20},  # Waypoint 1
                {'lat': 47.3978, 'lng': 8.5457, 'altitude': 20},  # Waypoint 2
                {'lat': 47.3979, 'lng': 8.5458, 'altitude': 20}   # Waypoint 3
            ]
            
            # Start demo mission in background
            asyncio.create_task(self.mission_manager.run_mission(demo_waypoints))
            
            return web.json_response({
                'status': 'success', 
                'message': 'Demo mission started - testing collision detection',
                'waypoints': len(demo_waypoints)
            }, status=202)
        except Exception as e:
            logging.error(f"Error handling demo mission request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def handle_mission(self, request):
        """Handles requests to start a mission with waypoints."""
        try:
            data = await request.json()
            waypoints = data.get('waypoints', [])
            drone_id = data.get('droneId', 'UNKNOWN')
            
            logging.info(f"Mission request received for {drone_id} with {len(waypoints)} waypoints")
            
            if not waypoints:
                return web.json_response({
                    'status': 'error',
                    'message': 'No waypoints provided'
                }, status=400)
            
            # Start mission in background
            asyncio.create_task(self.mission_manager.run_mission(waypoints))
            
            return web.json_response({
                'status': 'success', 
                'message': f'Mission started for {drone_id} with {len(waypoints)} waypoints',
                'waypoints': len(waypoints)
            }, status=202)
        except Exception as e:
            logging.error(f"Error handling mission request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def handle_reset(self, request):
        """Handles requests to reset the drone state."""
        try:
            logging.info("Reset drone request received")
            
            # Reset drone state in background
            asyncio.create_task(self.mission_manager.reset_drone_state())
            
            return web.json_response({
                'status': 'success', 
                'message': 'Drone reset command received'
            }, status=202)
        except Exception as e:
            logging.error(f"Error handling reset request: {e}")
            return web.json_response({'error': 'Internal server error'}, status=500)

    async def start(self):
        """Starts the aiohttp server."""
        runner = web.AppRunner(self.app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        logging.info(f"HTTP server started on http://{self.host}:{self.port}")