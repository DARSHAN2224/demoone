#!/usr/bin/env python3
"""
Comprehensive Backend-Drone Bridge Integration Test
Tests the connection between backend and drone bridge with detailed logging
"""
import asyncio
import aiohttp
import json
import time
import sys
import os
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class IntegrationTester:
    def __init__(self):
        self.backend_url = "http://localhost:8000"
        self.drone_bridge_urls = {
            "DRONE-001": "http://127.0.0.1:8001",
            "DRONE-002": "http://127.0.0.1:8002"
        }
        self.test_results = {}
        
    def log(self, message, level="INFO"):
        """Enhanced logging with timestamps"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        emoji = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌"}.get(level, "ℹ️")
        print(f"[{timestamp}] {emoji} {message}")
    
    async def test_backend_health(self):
        """Test backend health endpoint"""
        self.log("Testing backend health...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.backend_url}/api/v1/test/drone/health", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"Backend health: {data}", "SUCCESS")
                        return True
                    else:
                        self.log(f"Backend health failed: HTTP {response.status}", "ERROR")
                        return False
        except Exception as e:
            self.log(f"Backend health error: {e}", "ERROR")
            return False
    
    async def test_drone_bridge_health(self, drone_id, url):
        """Test individual drone bridge health"""
        self.log(f"Testing {drone_id} health...")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{url}/status", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"{drone_id} health: {data.get('status', 'unknown')}", "SUCCESS")
                        return True
                    else:
                        self.log(f"{drone_id} health failed: HTTP {response.status}", "ERROR")
                        return False
        except Exception as e:
            self.log(f"{drone_id} health error: {e}", "ERROR")
            return False
    
    async def test_backend_drone_connection(self, drone_id):
        """Test backend to drone bridge communication"""
        self.log(f"Testing backend -> {drone_id} connection...")
        try:
            async with aiohttp.ClientSession() as session:
                # Test drone status through backend
                async with session.get(f"{self.backend_url}/api/v1/test/drone/{drone_id}/status", timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"Backend -> {drone_id}: {data.get('status', 'unknown')}", "SUCCESS")
                        return True
                    else:
                        self.log(f"Backend -> {drone_id} failed: HTTP {response.status}", "ERROR")
                        return False
        except Exception as e:
            self.log(f"Backend -> {drone_id} error: {e}", "ERROR")
            return False
    
    async def test_drone_commands(self, drone_id):
        """Test drone command execution"""
        self.log(f"Testing {drone_id} commands...")
        commands = [
            ("takeoff", "POST"),
            ("land", "POST"),
            ("rtl", "POST"),
            ("emergency", "POST")
        ]
        
        results = {}
        for cmd, method in commands:
            try:
                async with aiohttp.ClientSession() as session:
                    if method == "POST":
                        async with session.post(f"{self.backend_url}/api/v1/test/drone/{drone_id}/{cmd}", timeout=10) as response:
                            if response.status in [200, 202]:
                                data = await response.json()
                                self.log(f"{drone_id} {cmd}: {data.get('message', 'success')}", "SUCCESS")
                                results[cmd] = True
                            else:
                                self.log(f"{drone_id} {cmd} failed: HTTP {response.status}", "WARNING")
                                results[cmd] = False
            except Exception as e:
                self.log(f"{drone_id} {cmd} error: {e}", "ERROR")
                results[cmd] = False
        
        return results
    
    async def test_weather_integration(self, drone_id):
        """Test weather service integration"""
        self.log(f"Testing {drone_id} weather integration...")
        try:
            async with aiohttp.ClientSession() as session:
                # Test weather check
                async with session.get(f"{self.backend_url}/api/v1/test/drone/{drone_id}/weather", timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"{drone_id} weather: {data.get('weather', 'unknown')}", "SUCCESS")
                        return True
                    else:
                        self.log(f"{drone_id} weather failed: HTTP {response.status}", "WARNING")
                        return False
        except Exception as e:
            self.log(f"{drone_id} weather error: {e}", "ERROR")
            return False
    
    async def test_battery_integration(self, drone_id):
        """Test battery service integration"""
        self.log(f"Testing {drone_id} battery integration...")
        try:
            async with aiohttp.ClientSession() as session:
                # Test battery status
                async with session.get(f"{self.backend_url}/api/v1/test/drone/{drone_id}/battery", timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.log(f"{drone_id} battery: {data.get('battery', 'unknown')}%", "SUCCESS")
                        return True
                    else:
                        self.log(f"{drone_id} battery failed: HTTP {response.status}", "WARNING")
                        return False
        except Exception as e:
            self.log(f"{drone_id} battery error: {e}", "ERROR")
            return False
    
    async def run_comprehensive_test(self):
        """Run comprehensive integration test"""
        self.log("🚀 Starting Backend-Drone Bridge Integration Test", "INFO")
        self.log("=" * 60, "INFO")
        
        # Test 1: Backend Health
        self.log("📋 Test 1: Backend Health Check", "INFO")
        backend_ok = await self.test_backend_health()
        self.test_results["backend_health"] = backend_ok
        
        if not backend_ok:
            self.log("❌ Backend not available, stopping tests", "ERROR")
            return
        
        # Test 2: Drone Bridge Health
        self.log("\n📋 Test 2: Drone Bridge Health Check", "INFO")
        drone_health = {}
        for drone_id, url in self.drone_bridge_urls.items():
            health = await self.test_drone_bridge_health(drone_id, url)
            drone_health[drone_id] = health
        self.test_results["drone_health"] = drone_health
        
        # Test 3: Backend-Drone Communication
        self.log("\n📋 Test 3: Backend-Drone Communication", "INFO")
        backend_drone_comm = {}
        for drone_id in self.drone_bridge_urls.keys():
            comm = await self.test_backend_drone_connection(drone_id)
            backend_drone_comm[drone_id] = comm
        self.test_results["backend_drone_comm"] = backend_drone_comm
        
        # Test 4: Drone Commands
        self.log("\n📋 Test 4: Drone Command Execution", "INFO")
        drone_commands = {}
        for drone_id in self.drone_bridge_urls.keys():
            if drone_health.get(drone_id, False):
                commands = await self.test_drone_commands(drone_id)
                drone_commands[drone_id] = commands
        self.test_results["drone_commands"] = drone_commands
        
        # Test 5: Weather Integration
        self.log("\n📋 Test 5: Weather Service Integration", "INFO")
        weather_integration = {}
        for drone_id in self.drone_bridge_urls.keys():
            weather = await self.test_weather_integration(drone_id)
            weather_integration[drone_id] = weather
        self.test_results["weather_integration"] = weather_integration
        
        # Test 6: Battery Integration
        self.log("\n📋 Test 6: Battery Service Integration", "INFO")
        battery_integration = {}
        for drone_id in self.drone_bridge_urls.keys():
            battery = await self.test_battery_integration(drone_id)
            battery_integration[drone_id] = battery
        self.test_results["battery_integration"] = battery_integration
        
        # Summary
        self.log("\n📊 Test Summary", "INFO")
        self.log("=" * 60, "INFO")
        
        # Backend
        backend_status = "✅ HEALTHY" if backend_ok else "❌ UNHEALTHY"
        self.log(f"Backend: {backend_status}", "INFO")
        
        # Drones
        for drone_id, health in drone_health.items():
            drone_status = "✅ HEALTHY" if health else "❌ UNHEALTHY"
            self.log(f"{drone_id}: {drone_status}", "INFO")
        
        # Commands
        for drone_id, commands in drone_commands.items():
            if commands:
                cmd_success = sum(1 for success in commands.values() if success)
                cmd_total = len(commands)
                self.log(f"{drone_id} Commands: {cmd_success}/{cmd_total} successful", "INFO")
        
        # Overall Status
        all_healthy = backend_ok and all(drone_health.values())
        overall_status = "✅ ALL SYSTEMS HEALTHY" if all_healthy else "⚠️ SOME ISSUES DETECTED"
        self.log(f"\nOverall Status: {overall_status}", "SUCCESS" if all_healthy else "WARNING")
        
        return self.test_results

async def main():
    """Main test runner"""
    tester = IntegrationTester()
    
    try:
        results = await tester.run_comprehensive_test()
        
        # Save results to file
        with open("integration_test_results.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        tester.log("Results saved to integration_test_results.json", "SUCCESS")
        
    except KeyboardInterrupt:
        tester.log("Test interrupted by user", "WARNING")
    except Exception as e:
        tester.log(f"Test failed with error: {e}", "ERROR")
    finally:
        tester.log("Integration test completed", "INFO")

if __name__ == "__main__":
    asyncio.run(main())
