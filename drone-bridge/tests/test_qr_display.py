#!/usr/bin/env python3
"""
Test script for QR code display
"""

import asyncio
import sys
import os

# Add the drone-bridge directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from drone.services.qr_service import QRService
    print("✅ QRService imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

async def test_qr_display():
    """Test QR code display"""
    try:
        print("📱 Testing QR code display...")
        qr_service = QRService()
        
        # Test QR code display
        test_payload = "TEST-ORDER-12345"
        print(f"🔍 Showing QR code for: {test_payload}")
        
        success = await qr_service.show_and_scan(test_payload)
        
        if success:
            print("✅ QR code displayed and scanned successfully!")
        else:
            print("❌ QR code display failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("📱 QR Code Display Test")
    print("=" * 30)
    asyncio.run(test_qr_display())
