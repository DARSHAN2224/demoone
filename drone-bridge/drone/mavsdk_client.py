# drone/mavsdk_client.py
import asyncio
import logging
import os
from mavsdk import System
from mavsdk.mission import MissionItem, MissionPlan
from typing import List, Optional

from common.types import Telemetry, FlightSource
from utils.time import now_ms
from config.config import DroneMode

log = logging.getLogger("mavsdk")

class MavsdkClient:
    def __init__(self, drone_name: str, system_address: str, mavsdk_port: int):
        self.drone_name = drone_name
        self.system_address = system_address
        self.drone = System(port=mavsdk_port)
        self.is_connected = False
        
        # Dynamic configuration
        self.connection_timeout = float(os.getenv("MAVSDK_CONNECTION_TIMEOUT", "10.0"))
        self.default_temperature = float(os.getenv("DRONE_DEFAULT_TEMP", "25.0"))

    async def connect(self) -> bool:
        log.info(f"[{self.drone_name}] 🔌 Connecting to PX4 at: {self.system_address}")
        try:
            await self.drone.connect(system_address=self.system_address)
            log.info(f"[{self.drone_name}] Waiting for drone to connect...")
            await asyncio.wait_for(self.wait_for_connection(), timeout=self.connection_timeout)
            self.is_connected = True
            log.info(f"[{self.drone_name}] ✅ Connected to PX4")
            
            async for health in self.drone.telemetry.health():
                if health.is_gyrometer_calibration_ok and health.is_accelerometer_calibration_ok:
                     log.info(f"[{self.drone_name}] ✅ PX4 preflight checks passed.")
                else:
                     log.warning(f"[{self.drone_name}] ⚠️ PX4 preflight checks have warnings.")
                break
            return True
            
        except asyncio.TimeoutError:
            log.warning(f"[{self.drone_name}] ⏰ Timeout: No drone found at {self.system_address}.")
            return False
        except Exception as e:
            log.error(f"[{self.drone_name}] ❌ MAVSDK connection failed: {e}")
            self.is_connected = False
            return False

    async def wait_for_connection(self):
        async for state in self.drone.core.connection_state():
            if state.is_connected:
                return

    async def get_telemetry(self) -> Optional[Telemetry]:
        if not self.is_connected: return None
        try:
            pos, batt, mode, armed = await asyncio.gather(
                self.drone.telemetry.position().__anext__(),
                self.drone.telemetry.battery().__anext__(),
                self.drone.telemetry.flight_mode().__anext__(),
                self.drone.telemetry.armed().__anext__()
            )
            raw_percent = batt.remaining_percent
            battery_percent = raw_percent * 100 if raw_percent <= 1.0 else raw_percent
            return Telemetry(
                drone_id=self.drone_name,
                lat=round(pos.latitude_deg, 7), lng=round(pos.longitude_deg, 7),
                alt=round(pos.relative_altitude_m, 2), battery=round(battery_percent, 1),
                speed=0.0, heading=0.0, flight_mode=str(mode), armed=armed,
                source=FlightSource.PX4, timestamp_ms=now_ms(), mode=DroneMode.TESTING.value,
                voltage=round(batt.voltage_v, 2), current=round(batt.current_battery_a, 2),
                temperature=self.default_temperature  # MAVSDK doesn't provide temperature, using configurable default
            )
        except Exception as e:
            log.error(f"[{self.drone_name}] Telemetry error: {e}")
            self.is_connected = False
            return None

    async def arm(self): await self.drone.action.arm()
    async def takeoff(self, altitude: float):
        await self.drone.action.set_takeoff_altitude(altitude)
        await self.drone.action.takeoff()
    async def land(self): await self.drone.action.land()
    async def rtl(self): await self.drone.action.return_to_launch()
    async def upload_and_start_mission(self, mission_items: List[MissionItem], rtl_after=True):
        mission_plan = MissionPlan(mission_items)
        await self.drone.mission.set_return_to_launch_after_mission(rtl_after)
        await self.drone.mission.clear_mission()
        await self.drone.mission.upload_mission(mission_plan)
        log.info(f"[{self.drone_name}] 🔒 Arming for mission...")
        await self.arm()
        log.info(f"[{self.drone_name}] ▶️ Starting mission...")
        await self.drone.mission.start_mission()

    async def disconnect(self):
        if self.is_connected:
            self.is_connected = False