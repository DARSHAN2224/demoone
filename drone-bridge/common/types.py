from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional

class FlightSource(str, Enum):
    PX4 = "px4_sitl"
    SIM = "simulation"

@dataclass
class Telemetry:
    drone_id: str
    lat: float
    lng: float
    alt: float
    battery: float
    speed: float
    heading: float
    flight_mode: str
    armed: bool
    source: FlightSource
    timestamp_ms: int
    mode: str
    voltage: float = 0.0
    current: float = 0.0
    temperature: float = 0.0

@dataclass
class Waypoint:
    lat: float
    lng: float
    alt: float

@dataclass
class Mission:
    mission_id: str
    waypoints: List[Waypoint] = field(default_factory=list)
    rtl_after: bool = True
    proof_required: bool = True
    seller_pickup: bool = True
    user_delivery: bool = True
