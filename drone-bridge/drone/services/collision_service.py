import asyncio
import logging

log = logging.getLogger("collision")

try:
    import airsim
except Exception:
    airsim = None

class CollisionService:
    def __init__(self, airsim_client):
        """Initialize with shared AirSim client"""
        self.client = airsim_client
        self.collided = False

    async def watch(self):
        # Check if the shared client is available
        if not self.client:
            log.warning("AirSim client not available, collision detection disabled.")
            return

        while True:
            try:
                # Use the shared self.client
                info = self.client.simGetCollisionInfo()
                if info and info.has_collided:
                    if not self.collided: # Log only on the first detection
                        log.warning(f"Collision detected with object: {info.object_name}")
                        self.collided = True
                else:
                    self.collided = False
                
                await asyncio.sleep(0.1)
            except Exception as e:
                log.error(f"Collision watch error: {e}")
                # If connection is lost, wait longer before retrying
                await asyncio.sleep(5.0)
