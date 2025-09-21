// Export all weather services
export { coreWeatherService, default as CoreWeatherService } from './coreWeatherService.js';
export { flightSafetyService, default as FlightSafetyService } from './flightSafetyService.js';
export { aviationWeatherService, default as AviationWeatherService } from './aviationWeatherService.js';

// Main weather service that combines all functionality
import { coreWeatherService } from './coreWeatherService.js';
import { flightSafetyService } from './flightSafetyService.js';
import { aviationWeatherService } from './aviationWeatherService.js';

class WeatherService {
  constructor() {
    this.core = coreWeatherService;
    this.safety = flightSafetyService;
    this.aviation = aviationWeatherService;
  }

  // Core weather functionality
  async getCurrentWeather(lat, lng) {
    return this.core.getCurrentWeather(lat, lng);
  }

  async getWeatherForecast(lat, lng, days) {
    return this.core.getWeatherForecast(lat, lng, days);
  }

  async getWeatherAlerts(lat, lng) {
    return this.core.getWeatherAlerts(lat, lng);
  }

  // Flight safety functionality
  async checkFlightSafety(location, droneType) {
    return this.safety.checkFlightSafety(location, droneType);
  }

  // Aviation weather functionality
  async getPX4WeatherData(location, flightPlan) {
    return this.aviation.getPX4WeatherData(location, flightPlan);
  }

  async getRealEngineWeatherData(location, simulationConfig) {
    return this.aviation.getRealEngineWeatherData(location, simulationConfig);
  }

  // Utility methods
  clearCache() {
    return this.core.clearCache();
  }

  getCacheStats() {
    return this.core.getCacheStats();
  }
}

export const weatherService = new WeatherService();
export default weatherService;
