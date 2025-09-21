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
            # 1. Initial Takeoff
            logging.info("-- Arming drone.")
            await self.drone.action.arm()
            await self.drone.action.set_takeoff_altitude(self.config.DEFAULT_MISSION_ALTITUDE)
            logging.info("-- Taking off for mission start.")
            await self.drone.action.takeoff()
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
                    await self.drone.action.arm() # Re-arm for next leg
                    await self.drone.action.takeoff()
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