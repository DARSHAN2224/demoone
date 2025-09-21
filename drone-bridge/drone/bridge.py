# drone/bridge.py
import asyncio
import logging
import os
import time
from typing import Dict, Any, Optional

try:
    import airsim
except Exception:
    airsim = None

from config.config import (
    DEFAULT_MODE, TAKEOFF_ALTITUDE, DroneMode,
    BATTERY_MIN_PERCENT_TAKEOFF, RETURN_BATTERY_PERCENT_RTL
)
from common.types import Waypoint
from .communication.ws_client import WSClient
from .communication.enhanced_http_server import EnhancedHTTPServer
from .services.weather_service import WeatherService
from .services.collision_service import CollisionService
from .services.camera_service import CameraService
from .services.qr_service import QRService
from .services.camera_view_manager import CameraViewManager
from .state_store import StateStore
from .mavsdk_client import MavsdkClient
from .mission_manager import MissionManager

log = logging.getLogger("bridge")

class DroneBridge:
    def __init__(self, drone_name: str, system_address: str, mode=DEFAULT_MODE, http_port: int = 8001, mavsdk_port: int = 50041, enable_testing: bool = False, home_location: Optional[Dict[str, float]] = None):
        self.name = drone_name
        self.mode = mode
        self.enable_testing = enable_testing
        self.state = StateStore(drone_name)
        self.mavsdk = MavsdkClient(self.name, system_address, mavsdk_port)
        self.mission = MissionManager(self.name, self.state)
        # Initialize single, shared AirSim client
        self.airsim_client = None
        try:
            if airsim:
                # Create the single, shared AirSim client here
                self.airsim_client = airsim.MultirotorClient()
                self.airsim_client.confirmConnection()
                log.info(f"[{self.name}] ✅ AirSim client connected successfully.")
            else:
                log.warning(f"[{self.name}] ⚠️ AirSim not available, camera and collision services will be disabled.")
        except Exception as e:
            log.warning(f"[{self.name}] ⚠️ Could not connect to AirSim: {e}. Camera and collision services will be disabled.")

        # Pass the single client to services that need it
        self.weather = WeatherService()  # WeatherService doesn't need AirSim client
        self.collision = CollisionService(self.airsim_client)
        self.camera = CameraService(self.airsim_client)
        self.camera_views = CameraViewManager(self.airsim_client) if self.airsim_client else None
        
        self.qr = QRService()
        # Connect QR service and drone bridge to mission manager
        self.mission.set_qr_service(self.qr)
        self.mission.set_drone_bridge(self)
        self.ws = WSClient(self._on_ws_command)
        self.http = EnhancedHTTPServer(
            drone_name=self.name,
            state_snapshot=self.state.snapshot,
            command_handler=self._on_http_command,
            http_port=http_port,
            drone_bridge=self
        )
        self.px4_connected = False
        self.last_command_result = None

        # Apply per-drone home location if provided
        try:
            if home_location and 'lat' in home_location and 'lng' in home_location:
                self.state.set_home(home_location['lat'], home_location['lng'])
                log.info(f"[{self.name}] 🏠 Home position set to {home_location['lat']}, {home_location['lng']}")
        except Exception:
            pass

    async def run(self):
        log.info(f"[{self.name}] 🚁 Starting Drone Bridge...")
        log.info(f"[{self.name}] 📋 Mode: {self.mode.value}")
        self.px4_connected = await self.mavsdk.connect()
        if not self.px4_connected:
            log.warning(f"[{self.name}] 🎮 Falling back to PURE SIMULATION mode.")
            self.mode = DroneMode.SIMULATION
        
        await self.connect_io()
        await self.start_services()
        telemetry_task = asyncio.create_task(self.telemetry_loop())
        try:
            await telemetry_task
        except asyncio.CancelledError:
            log.info(f"[{self.name}] Telemetry loop cancelled.")
        finally:
            await self.disconnect()

    async def connect_io(self):
        log.info(f"[{self.name}] 🎧 Listening for commands...")
        asyncio.create_task(self.ws.connect())
        asyncio.create_task(self.http.run())

    async def start_services(self):
        # Start weather service with drone location callback for real-time weather updates
        asyncio.create_task(self.weather.start(self._get_drone_location))
        asyncio.create_task(self.collision.watch())
    
    async def _get_drone_location(self):
        """Get current drone location for weather service."""
        try:
            sim_state = self.state.sim_state
            return {
                'lat': sim_state.get('lat', 0),
                'lng': sim_state.get('lng', 0),
                'alt': sim_state.get('alt', 0)
            }
        except Exception as e:
            log.warning(f"[{self.name}] Failed to get drone location: {e}")
            return None
    
    async def telemetry_loop(self):
        log.info(f"[{self.name}] 📡 Broadcasting telemetry...")
        last_sent_tuple = None
        while True:
            try:
                current_telemetry = None
                if self.px4_connected:
                    current_telemetry = await self.mavsdk.get_telemetry()
                
                if current_telemetry is None:
                    await self.mission.simulate_step()
                    current_telemetry = self.state.get_sim_telemetry()

                self.state.last_telemetry = current_telemetry
                
                if current_telemetry.battery < RETURN_BATTERY_PERCENT_RTL and self.state.mission_active:
                    log.warning(f"[{self.name}] 🔋 Low battery ({current_telemetry.battery}%)! Initiating RTL.")
                    await self.cmd_rtl()

                current_tuple = (current_telemetry.lat, current_telemetry.lng, round(current_telemetry.alt), round(current_telemetry.battery))
                if current_tuple != last_sent_tuple:
                    await self.ws.emit("drone:telemetry", self.state.snapshot())
                    last_sent_tuple = current_tuple
            except Exception as e:
                log.error(f"[{self.name}] Telemetry loop error: {e}", exc_info=False)
            
            await asyncio.sleep(1)

    async def _on_ws_command(self, data: Dict[str, Any]):
        if data.get("droneId") != self.name: return
        await self._execute_command(data)

    async def _on_http_command(self, data: Dict[str, Any]):
        await self._execute_command(data)

    async def _execute_command(self, cmd_data: Dict[str, Any]):
        command = cmd_data.get("command", cmd_data.get("action", ""))
        params = cmd_data.get("parameters", cmd_data)
        log.info(f"[{self.name}] 🔧 Executing command: '{command}' with params: {params}")
        handlers = {
            "takeoff": (self.cmd_takeoff, [params.get("altitude", TAKEOFF_ALTITUDE)]),
            "land": (self.cmd_land, []),
            "return": (self.cmd_rtl, [params.get("destination")]),
            "return_to_launch": (self.cmd_rtl, [params.get("destination")]),
            "emergency_stop": (self.cmd_rtl, [params.get("destination")]),
            "start_mission": (self.cmd_start_mission, [params]),
            "get_status": (self.cmd_get_status, []),
            "capture_photo": (self.cmd_capture_photo, [params.get("camera_type", "front")]),
            "capture_all_angles": (self.cmd_capture_all_angles, []),
            "switch_camera": (self.cmd_switch_camera, [params.get("camera_type", "front")]),
            "get_weather": (self.cmd_get_weather, []),
            "set_weather_profile": (self.cmd_set_weather, [params]),
            "set_weather_conditions": (self.cmd_set_weather_conditions, [params]),
            "get_battery": (self.cmd_get_battery, []),
            "start_charging": (self.cmd_start_charging, []),
            "stop_charging": (self.cmd_stop_charging, []),
            "start_camera_views": (self.cmd_start_camera_views, []),
            "stop_camera_views": (self.cmd_stop_camera_views, []),
            "show_qr_code": (self.cmd_show_qr_code, [params.get("payload")]),
            "confirm_delivery": (self.cmd_confirm_delivery, [params])
        }
        handler, args = handlers.get(command, (None, None))
        if handler:
            # Enforce testing mode for test-only commands
            test_only = command in {"start_mission", "get_weather", "set_weather_profile", "start_camera_views", "stop_camera_views", "show_qr_code"}
            if test_only and not self.enable_testing:
                log.warning(f"[{self.name}] ❌ Test command '{command}' blocked: testing mode disabled")
                return
            await handler(*args)
        else:
            log.warning(f"[{self.name}] ❌ Unknown command: {command}")

    async def cmd_takeoff(self, altitude: float):
        log.info(f"[{self.name}] 🚀 Takeoff to {altitude}m...")
        if self.state.last_telemetry and self.state.last_telemetry.battery < BATTERY_MIN_PERCENT_TAKEOFF:
            log.warning(f"[{self.name}] ❌ Takeoff blocked by low battery.")
            return

        self.state.flight_active = True
        if self.px4_connected:
            try:
                await self.mavsdk.arm()
                await self.mavsdk.takeoff(altitude)
            except Exception as e:
                log.error(f"[{self.name}] ❌ PX4 takeoff failed: {e}.")
                self.state.update_sim(alt=altitude, mode="TAKEOFF", armed=True)
        else:
            self.state.update_sim(alt=altitude, mode="TAKEOFF", armed=True)
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "takeoff_initiated"})

    async def cmd_land(self):
        log.info(f"[{self.name}] 🛬 Landing...")
        self.state.flight_active = False
        self.mission.clear()
        if self.px4_connected:
            try: await self.mavsdk.land()
            except Exception as e: log.error(f"[{self.name}] ❌ PX4 land failed: {e}.")
        self.state.update_sim(alt=0.0, mode="LANDING", armed=False)
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "landing_initiated"})
        # Notify backend webhook that drone is idle after landing
        try:
            await self._notify_landed()
        except Exception:
            pass

    async def cmd_rtl(self, destination: Optional[Dict[str, float]] = None):
        if destination and isinstance(destination, dict) and "lat" in destination and "lng" in destination:
            log.info(f"[{self.name}] 🏠 Returning to specified destination: lat={destination['lat']}, lng={destination['lng']}")
        else:
            log.info(f"[{self.name}] 🏠 Returning to launch (home position)...")
        self.state.flight_active = True
        self.mission.clear()
        if self.px4_connected:
            try:
                # If a destination is provided, prefer guided mission back to that point (future enhancement).
                # For now, issue RTL; simulation state will still jump to specified destination if provided.
                await self.mavsdk.rtl()
            except Exception as e: log.error(f"[{self.name}] ❌ PX4 RTL failed: {e}.")
        # Update simulation position: destination if provided, else home position
        if destination and isinstance(destination, dict) and "lat" in destination and "lng" in destination:
            self.state.update_sim(lat=float(destination["lat"]), lng=float(destination["lng"]), mode="RTL")
        else:
            self.state.update_sim(lat=self.state.home_pos[0], lng=self.state.home_pos[1], mode="RTL")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "rtl_initiated"})
        # After initiating RTL, simulate eventual landing and notify backend
        try:
            await asyncio.sleep(1.0)
            await self._notify_landed()
        except Exception:
            pass

    async def _notify_landed(self):
        base_url = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")
        import aiohttp
        async with aiohttp.ClientSession() as session:
            try:
                url = f"{base_url}/api/v1/drone/webhook/landed"
                await session.post(url, json={"droneId": self.name}, timeout=5)
                log.info(f"[{self.name}] 📬 Notified backend of landing")
            except Exception as e:
                log.warning(f"[{self.name}] ⚠️ Failed to notify backend of landing: {e}")

    async def cmd_start_mission(self, mission_data: Dict[str, Any]):
        waypoints_data = mission_data.get("waypoints", [])
        log.info(f"[{self.name}] 🎯 Starting mission with {len(waypoints_data)} waypoints...")
        if not waypoints_data: return
        
        # Log the raw waypoint data for debugging
        for i, wp in enumerate(waypoints_data):
            log.info(f"[{self.name}] Waypoint {i+1}: lat={wp.get('lat')}, lng={wp.get('lng')}, alt={wp.get('alt', 'default')}")
        
        # Dynamic default altitude from environment
        default_altitude = float(os.getenv("DRONE_DEFAULT_ALTITUDE", "30.0"))
        waypoints = [Waypoint(lat=wp['lat'], lng=wp['lng'], alt=wp.get('alt', default_altitude)) for wp in waypoints_data]
        
        # Pass mission data including order info for QR verification
        mission_info = {
            'orderId': mission_data.get('orderId'),
            'deliveryLocation': mission_data.get('deliveryLocation'),
            'customerInfo': mission_data.get('customerInfo'),
            'orderDetails': mission_data.get('orderDetails')
        }
        
        self.mission.set_waypoints(waypoints, mission_info)
        self.state.flight_active = True
        if self.px4_connected:
            try:
                await self.mavsdk.upload_and_start_mission(self.mission.to_mavsdk_items())
            except Exception as e:
                log.error(f"[{self.name}] ❌ PX4 mission failed: {e}.")
                self.state.update_sim(mode="MISSION")
        else:
            self.state.update_sim(mode="MISSION")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "mission_started"})
        asyncio.create_task(self._mission_completion_watch())
        
    async def _mission_completion_watch(self):
        while self.state.mission_active: await asyncio.sleep(1.0)
        log.info(f"[{self.name}] 🎉 Mission completed! Landing at current position...")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "mission_completed"})
        
        # Land at current position first
        await self.cmd_land()
        
        # Wait for landing to complete (simulate landing time)
        await asyncio.sleep(3.0)
        
        # Then return to home location
        log.info(f"[{self.name}] 🏠 Mission complete, returning to home location...")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "returning_home"})
        await self.cmd_rtl()

    async def cmd_get_status(self):
        log.info(f"[{self.name}] Status requested. State: {self.state.snapshot()}")
        status_data = self.state.snapshot()
        await self.ws.emit("drone:status", status_data)
        
        # Store the result for HTTP response
        self.last_command_result = status_data

    async def cmd_capture_photo(self, camera_type: str = "front"):
        log.info(f"[{self.name}] 📸 Capturing proof photo from {camera_type} camera...")
        path = await self.camera.capture_delivery_photo(self.name, camera_type)
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "photo_captured", "path": path, "camera": camera_type})

    async def cmd_capture_all_angles(self):
        log.info(f"[{self.name}] 📸 Capturing photos from all camera angles...")
        photos = await self.camera.capture_multiple_angles(self.name)
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "photos_captured", "photos": photos})

    async def cmd_switch_camera(self, camera_type: str):
        log.info(f"[{self.name}] 📷 Switching to {camera_type} camera...")
        await self.camera.switch_camera(camera_type)
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "camera_switched", "camera": camera_type})

    async def cmd_get_weather(self):
        state = self.weather.state
        log.info(f"[{self.name}] Weather: {state}")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "weather_status", "data": state.__dict__})
        
        # Get current drone location for real weather data
        current_location = await self._get_drone_location()
        
        # Get real weather data based on current location
        real_weather = None
        if current_location and current_location.get('lat') and current_location.get('lng'):
            try:
                real_weather = await self.weather._get_real_weather(
                    current_location['lat'], 
                    current_location['lng']
                )
                log.info(f"[{self.name}] 🌍 Real weather for location ({current_location['lat']}, {current_location['lng']}): {real_weather}")
            except Exception as e:
                log.warning(f"[{self.name}] Failed to get real weather: {e}")
        
        # Use real weather data if available, otherwise use current state
        if real_weather:
            weather_data = {
                "wind": real_weather.get('wind', state.wind),
                "rain": real_weather.get('rain', state.rain),
                "good_to_fly": state.good_to_fly,
                "temperature": real_weather.get('temperature', 22.5),
                "humidity": real_weather.get('humidity', 68),
                "conditions": real_weather.get('condition', 'Clear'),
                "description": real_weather.get('description', 'clear sky'),
                "pressure": real_weather.get('pressure', 1015.3),
                "visibility": real_weather.get('visibility', 12.5),
                "analysis": {
                    "isSafeToFly": state.good_to_fly,
                    "riskLevel": "HIGH" if state.wind > 10 or state.rain > 0.7 else "LOW"
                }
            }
        else:
            # Fallback to current state with calculated values based on location and time
            import time
            current_time = time.time()
            hour = time.localtime(current_time).tm_hour
            
            # Dynamic temperature based on time of day and weather conditions
            base_temp = 22.5
            time_temp_adjustment = -5 if hour < 6 else 0 if hour < 12 else 3 if hour < 18 else -2
            weather_temp_adjustment = (state.wind * 0.5) - (state.rain * 2)
            dynamic_temp = base_temp + time_temp_adjustment + weather_temp_adjustment
            
            # Dynamic humidity based on rain and time
            base_humidity = 68
            rain_humidity = state.rain * 20
            time_humidity = 10 if hour < 6 or hour > 22 else -5  # Higher humidity at night
            dynamic_humidity = min(100, base_humidity + rain_humidity + time_humidity)
            
            # Dynamic pressure based on wind and weather
            base_pressure = 1015.3
            wind_pressure = -state.wind * 0.5
            rain_pressure = -state.rain * 2
            dynamic_pressure = base_pressure + wind_pressure + rain_pressure
            
            # Dynamic visibility based on rain and time
            base_visibility = 12.5
            rain_visibility = -state.rain * 8
            time_visibility = -2 if hour < 6 or hour > 20 else 0  # Lower visibility at night
            dynamic_visibility = max(1.0, base_visibility + rain_visibility + time_visibility)
            
            # Dynamic conditions based on multiple factors
            if state.rain > 0.7:
                conditions = "Stormy"
                description = "heavy rain"
            elif state.rain > 0.3:
                conditions = "Rainy"
                description = "light rain"
            elif state.wind > 8:
                conditions = "Windy"
                description = "strong winds"
            elif hour < 6 or hour > 20:
                conditions = "Clear"
                description = "clear night sky"
            else:
                conditions = "Clear"
                description = "clear sky"
            
            weather_data = {
                "wind": state.wind,
                "rain": state.rain,
                "good_to_fly": state.good_to_fly,
                "temperature": round(dynamic_temp, 1),
                "humidity": round(dynamic_humidity, 1),
                "conditions": conditions,
                "description": description,
                "pressure": round(dynamic_pressure, 1),
                "visibility": round(dynamic_visibility, 1),
                "analysis": {
                    "isSafeToFly": state.good_to_fly,
                    "riskLevel": "HIGH" if state.wind > 10 or state.rain > 0.7 else "LOW"
                }
            }
        
        # Store the result for HTTP response
        self.last_command_result = {
            "success": True,
            "message": f"Weather data for {self.name}",
            "weather": weather_data
        }

    async def cmd_set_weather(self, params: Dict[str, Any]):
        profile = params.get("profile")
        lat = params.get("lat")
        lng = params.get("lng")
        
        log.info(f"[{self.name}] ⛅ Setting weather to '{profile}'")
        
        if profile == "location_based" and lat is not None and lng is not None:
            log.info(f"[{self.name}] 🌍 Setting weather based on location ({lat}, {lng})")
            await self.weather.set_external_conditions(lat=lat, lng=lng)
        elif profile:
            await self.weather.set_profile(profile)
        else:
            log.warning(f"[{self.name}] ⚠️ No valid weather profile provided")

    async def cmd_set_weather_conditions(self, weather_data: Dict[str, Any]):
        try:
            wind = float(weather_data.get("wind_speed", weather_data.get("wind", 0.0)))
            rain = float(weather_data.get("precipitation", weather_data.get("rain", 0.0)))
            log.info(f"[{self.name}] 🌦️ Weather externally set: wind={wind} m/s, rain={rain}")
            await self.weather.set_external_conditions(wind=wind, rain=rain)
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "weather_set", "data": {"wind": wind, "rain": rain}})
        except Exception as e:
            log.error(f"[{self.name}] Failed to set weather conditions: {e}")

    async def cmd_get_battery(self):
        level = self.state.last_telemetry.battery if self.state.last_telemetry else "N/A"
        voltage = self.state.last_telemetry.voltage if self.state.last_telemetry else "N/A"
        current = self.state.last_telemetry.current if self.state.last_telemetry else "N/A"
        temperature = self.state.last_telemetry.temperature if self.state.last_telemetry else "N/A"
        
        battery_data = {
            "level": level,
            "voltage": voltage,
            "current": current,
            "temperature": temperature,
            "status": "normal" if level != "N/A" and level > 20 else "low"
        }
        
        log.info(f"[{self.name}] Battery: {level}%")
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "battery_status", "data": battery_data})
        
        # Store the result for HTTP response
        self.last_command_result = {
            "success": True,
            "data": battery_data
        }
        # Also store in HTTP server
        if hasattr(self.http, 'last_command_result'):
            self.http.last_command_result = self.last_command_result

    async def cmd_start_charging(self):
        log.info(f"[{self.name}] 🔋 Simulating: Start charging.")
        self.state.update_sim(is_charging=True)
        
        charging_data = {
            "status": "charging",
            "message": "Battery charging started successfully"
        }
        
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "charging_started", "data": charging_data})
        
        # Store the result for HTTP response
        self.last_command_result = {
            "success": True,
            "data": charging_data
        }
        # Also store in HTTP server
        if hasattr(self.http, 'last_command_result'):
            self.http.last_command_result = self.last_command_result

    async def cmd_stop_charging(self):
        log.info(f"[{self.name}] 🔋 Simulating: Stop charging.")
        self.state.update_sim(is_charging=False)
        
        charging_data = {
            "status": "stopped",
            "message": "Battery charging stopped successfully"
        }
        
        await self.ws.emit("drone:status", {"droneId": self.name, "status": "charging_stopped", "data": charging_data})
        
        # Store the result for HTTP response
        self.last_command_result = {
            "success": True,
            "data": charging_data
        }
        # Also store in HTTP server
        if hasattr(self.http, 'last_command_result'):
            self.http.last_command_result = self.last_command_result

    async def cmd_start_camera_views(self):
        """Starts the live camera view windows."""
        if self.camera_views:
            await self.camera_views.start_viewing()
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "camera_views_started"})
        else:
            log.error(f"[{self.name}] Cannot start camera views, AirSim client not available.")
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "camera_views_failed", "reason": "AirSim not connected"})

    async def cmd_stop_camera_views(self):
        """Stops the live camera view windows."""
        if self.camera_views:
            await self.camera_views.stop_viewing()
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "camera_views_stopped"})

    async def cmd_show_qr_code(self, payload: str):
        """Shows QR code for delivery confirmation."""
        if not payload:
            log.warning(f"[{self.name}] No payload provided for QR code")
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "qr_failed", "reason": "No payload"})
            return
        
        try:
            log.info(f"[{self.name}] 📱 Showing QR code for delivery confirmation")
            success = await self.qr.show_and_scan(payload)
            if success:
                await self.ws.emit("drone:status", {"droneId": self.name, "status": "qr_displayed", "payload": payload})
            else:
                await self.ws.emit("drone:status", {"droneId": self.name, "status": "qr_failed", "reason": "Scan failed"})
        except Exception as e:
            log.error(f"[{self.name}] QR code display failed: {e}")
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "qr_failed", "reason": str(e)})

    async def cmd_confirm_delivery(self, params: Dict[str, Any]):
        """Confirm delivery (production flow): simulate package release and RTL."""
        try:
            log.info(f"[{self.name}] ✅ Delivery confirmed by backend. Releasing package and returning home...")
            # In real hardware, send servo/open payload mechanism here
            await asyncio.sleep(1.0)
            await self.ws.emit("drone:status", {"droneId": self.name, "status": "package_released"})
        except Exception:
            pass
        # Begin return-to-home sequence
        await self.cmd_rtl()

    async def disconnect(self):
        log.info(f"[{self.name}] Disconnecting services...")
        # Ensure camera views are stopped on disconnect
        if self.camera_views and self.camera_views.is_running:
            await self.camera_views.stop_viewing()
        
        if self.mavsdk: await self.mavsdk.disconnect()
        if self.ws: await self.ws.close()
        if self.http: await self.http.stop()