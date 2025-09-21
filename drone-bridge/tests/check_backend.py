#!/usr/bin/env python3
"""
Quick Backend Health Check Script
Simple script to check if backend is running and accessible
"""
import asyncio
import aiohttp
import sys
import os
from datetime import datetime

def log(message, level="INFO"):
    """Simple logging with timestamps"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    emoji = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌"}.get(level, "ℹ️")
    print(f"[{timestamp}] {emoji} {message}")

async def check_backend():
    """Check if backend is running"""
    backend_url = "http://localhost:8000"
    
    log("Checking backend health...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test main health endpoint
            async with session.get(f"{backend_url}/api/v1/test/drone/health", timeout=5) as response:
                if response.status == 200:
                    data = await response.json()
                    log(f"Backend is running: {data}", "SUCCESS")
                    return True
                else:
                    log(f"Backend returned HTTP {response.status}", "WARNING")
                    return False
    except aiohttp.ClientConnectorError:
        log("Backend is not running or not accessible", "ERROR")
        return False
    except Exception as e:
        log(f"Backend check failed: {e}", "ERROR")
        return False

async def check_drone_bridge():
    """Check if drone bridge is running"""
    drone_urls = [
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8002"
    ]
    
    log("Checking drone bridge health...")
    
    healthy_drones = []
    for i, url in enumerate(drone_urls, 1):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/status", timeout=3) as response:
                    if response.status == 200:
                        data = await response.json()
                        log(f"DRONE-00{i}: {data.get('status', 'unknown')}", "SUCCESS")
                        healthy_drones.append(f"DRONE-00{i}")
                    else:
                        log(f"DRONE-00{i}: HTTP {response.status}", "WARNING")
        except Exception as e:
            log(f"DRONE-00{i}: Not accessible - {e}", "ERROR")
    
    if healthy_drones:
        log(f"Healthy drones: {', '.join(healthy_drones)}", "SUCCESS")
        return True
    else:
        log("No healthy drones found", "WARNING")
        return False

async def main():
    """Main health check"""
    log("🔍 Starting Health Check", "INFO")
    log("=" * 40, "INFO")
    
    # Check backend
    backend_ok = await check_backend()
    
    # Check drone bridge
    drone_ok = await check_drone_bridge()
    
    # Summary
    log("\n📊 Health Check Summary", "INFO")
    log("=" * 40, "INFO")
    
    backend_status = "✅ RUNNING" if backend_ok else "❌ NOT RUNNING"
    drone_status = "✅ RUNNING" if drone_ok else "❌ NOT RUNNING"
    
    log(f"Backend: {backend_status}", "INFO")
    log(f"Drone Bridge: {drone_status}", "INFO")
    
    if backend_ok and drone_ok:
        log("\n🎉 All systems are healthy! Ready for testing.", "SUCCESS")
    elif backend_ok:
        log("\n⚠️ Backend is running but drone bridge is not. Start drone bridge first.", "WARNING")
    elif drone_ok:
        log("\n⚠️ Drone bridge is running but backend is not. Start backend first.", "WARNING")
    else:
        log("\n❌ Neither backend nor drone bridge is running. Start both services.", "ERROR")
    
    return backend_ok and drone_ok

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        log("Health check interrupted", "WARNING")
        sys.exit(1)
