#!/usr/bin/env python3
"""
Test script to start drone bridge in simulation mode
"""
import asyncio
import sys
import os
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set environment variables for testing
os.environ['DEFAULT_MODE'] = 'simulation'
os.environ['DISPATCHER_MODE'] = 'parallel'
os.environ['ENABLE_TESTING_MODE'] = 'true'
os.environ['BRIDGE_HTTP_PORT_BASE'] = '8001'

from config.config import DRONES, DEFAULT_MODE, DISPATCHER_MODE, BRIDGE_HTTP_PORT_BASE
from drone.bridge import DroneBridge

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("test_bridge")

async def test_single_drone():
    """Test starting a single drone in simulation mode"""
    log.info("🚁 Testing single drone in simulation mode...")
    
    # Create a test drone
    drone_name = "DRONE-001"
    system_address = "udp://:14540"  # Simulation address
    
    try:
        bridge = DroneBridge(
            drone_name=drone_name,
            system_address=system_address,
            mode=DEFAULT_MODE,
            http_port=BRIDGE_HTTP_PORT_BASE,
            mavsdk_port=50041,
            enable_testing=True
        )
        
        log.info(f"✅ Drone bridge created for {drone_name}")
        log.info(f"🌐 HTTP server should be running on port {BRIDGE_HTTP_PORT_BASE}")
        
        # Start the bridge
        await bridge.run()
        
    except Exception as e:
        log.error(f"❌ Failed to start drone bridge: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Main test function"""
    log.info("🧪 Starting drone bridge test...")
    log.info(f"📋 Mode: {DEFAULT_MODE}")
    log.info(f"📋 Dispatcher: {DISPATCHER_MODE}")
    log.info(f"📋 HTTP Port Base: {BRIDGE_HTTP_PORT_BASE}")
    log.info(f"📋 Drones Config: {DRONES}")
    
    try:
        await test_single_drone()
    except KeyboardInterrupt:
        log.info("🛑 Test interrupted by user")
    except Exception as e:
        log.error(f"💥 Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
