#!/usr/bin/env python3
"""
Test script for shared AirSim connection
This tests that multiple services can use the same AirSim client without conflicts
"""

import asyncio
import sys
import os

# Add the drone-bridge directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import airsim
    from drone.services.camera_service import CameraService
    from drone.services.collision_service import CollisionService
    from drone.services.camera_view_manager import CameraViewManager
    print("✅ All services imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure AirSim is installed and AirSimNH.exe is running")
    sys.exit(1)

async def test_shared_connection():
    """Test that multiple services can use the same AirSim client"""
    try:
        # Create the shared AirSim client (like in bridge.py)
        print("🔌 Creating shared AirSim client...")
        shared_client = airsim.MultirotorClient()
        shared_client.confirmConnection()
        print("✅ Shared AirSim client connected successfully")
        
        # Create services with the shared client
        print("📷 Creating services with shared client...")
        camera_service = CameraService(shared_client)
        collision_service = CollisionService(shared_client)
        camera_view_manager = CameraViewManager(shared_client)
        print("✅ All services created with shared client")
        
        # Test camera capture (this was failing before)
        print("📸 Testing camera capture...")
        photo_path = await camera_service.capture_delivery_photo("TEST-DRONE", "bottom")
        print(f"✅ Photo captured: {photo_path}")
        
        # Test camera view manager
        print("🎥 Testing camera view manager...")
        await camera_view_manager.start_viewing()
        print("✅ Camera views started")
        
        # Let it run for a few seconds
        print("⏱️ Running for 3 seconds...")
        await asyncio.sleep(3)
        
        # Stop camera views
        print("🛑 Stopping camera views...")
        await camera_view_manager.stop_viewing()
        print("✅ Camera views stopped")
        
        print("\n🎉 All tests passed! Shared AirSim connection works correctly.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure AirSimNH.exe is running and connected")

if __name__ == "__main__":
    print("🔧 Shared AirSim Connection Test")
    print("=" * 40)
    asyncio.run(test_shared_connection())
