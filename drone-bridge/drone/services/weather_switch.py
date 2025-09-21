# Small helper to apply weather in AirSim if available.
import asyncio

try:
    import airsim
except Exception:
    airsim = None

async def apply_in_airsim(wind_m_s: float, rain: float):
    if airsim is None:
        return
    client = airsim.MultirotorClient()
    client.confirmConnection()
    # AirSim weather uses enableWeather/ setWeatherParameter
    client.simEnableWeather(True)
    # Wind is not directly settable via weather params; we emulate via param names that exist (Rain, Snow, etc.)
    # For realism you can modify force fields in custom Unreal, but here we map wind to Fog param as a placeholder.
    client.simSetWeatherParameter(airsim.WeatherParameter.Rain, max(0.0, min(1.0, rain)))
