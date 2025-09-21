import asyncio
import logging
from mavsdk import System
from .state_store import mission_state
from .communication.ws_client import WebSocketClient
from config.config import Config

class MissionManager:
    """
    Manages the drone's flight missions with sequential, stateful execution.
    This ensures the drone lands at each waypoint and provides detailed, real-time
    feedback to the backend via WebSockets.
    """

    def __init__(self, drone: System, ws_client: WebSocketClient):
        self.drone = drone
        self.ws_client = ws_client
        self.config = Config()

    async def reset_drone_state(self):
        """Reset drone to a clean state before mission."""
        try:
            logging.info("-- Resetting drone state...")
            # Try to disarm first
            try:
                await self.drone.action.disarm()
                await asyncio.sleep(2)
                logging.info("-- Drone disarmed successfully.")
            except Exception as e:
                logging.info(f"-- Disarm not needed or failed: {e}")
            
            # Try to land if in air
            try:
                await self.drone.action.land()
                await asyncio.sleep(3)
                logging.info("-- Drone landed successfully.")
            except Exception as e:
                logging.info(f"-- Land not needed or failed: {e}")
                
        except Exception as e:
            logging.warning(f"-- Reset drone state failed: {e}")

    async def run_mission(self, waypoints: list):
        """
        Executes a multi-stage mission where the drone lands at each waypoint.
        """
        if mission_state["is_running"]:
            logging.warning("A mission is already in progress. Ignoring new request.")
            return

        mission_state.update({"is_running": True, "total_waypoints": len(waypoints), "current_waypoint": 0})
        logging.info(f"Starting mission with {len(waypoints)} waypoints.")

        try:
            # 0. Reset drone state first
            await self.reset_drone_state()
            
            # 0.5. Check if drone is connected and ready
            logging.info("-- Checking drone connection...")
            try:
                await asyncio.wait_for(self.drone.core.connection_state(), timeout=5.0)
                logging.info("-- Drone connection verified.")
            except asyncio.TimeoutError:
                logging.error("-- Drone connection check timed out. Mission aborted.")
                await self._send_status_update("ERROR", "Mission aborted: Drone not connected")
                return
            except Exception as e:
                logging.error(f"-- Drone connection check failed: {e}. Mission aborted.")
                await self._send_status_update("ERROR", f"Mission aborted: Drone connection failed - {e}")
                return
            
            # 1. Initial Takeoff
            logging.info("-- Arming drone.")
            try:
                await asyncio.wait_for(self.drone.action.arm(), timeout=10.0)
                logging.info("-- Drone armed successfully.")
            except asyncio.TimeoutError:
                logging.error("-- Arming timed out. Mission aborted.")
                await self._send_status_update("ERROR", "Mission aborted due to arming timeout")
                return
            except Exception as e:
                logging.error(f"-- Arming failed: {e}. Mission aborted.")
                await self._send_status_update("ERROR", f"Mission aborted due to an error: {e}")
                return
                
            await self.drone.action.set_takeoff_altitude(self.config.DEFAULT_MISSION_ALTITUDE)
            logging.info("-- Taking off for mission start.")
            try:
                await asyncio.wait_for(self.drone.action.takeoff(), timeout=15.0)
                logging.info("-- Takeoff successful.")
            except asyncio.TimeoutError:
                logging.error("-- Takeoff timed out. Mission aborted.")
                await self._send_status_update("ERROR", "Mission aborted due to takeoff timeout")
                return
            except Exception as e:
                logging.error(f"-- Takeoff failed: {e}. Mission aborted.")
                await self._send_status_update("ERROR", f"Mission aborted due to an error: {e}")
                return
                
            await asyncio.sleep(8)  # Allow time to stabilize

            # 2. Iterate through each waypoint sequentially
            for i, point in enumerate(waypoints):
                waypoint_num = i + 1
                mission_state["current_waypoint"] = waypoint_num
                
                await self._send_status_update("HEADING_TO_WAYPOINT", f"Flying to waypoint {waypoint_num}", waypoint_num)
                
                await self.drone.action.goto_location(
                    point['lat'], point['lng'], self.config.DEFAULT_MISSION_ALTITUDE, 0
                )
                await asyncio.sleep(15) # Simple wait for arrival, can be improved with distance checks

                await self._send_status_update("REACHED_WAYPOINT", f"Arrived at waypoint {waypoint_num}. Landing now.", waypoint_num)

                # 3. Land at the waypoint
                await self.drone.action.land()
                logging.info(f"-- Landed at waypoint {waypoint_num}. Pausing for 5 seconds.")
                await asyncio.sleep(5)  # Pause on the ground

                # 4. Take off again if this is not the final destination
                if waypoint_num < len(waypoints):
                    await self._send_status_update("PREPARING_NEXT_LEG", f"Taking off from waypoint {waypoint_num}", waypoint_num)
                    try:
                        await asyncio.wait_for(self.drone.action.arm(), timeout=10.0)
                        logging.info(f"-- Re-armed for waypoint {waypoint_num + 1}.")
                    except asyncio.TimeoutError:
                        logging.error(f"-- Re-arming timed out at waypoint {waypoint_num}. Mission aborted.")
                        await self._send_status_update("ERROR", f"Mission aborted due to re-arming timeout at waypoint {waypoint_num}")
                        return
                    except Exception as e:
                        logging.error(f"-- Re-arming failed at waypoint {waypoint_num}: {e}. Mission aborted.")
                        await self._send_status_update("ERROR", f"Mission aborted due to re-arming error at waypoint {waypoint_num}: {e}")
                        return
                    
                    try:
                        await asyncio.wait_for(self.drone.action.takeoff(), timeout=15.0)
                        logging.info(f"-- Takeoff from waypoint {waypoint_num} successful.")
                    except asyncio.TimeoutError:
                        logging.error(f"-- Takeoff timed out from waypoint {waypoint_num}. Mission aborted.")
                        await self._send_status_update("ERROR", f"Mission aborted due to takeoff timeout from waypoint {waypoint_num}")
                        return
                    except Exception as e:
                        logging.error(f"-- Takeoff failed from waypoint {waypoint_num}: {e}. Mission aborted.")
                        await self._send_status_update("ERROR", f"Mission aborted due to takeoff error from waypoint {waypoint_num}: {e}")
                        return
                    
                    await asyncio.sleep(8)

            # 5. Mission stages complete, return home
            await self._send_status_update("RETURNING_TO_LAUNCH", "All waypoints visited. Returning to base.")
            await self.drone.action.return_to_launch()
            await asyncio.sleep(20) # Allow time to return and land

            await self._send_status_update("MISSION_COMPLETE", "Drone has returned and landed safely. Mission finished.")
            logging.info("Mission successfully completed.")

        except Exception as e:
            logging.error(f"Mission failed with an error: {e}", exc_info=True)
            await self._send_status_update("ERROR", f"Mission aborted due to an error: {e}")
        finally:
            mission_state.update({"is_running": False, "current_waypoint": 0, "total_waypoints": 0})

    async def return_to_launch(self):
        """Commands the drone to immediately return to launch."""
        logging.info("RTL command received. Attempting to return to launch.")
        try:
            await self._send_status_update("RETURNING_TO_LAUNCH", "RTL command initiated by user.")
            await self.drone.action.return_to_launch()
            # Reset the state as the current mission is now aborted.
            mission_state.update({"is_running": False, "current_waypoint": 0, "total_waypoints": 0})
            return {"status": "success", "message": "Return-to-launch command sent."}
        except Exception as e:
            logging.error(f"Failed to execute return to launch: {e}")
            await self._send_status_update("ERROR", f"Failed to execute RTL: {e}")
            return {"status": "error", "message": str(e)}

    async def simple_takeoff(self, altitude=20):
        """Simple takeoff without mission - just arm and takeoff."""
        logging.info(f"Simple takeoff command - altitude: {altitude}m")
        try:
            await self._send_status_update("ARMING", "Arming drone for takeoff")
            await self.drone.action.arm()
            
            await self._send_status_update("TAKING_OFF", f"Taking off to {altitude}m")
            await self.drone.action.set_takeoff_altitude(altitude)
            await self.drone.action.takeoff()
            
            await self._send_status_update("HOVERING", f"Hovering at {altitude}m altitude")
            logging.info(f"Drone successfully took off to {altitude}m")
            
        except Exception as e:
            logging.error(f"Failed to execute simple takeoff: {e}")
            await self._send_status_update("ERROR", f"Takeoff failed: {e}")

    async def simple_land(self):
        """Simple landing without mission - just land."""
        logging.info("Simple land command")
        try:
            await self._send_status_update("LANDING", "Initiating landing sequence")
            await self.drone.action.land()
            
            await self._send_status_update("LANDED", "Drone has landed safely")
            logging.info("Drone successfully landed")
            
        except Exception as e:
            logging.error(f"Failed to execute simple land: {e}")
            await self._send_status_update("ERROR", f"Landing failed: {e}")

    async def _send_status_update(self, status: str, details: str, waypoint_num: int = None):
        """Helper function to format and send mission status updates."""
        progress = 0
        total = mission_state["total_waypoints"]
        current = waypoint_num if waypoint_num is not None else mission_state["current_waypoint"]

        if total > 0 and current > 0:
            if status == "REACHED_WAYPOINT":
                 progress = (current / total) * 100
            else:
                 progress = ((current - 1) / total) * 100
        if status == "MISSION_COMPLETE":
            progress = 100

        payload = {
            "status": status,
            "details": details,
            "currentWaypoint": current,
            "totalWaypoints": total,
            "progress": round(progress)
        }
        await self.ws_client.send_mission_update(payload)
        logging.info(f"Sent mission update: {status} - {details}")