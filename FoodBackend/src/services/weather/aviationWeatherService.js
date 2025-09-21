import { coreWeatherService } from './coreWeatherService.js';

class AviationWeatherService {
  constructor() {
    this.coreService = coreWeatherService;
  }

  /**
   * Get PX4-specific weather data for flight planning
   * @param {Object} location - Location coordinates
   * @param {Object} flightPlan - PX4 flight plan
   * @returns {Object} PX4 weather data
   */
  async getPX4WeatherData(location, flightPlan) {
    try {
      const weather = await this.coreService.getCurrentWeather(location.lat, location.lng);
      const forecast = await this.coreService.getWeatherForecast(location.lat, location.lng, 2);
      
      // PX4-specific weather parameters
      const px4Weather = {
        wind: {
          speed: weather.windSpeed,
          direction: weather.windDirection,
          gust: weather.windGust || 0,
          altitude: weather.windAltitude || 0
        },
        visibility: weather.visibility,
        ceiling: weather.cloudCover,
        temperature: weather.temperature,
        pressure: weather.pressure,
        humidity: weather.humidity,
        precipitation: weather.precipitation,
        turbulence: this.calculateTurbulence(weather, flightPlan),
        icing: this.calculateIcingRisk(weather, flightPlan),
        flightLevels: this.calculateFlightLevels(weather, flightPlan)
      };

      return {
        success: true,
        px4Weather: px4Weather,
        rawWeather: weather,
        forecast: forecast,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting PX4 weather data:', error);
      throw new Error('Failed to get PX4 weather data');
    }
  }

  /**
   * Get RealEngine simulation weather data
   * @param {Object} location - Location coordinates
   * @param {Object} simulationConfig - RealEngine simulation configuration
   * @returns {Object} RealEngine weather data
   */
  async getRealEngineWeatherData(location, simulationConfig) {
    try {
      const weather = await this.coreService.getCurrentWeather(location.lat, location.lng);
      const forecast = await this.coreService.getWeatherForecast(location.lat, location.lng, 3);
      
      // RealEngine-specific weather parameters
      const realEngineWeather = {
        atmospheric: {
          temperature: weather.temperature,
          pressure: weather.pressure,
          humidity: weather.humidity,
          density: this.calculateAirDensity(weather),
          wind: {
            speed: weather.windSpeed,
            direction: weather.windDirection,
            vertical: weather.windVertical || 0
          }
        },
        visibility: {
          horizontal: weather.visibility,
          vertical: weather.cloudCover,
          fog: weather.fog || 0
        },
        precipitation: {
          type: weather.precipitationType,
          intensity: weather.precipitation,
          accumulation: weather.accumulation || 0
        },
        turbulence: {
          intensity: this.calculateTurbulenceIndex(weather),
          altitude: this.getTurbulenceAltitude(weather),
          duration: this.getTurbulenceDuration(forecast)
        },
        icing: {
          risk: this.calculateIcingRisk(weather, simulationConfig),
          altitude: this.getIcingAltitude(weather),
          severity: this.getIcingSeverity(weather)
        },
        simulation: {
          timeScale: this.calculateTimeScale(weather),
          accuracy: this.calculateAccuracy(weather),
          updateFrequency: this.calculateUpdateFrequency(weather)
        }
      };

      return {
        success: true,
        realEngineWeather: realEngineWeather,
        rawWeather: weather,
        forecast: forecast,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting RealEngine weather data:', error);
      throw new Error('Failed to get RealEngine weather data');
    }
  }

  /**
   * Calculate turbulence based on weather conditions
   * @param {Object} weather - Weather data
   * @param {Object} flightPlan - Flight plan
   * @returns {string} Turbulence level
   */
  calculateTurbulence(weather, flightPlan) {
    const windSpeed = weather.windSpeed;
    const windGust = weather.windGust || 0;
    const gustFactor = windGust / windSpeed;

    if (windSpeed > 20 || gustFactor > 1.5) return 'severe';
    if (windSpeed > 15 || gustFactor > 1.3) return 'moderate';
    if (windSpeed > 10 || gustFactor > 1.2) return 'light';
    return 'none';
  }

  /**
   * Calculate icing risk
   * @param {Object} weather - Weather data
   * @param {Object} flightPlan - Flight plan
   * @returns {string} Icing risk level
   */
  calculateIcingRisk(weather, flightPlan) {
    const temp = weather.temperature;
    const humidity = weather.humidity;
    const precipitation = weather.precipitation;

    if (temp < 0 && humidity > 80 && precipitation > 0) return 'high';
    if (temp < 5 && humidity > 70 && precipitation > 0) return 'moderate';
    if (temp < 10 && humidity > 60) return 'low';
    return 'none';
  }

  /**
   * Calculate flight levels based on weather
   * @param {Object} weather - Weather data
   * @param {Object} flightPlan - Flight plan
   * @returns {Object} Flight level recommendations
   */
  calculateFlightLevels(weather, flightPlan) {
    const windSpeed = weather.windSpeed;
    const visibility = weather.visibility;
    const cloudCover = weather.cloudCover;

    let recommendedAltitude = 100; // Default altitude in meters

    if (windSpeed > 15) recommendedAltitude = Math.min(recommendedAltitude, 80);
    if (visibility < 5000) recommendedAltitude = Math.min(recommendedAltitude, 60);
    if (cloudCover > 80) recommendedAltitude = Math.min(recommendedAltitude, 50);

    return {
      recommended: recommendedAltitude,
      minimum: 30,
      maximum: 120,
      restrictions: this.getAltitudeRestrictions(weather)
    };
  }

  /**
   * Get altitude restrictions based on weather
   * @param {Object} weather - Weather data
   * @returns {Array} Altitude restrictions
   */
  getAltitudeRestrictions(weather) {
    const restrictions = [];

    if (weather.windSpeed > 20) restrictions.push('High wind - reduce altitude');
    if (weather.visibility < 3000) restrictions.push('Low visibility - maintain low altitude');
    if (weather.cloudCover > 90) restrictions.push('High cloud cover - stay below clouds');
    if (weather.precipitation > 10) restrictions.push('Heavy precipitation - avoid high altitude');

    return restrictions;
  }

  /**
   * Calculate air density
   * @param {Object} weather - Weather data
   * @returns {number} Air density in kg/m³
   */
  calculateAirDensity(weather) {
    const pressure = weather.pressure * 100; // Convert to Pa
    const temperature = weather.temperature + 273.15; // Convert to Kelvin
    const humidity = weather.humidity / 100; // Convert to decimal

    // Simplified air density calculation
    const R = 287.058; // Specific gas constant for air
    const density = pressure / (R * temperature);

    return density * (1 - 0.378 * humidity);
  }

  /**
   * Calculate turbulence index
   * @param {Object} weather - Weather data
   * @returns {number} Turbulence index (0-10)
   */
  calculateTurbulenceIndex(weather) {
    let index = 0;
    
    if (weather.windSpeed > 15) index += 3;
    if (weather.windGust && weather.windGust > weather.windSpeed * 1.3) index += 2;
    if (weather.visibility < 5000) index += 2;
    if (weather.cloudCover > 80) index += 1;
    if (weather.precipitation > 5) index += 2;

    return Math.min(index, 10);
  }

  /**
   * Get turbulence altitude
   * @param {Object} weather - Weather data
   * @returns {number} Turbulence altitude in meters
   */
  getTurbulenceAltitude(weather) {
    if (weather.windSpeed > 20) return 50;
    if (weather.windSpeed > 15) return 80;
    if (weather.windSpeed > 10) return 100;
    return 120;
  }

  /**
   * Get turbulence duration
   * @param {Object} forecast - Forecast data
   * @returns {number} Expected turbulence duration in hours
   */
  getTurbulenceDuration(forecast) {
    const turbulentHours = forecast.forecasts.filter(hour => 
      hour.windSpeed > 15 || hour.visibility < 5000
    ).length;
    
    return turbulentHours;
  }

  /**
   * Get icing altitude
   * @param {Object} weather - Weather data
   * @returns {number} Icing altitude in meters
   */
  getIcingAltitude(weather) {
    if (weather.temperature < -5) return 0;
    if (weather.temperature < 0) return 50;
    if (weather.temperature < 5) return 100;
    return 150;
  }

  /**
   * Get icing severity
   * @param {Object} weather - Weather data
   * @returns {string} Icing severity
   */
  getIcingSeverity(weather) {
    if (weather.temperature < -10 && weather.humidity > 90) return 'severe';
    if (weather.temperature < -5 && weather.humidity > 80) return 'moderate';
    if (weather.temperature < 0 && weather.humidity > 70) return 'light';
    return 'none';
  }

  /**
   * Calculate time scale for simulation
   * @param {Object} weather - Weather data
   * @returns {number} Time scale factor
   */
  calculateTimeScale(weather) {
    if (weather.windSpeed > 20) return 0.5; // Slower simulation for high wind
    if (weather.visibility < 3000) return 0.7; // Slower for low visibility
    return 1.0; // Normal speed
  }

  /**
   * Calculate simulation accuracy
   * @param {Object} weather - Weather data
   * @returns {number} Accuracy percentage
   */
  calculateAccuracy(weather) {
    let accuracy = 95; // Base accuracy

    if (weather.windSpeed > 15) accuracy -= 10;
    if (weather.visibility < 5000) accuracy -= 15;
    if (weather.cloudCover > 80) accuracy -= 5;
    if (weather.precipitation > 5) accuracy -= 10;

    return Math.max(accuracy, 60);
  }

  /**
   * Calculate update frequency
   * @param {Object} weather - Weather data
   * @returns {number} Update frequency in seconds
   */
  calculateUpdateFrequency(weather) {
    if (weather.windSpeed > 20) return 5; // More frequent updates for high wind
    if (weather.visibility < 5000) return 3; // More frequent for low visibility
    return 10; // Normal frequency
  }
}

export const aviationWeatherService = new AviationWeatherService();
export default aviationWeatherService;
