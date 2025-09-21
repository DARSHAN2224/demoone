# start.py
import asyncio
import sys
import os
import logging
import logging.config
from typing import Dict, List
import os, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"  # .../FoodApp/.env
if ROOT_ENV.exists():
    load_dotenv(str(ROOT_ENV))
else:
    # Also allow local bridge .env
    local_env = Path(__file__).resolve().parents[0] / ".env"
    if local_env.exists():
        load_dotenv(str(local_env))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.config import (
    DRONES, DEFAULT_MODE, DISPATCHER_MODE,
    BRIDGE_HTTP_PORT_BASE, LOG_DIR, LOGGING_CONFIG, MAVSDK_SERVER_PORT_BASE
)
import json
import urllib.request
from drone.bridge import DroneBridge

logging.config.dictConfig(LOGGING_CONFIG)

os.makedirs(LOG_DIR, exist_ok=True)
log = logging.getLogger("fleet_manager")

class DroneManager:
    def __init__(self):
        self.drones: Dict[str, DroneBridge] = {}
        self.tasks: List[asyncio.Task] = []
        self._shutdown_requested = False
        # Enable testing mode by default for development
        self.enable_testing = os.getenv('ENABLE_TESTING_MODE', 'true').lower() == 'true'
        if self.enable_testing:
            log.info("🧪 Testing mode ENABLED - test commands will be allowed")
        else:
            log.info("🔒 Testing mode DISABLED - test commands will be blocked")

    async def start_drone_instance(self, name: str, address: str, http_port: int, mavsdk_port: int, home: dict = None):
        log.info(f"🚀 Initializing instance for {name}...")
        try:
            bridge = DroneBridge(
                drone_name=name,
                system_address=address,
                mode=DEFAULT_MODE,
                http_port=http_port,
                mavsdk_port=mavsdk_port,
                enable_testing=getattr(self, 'enable_testing', False),
                home_location=home
            )
            self.drones[name] = bridge
            await bridge.run()
            return name
        except Exception as e:
            log.error(f"❌ Critical error starting {name}: {e}", exc_info=True)
            if name in self.drones:
                del self.drones[name]
            return None

    def _fetch_drones_from_backend(self):
        """Fetch dynamic drone config from Node backend; fallback to static DRONES."""
        base_url = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000")
        url = f"{base_url}/api/v1/admin/drones/config"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    # Expect { success, data: { drones: [...] } } or direct array
                    payload = data.get("data", data)
                    drones = payload.get("drones", payload)
                    dynamic = {}
                    for i, d in enumerate(drones):
                        name = d.get("droneId") or f"DRONE-{i+1:03d}"
                        # Construct MAVSDK system address (expected by bridge); allow override
                        port = d.get("mavsdkPort") or (MAVSDK_SERVER_PORT_BASE + i)
                        addr = d.get("systemAddress") or f"udp://:{port}"
                        dynamic[name] = {"addr": addr, "home": d.get("homeLocation"), "mavsdkPort": port}
                    self.enable_testing = bool(payload.get("enableTestingMode", False))
                    if dynamic:
                        log.info(f"🔗 Loaded {len(dynamic)} drones from backend config")
                        return dynamic
        except Exception as e:
            log.warning(f"⚠️ Failed to fetch drones from backend: {e}. Falling back to static config.")
        return DRONES

    async def run_parallel(self):
        dynamic_drones = self._fetch_drones_from_backend()
        log.info(f"🚁 Starting {len(dynamic_drones)} drones in PARALLEL mode...")
        drone_items = list(dynamic_drones.items())
        
        for i, (name, meta) in enumerate(drone_items):
            http_port = BRIDGE_HTTP_PORT_BASE + i
            mavsdk_port = MAVSDK_SERVER_PORT_BASE + i
            task = asyncio.create_task(
                self.start_drone_instance(name, meta["addr"] if isinstance(meta, dict) else meta, http_port, mavsdk_port, home=meta.get("home") if isinstance(meta, dict) else None),
                name=f"bridge-{name}"
            )
            self.tasks.append(task)
        
        if not self.tasks:
            log.warning("⚠️ No drone tasks were created. Check DRONES configuration.")
            return

        results = await asyncio.gather(*self.tasks, return_exceptions=True)
        
        successful_drones = [res for res in results if res is not None and not isinstance(res, Exception)]
        failed_count = len(drone_items) - len(successful_drones)

        log.info("="*40)
        log.info("FLEET STARTUP SUMMARY")
        log.info(f"✅ Successfully launched {len(successful_drones)} out of {len(drone_items)} drones.")
        if failed_count > 0:
            log.warning(f"⚠️ Failed to launch {failed_count} drones. Check logs above for errors.")
        log.info("="*40)
        log.info("System is running. Press Ctrl+C to shut down.")
        
        while not self._shutdown_requested:
            await asyncio.sleep(1)

    async def shutdown(self):
        if self._shutdown_requested: return
        self._shutdown_requested = True
        log.info("🛑 Shutdown requested. Cleaning up all drone instances...")
        for name, bridge in self.drones.items():
            log.info(f"🔌 Disconnecting {name}...")
            await bridge.disconnect()
        for task in self.tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.drones.clear()
        self.tasks.clear()
        log.info("✅ Cleanup complete.")

async def main():
    manager = DroneManager()
    try:
        await manager.run_parallel()
    except KeyboardInterrupt:
        log.info("Keyboard interrupt (Ctrl+C) detected. Shutting down...")
    except Exception as e:
        log.error(f"💥 A fatal error occurred in the DroneManager: {e}", exc_info=True)
    finally:
        await manager.shutdown()
        log.info("👋 Drone Fleet Manager has shut down.")

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Shutdown requested.")