# drone/mission_manager.py
import logging
import asyncio
import os
from typing import List, Optional, Dict, Any
from mavsdk.mission import MissionItem

# --- Project Imports ---
from common.types import Waypoint
from config.config import REACH_TOLERANCE_M, SIM_SPEED_M_S, COLLISION_RETRY_ALTITUDE_ADJUST
from utils.geo import haversine_m
from .state_store import StateStore

log = logging.getLogger("mission")

class MissionManager:
    def __init__(self, drone_name: str, state_store: StateStore):
        self.drone_name = drone_name
        self.store = state_store
        self.waypoints: List[Waypoint] = []
        self.active = False
        self.index = 0
        self.mission_data: Optional[Dict[str, Any]] = None
        self.qr_service = None  # Will be set by bridge
        self.drone_bridge = None  # Will be set by bridge for real drone commands
        
        # Dynamic mission parameters from environment
        self.sim_speed = float(os.getenv("DRONE_SIM_SPEED", str(SIM_SPEED_M_S)))
        self.reach_tolerance = float(os.getenv("DRONE_REACH_TOLERANCE", str(REACH_TOLERANCE_M)))
        self.altitude_adjust_rate = float(os.getenv("DRONE_ALT_ADJUST_RATE", "0.1"))
        self.simulation_interval = float(os.getenv("DRONE_SIM_INTERVAL", "0.5"))

    def set_waypoints(self, wps: List[Waypoint], mission_data: Optional[Dict[str, Any]] = None):
        """Sets a new list of waypoints and activates the mission."""
        self.waypoints = wps
        self.index = 0
        self.active = True
        self.mission_data = mission_data or {}
        self.store.mission_active = True

    def clear(self):
        """Clears all mission data and deactivates."""
        self.waypoints = []
        self.index = 0
        self.active = False
        self.mission_data = None
        self.store.mission_active = False

    async def simulate_step(self):
        """
        If a simulated mission is active, this moves the drone's simulated
        position one step closer to the current target waypoint.
        """
        if not self.active or not self.waypoints or self.index >= len(self.waypoints):
            return

        s = self.store.sim_state
        target = self.waypoints[self.index]
        dist_to_target = haversine_m(s["lat"], s["lng"], target.lat, target.lng)

        # Check if the waypoint is reached.
        if dist_to_target <= self.reach_tolerance:
            log.info(f"[{self.drone_name}] 🎯 Reached waypoint {self.index + 1}/{len(self.waypoints)}")
            
            # Land the drone at the waypoint
            await self._land_at_waypoint()
            
            # Check if this is a delivery waypoint that requires QR verification
            current_waypoint = self.waypoints[self.index]
            if await self._is_delivery_waypoint(current_waypoint):
                log.info(f"[{self.drone_name}] 📦 Delivery waypoint detected, starting QR verification...")
                await self._handle_delivery_waypoint(current_waypoint)
            else:
                # For non-delivery waypoints, just log and continue
                log.info(f"[{self.drone_name}] ✅ Waypoint {self.index + 1} reached, continuing...")
                # Wait a bit at waypoint before continuing
                await asyncio.sleep(2)
            
            # Take off from waypoint
            await self._takeoff_from_waypoint()
            
            self.index += 1
            if self.index >= len(self.waypoints):
                log.info(f"[{self.drone_name}] 🏁 Mission complete!")
                self.clear() # Mission is complete
            return

        # Calculate movement for this tick (based on configurable interval).
        step_dist = self.sim_speed * self.simulation_interval
        ratio = min(1.0, step_dist / max(0.1, dist_to_target)) # Avoid division by zero

        # Update simulated position.
        new_lat = s["lat"] + (target.lat - s["lat"]) * ratio
        new_lng = s["lng"] + (target.lng - s["lng"]) * ratio
        # Move altitude more gradually with configurable rate.
        alt_diff = target.alt - s["alt"]
        new_alt = s["alt"] + alt_diff * self.altitude_adjust_rate

        self.store.update_sim(lat=new_lat, lng=new_lng, alt=new_alt, speed=self.sim_speed)

    async def _is_delivery_waypoint(self, waypoint: Waypoint) -> bool:
        """Check if the current waypoint is a delivery location that requires QR verification."""
        if not self.mission_data:
            return False
        
        # Check if this is the last waypoint (delivery destination)
        if self.index == len(self.waypoints) - 1:
            return True
        
        # Check if this waypoint matches the delivery location
        delivery_location = self.mission_data.get('deliveryLocation')
        if not delivery_location:
            # If no specific delivery location, treat last waypoint as delivery
            return self.index == len(self.waypoints) - 1
        
        # Simple distance check to determine if this is the delivery waypoint
        # In a real implementation, you might have waypoint metadata or IDs
        delivery_lat = delivery_location.get('lat')
        delivery_lng = delivery_location.get('lng')
        
        if delivery_lat and delivery_lng:
            distance = haversine_m(waypoint.lat, waypoint.lng, delivery_lat, delivery_lng)
            return distance <= self.reach_tolerance * 2  # Allow some tolerance
        
        return False

    async def _handle_delivery_waypoint(self, waypoint: Waypoint):
        """Handle QR code verification at delivery waypoint."""
        if not self.qr_service or not self.mission_data:
            log.warning(f"[{self.drone_name}] ⚠️ QR service or mission data not available")
            return
        
        try:
            # Get order information for QR code
            order_id = self.mission_data.get('orderId', 'UNKNOWN')
            customer_name = self.mission_data.get('customerInfo', {}).get('name', 'Customer')
            
            log.info(f"[{self.drone_name}] 📦 Starting delivery verification for order {order_id}")
            
            # Generate QR code payload
            qr_payload = f"Order-{order_id}-{customer_name}"
            
            # Show QR code and wait for verification
            log.info(f"[{self.drone_name}] 📱 Displaying QR code for delivery confirmation...")
            qr_success = await self.qr_service.show_and_scan(qr_payload)
            
            if qr_success:
                log.info(f"[{self.drone_name}] ✅ QR code verification successful for order {order_id}")
                # Update mission data with verification status
                self.mission_data['qr_verified'] = True
                self.mission_data['qr_verified_at'] = asyncio.get_event_loop().time()
                
                # Wait for user to close QR window before continuing
                await asyncio.sleep(2)
                log.info(f"[{self.drone_name}] 🚀 QR verification complete, continuing mission...")
            else:
                log.warning(f"[{self.drone_name}] ❌ QR code verification failed for order {order_id}")
                self.mission_data['qr_verified'] = False
                
                # Wait a bit before retrying or continuing
                await asyncio.sleep(1)
                
        except Exception as e:
            log.error(f"[{self.drone_name}] ❌ Error during QR verification: {e}")
            self.mission_data['qr_verified'] = False

    def set_qr_service(self, qr_service):
        """Set the QR service instance for this mission manager."""
        self.qr_service = qr_service

    def set_drone_bridge(self, drone_bridge):
        """Set the drone bridge instance for this mission manager."""
        self.drone_bridge = drone_bridge

    async def _land_at_waypoint(self):
        """Land the drone at the current waypoint."""
        try:
            log.info(f"[{self.drone_name}] 🛬 Landing at waypoint {self.index + 1}...")
            
            # Update simulation state to show landing
            self.store.update_sim(mode="LANDING")
            
            # If we have a drone bridge, send actual land command
            if self.drone_bridge:
                await self.drone_bridge.cmd_land()
            
            # Wait for landing to complete
            await asyncio.sleep(3)
            
            log.info(f"[{self.drone_name}] ✅ Landed at waypoint {self.index + 1}")
            
        except Exception as e:
            log.error(f"[{self.drone_name}] ❌ Failed to land at waypoint: {e}")

    async def _takeoff_from_waypoint(self):
        """Take off from the current waypoint."""
        try:
            log.info(f"[{self.drone_name}] 🚀 Taking off from waypoint {self.index + 1}...")
            
            # Update simulation state to show takeoff
            self.store.update_sim(mode="MISSION")
            
            # If we have a drone bridge, send actual takeoff command
            if self.drone_bridge:
                await self.drone_bridge.cmd_takeoff(20.0)  # Takeoff to 20m altitude
            
            # Wait for takeoff to complete
            await asyncio.sleep(3)
            
            log.info(f"[{self.drone_name}] ✅ Took off from waypoint {self.index + 1}")
            
        except Exception as e:
            log.error(f"[{self.drone_name}] ❌ Failed to take off from waypoint: {e}")

    def to_mavsdk_items(self) -> List[MissionItem]:
        """Converts the mission's waypoints to the MAVSDK MissionItem format."""
        items: List[MissionItem] = []
        if not self.waypoints:
            return items

        # Log waypoint coordinates for debugging
        log.info(f"[{self.drone_name}] Converting {len(self.waypoints)} waypoints to MAVSDK format:")
        for i, wp in enumerate(self.waypoints):
            log.info(f"[{self.drone_name}] WP {i+1}: lat={wp.lat}, lng={wp.lng}, alt={wp.alt}")

        # Add an explicit TAKEOFF command at the first waypoint's location.
        first = self.waypoints[0]
        log.info(f"[{self.drone_name}] TAKEOFF at: lat={first.lat}, lng={first.lng}, alt={first.alt}")
        items.append(MissionItem(
            first.lat, first.lng, first.alt,
            5.0, True, float('nan'), float('nan'),
            MissionItem.CameraAction.NONE, 0.0, 0.0,
            2.0, float('nan'), 0.0, MissionItem.VehicleAction.TAKEOFF
        ))
        
        # Add the rest of the waypoints.
        for wp in self.waypoints:
            items.append(MissionItem(
                wp.lat, wp.lng, wp.alt,
                5.0, True, float('nan'), float('nan'),
                MissionItem.CameraAction.NONE, 0.0, 0.0,
                2.0, float('nan'), 0.0, MissionItem.VehicleAction.NONE
            ))
        return items