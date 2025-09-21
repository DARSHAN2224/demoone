import axios from 'axios';

class CoreWeatherService {
  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.weatherApiBaseUrl = 'https://api.openweathermap.org/data/2.5';
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get current weather for a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} Weather data
   */
  async getCurrentWeather(lat, lng) {
    try {
      const cacheKey = `${lat}_${lng}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }

      const response = await axios.get(
        `${this.weatherApiBaseUrl}/weather?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=metric`
      );

      const weatherData = this.parseWeatherData(response.data);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get weather forecast for a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} days - Number of days (1-5)
   * @returns {Object} Weather forecast
   */
  async getWeatherForecast(lat, lng, days = 3) {
    try {
      const response = await axios.get(
        `${this.weatherApiBaseUrl}/forecast?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&units=metric&cnt=${days * 8}`
      );

      return this.parseForecastData(response.data);
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      throw new Error('Failed to fetch weather forecast');
    }
  }

  /**
   * Get weather alerts for a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Array} Weather alerts
   */
  async getWeatherAlerts(lat, lng) {
    try {
      const response = await axios.get(
        `${this.weatherApiBaseUrl}/onecall?lat=${lat}&lon=${lng}&appid=${this.openWeatherApiKey}&exclude=current,minutely,hourly,daily`
      );

      return response.data.alerts || [];
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
      return [];
    }
  }

  /**
   * Parse raw weather data from API
   * @param {Object} rawData - Raw weather data
   * @returns {Object} Parsed weather data
   */
  parseWeatherData(rawData) {
    return {
      temperature: rawData.main.temp,
      feelsLike: rawData.main.feels_like,
      pressure: rawData.main.pressure,
      humidity: rawData.main.humidity,
      visibility: rawData.visibility,
      windSpeed: rawData.wind.speed,
      windDirection: rawData.wind.deg,
      windGust: rawData.wind.gust,
      cloudCover: rawData.clouds.all,
      precipitation: rawData.rain ? rawData.rain['1h'] || 0 : 0,
      precipitationType: rawData.weather[0].main,
      description: rawData.weather[0].description,
      icon: rawData.weather[0].icon,
      timestamp: rawData.dt * 1000,
      sunrise: rawData.sys.sunrise * 1000,
      sunset: rawData.sys.sunset * 1000,
      timezone: rawData.timezone
    };
  }

  /**
   * Parse forecast data from API
   * @param {Object} rawData - Raw forecast data
   * @returns {Object} Parsed forecast data
   */
  parseForecastData(rawData) {
    const forecasts = rawData.list.map(item => ({
      timestamp: item.dt * 1000,
      temperature: item.main.temp,
      pressure: item.main.pressure,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg,
      cloudCover: item.clouds.all,
      precipitation: item.rain ? item.rain['3h'] || 0 : 0,
      description: item.weather[0].description,
      icon: item.weather[0].icon
    }));

    return {
      forecasts: forecasts,
      city: rawData.city,
      timestamp: Date.now()
    };
  }

  /**
   * Clear weather cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }
}

export const coreWeatherService = new CoreWeatherService();
export default coreWeatherService;
