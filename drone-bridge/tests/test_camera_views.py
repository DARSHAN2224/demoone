#!/usr/bin/env python3
"""
Test script for AirSim camera views
Run this to test if the camera view manager works correctly
"""

import asyncio
import sys
import os

# Add the drone-bridge directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import airsim
    from drone.services.camera_view_manager import CameraViewManager
    print("✅ AirSim and CameraViewManager imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure AirSim is installed and AirSimNH.exe is running")
    sys.exit(1)

async def test_camera_views():
    """Test the camera view manager"""
    try:
        # Connect to AirSim
        print("🔌 Connecting to AirSim...")
        client = airsim.MultirotorClient()
        client.confirmConnection()
        print("✅ Connected to AirSim successfully")
        
        # Create camera view manager
        print("📷 Creating camera view manager...")
        camera_manager = CameraViewManager(client)
        
        # Start camera views
        print("🚀 Starting camera views...")
        await camera_manager.start_viewing()
        print("✅ Camera views started! You should see 3 windows:")
        print("   - AirSim View - Camera 0 (Front)")
        print("   - AirSim View - Camera 1 (Bottom)")
        print("   - AirSim View - Camera 2 (Back)")
        print("Press Ctrl+C to stop...")
        
        # Keep running until interrupted
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping camera views...")
            await camera_manager.stop_viewing()
            print("✅ Camera views stopped")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure AirSimNH.exe is running and connected")

if __name__ == "__main__":
    print("🎮 AirSim Camera View Test")
    print("=" * 40)
    asyncio.run(test_camera_views())
