# drone/state_store.py
import os
from typing import Optional, Dict, Any, Tuple
from common.types import Telemetry, FlightSource
from config.config import DroneMode
from utils.time import now_ms

class StateStore:
    def __init__(self, drone_id: str):
        self.drone_id = drone_id
        self.last_telemetry: Optional[Telemetry] = None
        self.mission_active = False
        self.flight_active = False
        # Dynamic home position from environment or default
        self.home_pos: Tuple[float, float] = self._get_home_position()
        # Dynamic initial values from environment or defaults
        self.sim_state: Dict[str, Any] = {
            "lat": self.home_pos[0], "lng": self.home_pos[1], "alt": 0.0,
            "battery": float(os.getenv("DRONE_INITIAL_BATTERY", "95.0")),  # Start with healthy battery
            "speed": 0.0, "heading": 0.0,
            "mode": "HOLD", "armed": False, "is_charging": False,
            "voltage": float(os.getenv("DRONE_INITIAL_VOLTAGE", "12.4")),  # Healthy voltage
            "current": 0.0, 
            "temperature": float(os.getenv("DRONE_INITIAL_TEMP", "25.0"))
        }

    def set_home(self, lat: float, lng: float):
        """Set home position and reset sim origin accordingly."""
        try:
            self.home_pos = (float(lat), float(lng))
            # Reset sim to home if currently at origin altitude 0
            self.sim_state["lat"] = self.home_pos[0]
            self.sim_state["lng"] = self.home_pos[1]
        except Exception:
            pass

    def snapshot(self) -> Dict[str, Any]:
        if not self.last_telemetry:
            return {"success": False, "message": "No telemetry yet"}
        t = self.last_telemetry
        return {
            "droneId": t.drone_id, "lat": t.lat, "lng": t.lng, "alt": t.alt,
            "battery": t.battery, "speed": t.speed, "heading": t.heading,
            "flightMode": t.flight_mode, "armed": t.armed, "timestamp": t.timestamp_ms,
            "mode": t.mode, "source": t.source.value,
        }

    def get_sim_telemetry(self) -> Telemetry:
        s = self.sim_state
        
        # Dynamic battery simulation based on activity and environment
        battery_drain_rate = float(os.getenv("DRONE_BATTERY_DRAIN_RATE", "0.02"))
        battery_charge_rate = float(os.getenv("DRONE_BATTERY_CHARGE_RATE", "0.2"))
        
        if s["is_charging"] and s["battery"] < 100:
            # Charging: increase battery
            s["battery"] += battery_charge_rate
            s["voltage"] = min(12.8, s["voltage"] + 0.01)  # Voltage increases during charging
            s["current"] = 2.0  # Charging current
        elif not s["is_charging"] and s["armed"] and s["battery"] > 0:
            # Flying: drain battery based on activity
            drain_multiplier = 1.0
            if s["speed"] > 0:
                drain_multiplier += s["speed"] * 0.1  # More drain at higher speeds
            if s["alt"] > 50:
                drain_multiplier += 0.5  # More drain at higher altitudes
            
            s["battery"] -= battery_drain_rate * drain_multiplier
            s["voltage"] = max(10.0, s["voltage"] - 0.005)  # Voltage decreases with usage
            s["current"] = 5.0 + (s["speed"] * 0.5)  # Current based on activity
        else:
            # Idle: minimal drain
            s["battery"] -= battery_drain_rate * 0.1
            s["current"] = 0.5  # Idle current
        
        # Clamp values to realistic ranges
        s["battery"] = max(0, min(100, s["battery"]))
        s["voltage"] = max(10.0, min(12.8, s["voltage"]))
        s["current"] = max(0.0, min(20.0, s["current"]))
        
        # Temperature varies with activity and battery level
        base_temp = float(os.getenv("DRONE_BASE_TEMP", "25.0"))
        temp_increase = (s["current"] * 0.5) + (s["battery"] < 20 and 5.0 or 0.0)
        s["temperature"] = base_temp + temp_increase

        return Telemetry(
            drone_id=self.drone_id, lat=round(s["lat"], 7),
            lng=round(s["lng"], 7), alt=round(s["alt"], 2),
            battery=round(s["battery"], 1), speed=round(s["speed"], 2),
            heading=round(s["heading"], 2), flight_mode=s["mode"],
            armed=bool(s["armed"]), source=FlightSource.SIM,
            timestamp_ms=now_ms(), mode=DroneMode.SIMULATION.value,
            voltage=round(s["voltage"], 2), current=round(s["current"], 2),
            temperature=round(s["temperature"], 1)
        )

    def _get_home_position(self) -> Tuple[float, float]:
        """Get home position from environment variables or use default."""
        try:
            lat = float(os.getenv("DRONE_HOME_LAT", "47.6414678"))
            lng = float(os.getenv("DRONE_HOME_LNG", "-122.1401649"))
            return (lat, lng)
        except (ValueError, TypeError):
            # Fallback to default Seattle coordinates
            return (47.6414678, -122.1401649)
    
    def update_sim(self, **kwargs):
        self.sim_state.update(kwargs)