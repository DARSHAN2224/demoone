"""
A simple, centralized in-memory store for the drone's mission state.
This prevents state from being scattered across different modules.
"""
mission_state = {
    "is_running": False,
    "current_waypoint": 0,
    "total_waypoints": 0,
    "status_message": "Idle"
}