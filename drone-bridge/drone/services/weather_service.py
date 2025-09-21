import asyncio
import os
import time
from dataclasses import dataclass
from config.config import WEATHER_BLOCK_ENABLED, WEATHER_CHECK_SECONDS, WIND_MAX_M_S, RAIN_MAX
from . import weather_switch
import logging

log = logging.getLogger("weather")

@dataclass
class WeatherState:
    wind: float = 0.0
    rain: float = 0.0
    good_to_fly: bool = True

class WeatherService:
    def __init__(self):
        self.state = WeatherState()
        self.weather_pattern = os.getenv("WEATHER_PATTERN", "realistic")  # realistic, random, static
        self.base_wind = float(os.getenv("WEATHER_BASE_WIND", "3.0"))
        self.base_rain = float(os.getenv("WEATHER_BASE_RAIN", "0.1"))
        self.weather_cycle_time = float(os.getenv("WEATHER_CYCLE_TIME", "3600.0"))  # 1 hour cycle
        self.start_time = time.time()

    def current(self) -> WeatherState:
        return self.state

    async def set_profile(self, profile: str):
        """Set weather profile (Clear, Rain, Snow, Fog, Storm, Windy)."""
        try:
            if profile == "Clear":
                await self.set_external_conditions(wind=2.0, rain=0.0)
            elif profile == "Rain":
                await self.set_external_conditions(wind=5.0, rain=0.8)
            elif profile == "Snow":
                await self.set_external_conditions(wind=3.0, rain=0.3)
            elif profile == "Fog":
                await self.set_external_conditions(wind=1.0, rain=0.1)
            elif profile == "Storm":
                await self.set_external_conditions(wind=15.0, rain=1.0)
            elif profile == "Windy":
                await self.set_external_conditions(wind=12.0, rain=0.2)
            else:
                log.warning(f"Unknown weather profile: {profile}")
        except Exception as e:
            log.error(f"Failed to set weather profile {profile}: {e}")

    async def set_external_conditions(self, wind: float = 0.0, rain: float = 0.0, lat: float = None, lng: float = None):
        """Allow external controller to set weather directly, optionally based on location."""
        try:
            # If location is provided, try to get real weather data
            if lat is not None and lng is not None:
                try:
                    real_weather = await self._get_real_weather(lat, lng)
                    if real_weather:
                        self.state.wind = real_weather.get('wind', wind)
                        self.state.rain = real_weather.get('rain', rain)
                        log.info(f"Weather set from real location ({lat}, {lng}): wind={self.state.wind} m/s, rain={self.state.rain}")
                    else:
                        self.state.wind = max(0.0, float(wind))
                        self.state.rain = max(0.0, float(rain))
                except Exception as e:
                    log.warning(f"Failed to get real weather for location ({lat}, {lng}): {e}")
                    self.state.wind = max(0.0, float(wind))
                    self.state.rain = max(0.0, float(rain))
            else:
                self.state.wind = max(0.0, float(wind))
                self.state.rain = max(0.0, float(rain))
            
            self.state.good_to_fly = not WEATHER_BLOCK_ENABLED or (self.state.wind <= WIND_MAX_M_S and self.state.rain <= RAIN_MAX)
            log.info(f"Weather externally set: wind={self.state.wind} m/s, rain={self.state.rain}, fly_ok={self.state.good_to_fly}")
            
            # Try to reflect in AirSim if present
            try:
                await weather_switch.apply_in_airsim(self.state.wind, self.state.rain)
            except Exception:
                pass
        except Exception as e:
            log.error(f"Failed to set external weather conditions: {e}")

    async def _get_real_weather(self, lat: float, lng: float) -> dict:
        """Get real weather data for a specific location using OpenWeatherMap API."""
        try:
            import aiohttp
            import os
            
            # Get API key from environment
            api_key = os.getenv('OPENWEATHER_API_KEY')
            if not api_key:
                log.warning("OpenWeatherMap API key not found, using simulated weather")
                return None
            
            # OpenWeatherMap API endpoint
            url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={api_key}&units=metric"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract comprehensive weather data
                        wind_speed = data.get('wind', {}).get('speed', 0)  # m/s
                        rain = data.get('rain', {}).get('1h', 0)  # mm/h
                        weather_main = data.get('weather', [{}])[0].get('main', 'Clear')
                        weather_desc = data.get('weather', [{}])[0].get('description', 'clear sky')
                        temperature = data.get('main', {}).get('temp', 22.5)  # Celsius
                        humidity = data.get('main', {}).get('humidity', 68)  # %
                        pressure = data.get('main', {}).get('pressure', 1015.3)  # hPa
                        visibility = data.get('visibility', 10000) / 1000  # Convert to km
                        
                        # Convert rain from mm/h to 0-1 scale (assuming 10mm/h = 1.0)
                        rain_normalized = min(1.0, rain / 10.0)
                        
                        log.info(f"Real weather for ({lat}, {lng}): {weather_main}, wind={wind_speed} m/s, rain={rain} mm/h, temp={temperature}°C, humidity={humidity}%")
                        
                        return {
                            'wind': wind_speed,
                            'rain': rain_normalized,
                            'condition': weather_main,
                            'description': weather_desc,
                            'temperature': temperature,
                            'humidity': humidity,
                            'pressure': pressure,
                            'visibility': visibility
                        }
                    else:
                        log.warning(f"Failed to get real weather: HTTP {response.status}")
                        return None
                        
        except Exception as e:
            log.error(f"Error getting real weather: {e}")
            return None

    def _calculate_realistic_weather(self):
        """Calculate realistic weather based on time and patterns."""
        current_time = time.time()
        elapsed = current_time - self.start_time
        
        if self.weather_pattern == "static":
            # Static weather - no changes
            wind = self.base_wind
            rain = self.base_rain
        elif self.weather_pattern == "random":
            # Random weather (original behavior)
            import random
            wind = round(random.uniform(0, 15), 1)
            rain = round(random.uniform(0, 1), 2)
        else:  # realistic
            # Realistic weather simulation with daily patterns
            import math
            
            # Daily cycle (24 hours)
            daily_cycle = (elapsed % 86400) / 86400  # 0 to 1 over 24 hours
            
            # Wind patterns: higher during day, lower at night
            wind_base = self.base_wind + 2 * math.sin(daily_cycle * 2 * math.pi)
            wind_variation = 1.5 * math.sin(elapsed * 0.001)  # Slow variation
            wind = max(0, wind_base + wind_variation)
            
            # Rain patterns: more likely in afternoon/evening
            rain_probability = 0.3 + 0.4 * math.sin((daily_cycle - 0.3) * 2 * math.pi)
            if rain_probability > 0.7:
                rain = min(1.0, 0.2 + 0.6 * math.sin(elapsed * 0.0005))
            else:
                rain = max(0, 0.1 * math.sin(elapsed * 0.0003))
            
            # Add some realistic noise
            import random
            wind += random.uniform(-0.5, 0.5)
            rain += random.uniform(-0.05, 0.05)
            
            wind = max(0, min(20, wind))  # Clamp to realistic range
            rain = max(0, min(1, rain))
        
        return round(wind, 1), round(rain, 2)

    async def start(self, drone_location_callback=None):
        """Start weather monitoring with optional drone location callback for real-time weather updates."""
        while True:
            try:
                # If we have a drone location callback, try to get real weather
                if drone_location_callback:
                    try:
                        location = await drone_location_callback()
                        if location and 'lat' in location and 'lng' in location:
                            real_weather = await self._get_real_weather(location['lat'], location['lng'])
                            if real_weather:
                                self.state.wind = real_weather.get('wind', self.state.wind)
                                self.state.rain = real_weather.get('rain', self.state.rain)
                                log.info(f"Weather updated from drone location: wind={self.state.wind} m/s, rain={self.state.rain}")
                            else:
                                # Fallback to calculated weather
                                self.state.wind, self.state.rain = self._calculate_realistic_weather()
                        else:
                            # Fallback to calculated weather
                            self.state.wind, self.state.rain = self._calculate_realistic_weather()
                    except Exception as e:
                        log.warning(f"Failed to get location-based weather: {e}")
                        # Fallback to calculated weather
                        self.state.wind, self.state.rain = self._calculate_realistic_weather()
                else:
                    # Calculate weather based on pattern
                    self.state.wind, self.state.rain = self._calculate_realistic_weather()
                
                self.state.good_to_fly = not WEATHER_BLOCK_ENABLED or (self.state.wind <= WIND_MAX_M_S and self.state.rain <= RAIN_MAX)
                
                log.info(f"Weather update: wind={self.state.wind} m/s, rain={self.state.rain}, fly_ok={self.state.good_to_fly}")
                
                # Try to apply in AirSim (if running)
                try:
                    await weather_switch.apply_in_airsim(self.state.wind, self.state.rain)
                except Exception:
                    pass
            except Exception as e:
                log.error(f"Weather loop error: {e}")
            await asyncio.sleep(WEATHER_CHECK_SECONDS)
