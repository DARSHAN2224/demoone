import { coreWeatherService } from './coreWeatherService.js';

class FlightSafetyService {
  constructor() {
    this.coreService = coreWeatherService;
  }

  /**
   * Check flight safety based on weather conditions
   * @param {Object} location - Location coordinates
   * @param {string} droneType - Type of drone
   * @returns {Object} Safety assessment
   */
  async checkFlightSafety(location, droneType = 'standard') {
    try {
      const weather = await this.coreService.getCurrentWeather(location.lat, location.lng);
      const forecast = await this.coreService.getWeatherForecast(location.lat, location.lng, 1);
      
      // Define safety thresholds based on drone type
      const safetyThresholds = this.getSafetyThresholds(droneType);
      
      // Assess current conditions
      const currentSafety = this.assessWeatherConditions(weather, safetyThresholds);
      
      // Assess forecast conditions
      const forecastSafety = this.assessForecastConditions(forecast, safetyThresholds);
      
      // Overall safety assessment
      const overallSafety = this.calculateOverallSafety(currentSafety, forecastSafety);
      
      return {
        safe: overallSafety.safe,
        currentConditions: currentSafety,
        forecastConditions: forecastSafety,
        overallAssessment: overallSafety,
        weather: weather,
        forecast: forecast,
        timestamp: Date.now(),
        location: location,
        droneType: droneType
      };
    } catch (error) {
      console.error('Error checking flight safety:', error);
      return {
        safe: false,
        error: 'Weather safety check failed',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get safety thresholds based on drone type
   * @param {string} droneType - Type of drone
   * @returns {Object} Safety thresholds
   */
  getSafetyThresholds(droneType) {
    const thresholds = {
      standard: {
        windSpeed: 15, // m/s
        visibility: 5000, // meters
        precipitation: 5, // mm/h
        temperature: { min: -10, max: 45 }, // Celsius
        cloudCover: 80, // percentage
        turbulence: 'moderate'
      },
      heavy: {
        windSpeed: 12, // m/s
        visibility: 8000, // meters
        precipitation: 3, // mm/h
        temperature: { min: -5, max: 40 }, // Celsius
        cloudCover: 70, // percentage
        turbulence: 'light'
      },
      light: {
        windSpeed: 18, // m/s
        visibility: 3000, // meters
        precipitation: 8, // mm/h
        temperature: { min: -15, max: 50 }, // Celsius
        cloudCover: 90, // percentage
        turbulence: 'high'
      }
    };

    return thresholds[droneType] || thresholds.standard;
  }

  /**
   * Assess weather conditions against safety thresholds
   * @param {Object} weather - Weather data
   * @param {Object} thresholds - Safety thresholds
   * @returns {Object} Safety assessment
   */
  assessWeatherConditions(weather, thresholds) {
    const windSafe = weather.windSpeed <= thresholds.windSpeed;
    const visibilitySafe = weather.visibility >= thresholds.visibility;
    const precipitationSafe = weather.precipitation <= thresholds.precipitation;
    const temperatureSafe = weather.temperature >= thresholds.temperature.min && 
                           weather.temperature <= thresholds.temperature.max;
    const cloudSafe = weather.cloudCover <= thresholds.cloudCover;

    const safe = windSafe && visibilitySafe && precipitationSafe && temperatureSafe && cloudSafe;

    return {
      safe,
      wind: { safe: windSafe, value: weather.windSpeed, threshold: thresholds.windSpeed },
      visibility: { safe: visibilitySafe, value: weather.visibility, threshold: thresholds.visibility },
      precipitation: { safe: precipitationSafe, value: weather.precipitation, threshold: thresholds.precipitation },
      temperature: { safe: temperatureSafe, value: weather.temperature, thresholds: thresholds.temperature },
      cloudCover: { safe: cloudSafe, value: weather.cloudCover, threshold: thresholds.cloudCover },
      overall: safe
    };
  }

  /**
   * Assess forecast conditions
   * @param {Object} forecast - Forecast data
   * @param {Object} thresholds - Safety thresholds
   * @returns {Object} Forecast safety assessment
   */
  assessForecastConditions(forecast, thresholds) {
    const hourlyAssessments = forecast.forecasts.map(hour => 
      this.assessWeatherConditions(hour, thresholds)
    );

    const safeHours = hourlyAssessments.filter(hour => hour.safe).length;
    const totalHours = hourlyAssessments.length;
    const safetyPercentage = (safeHours / totalHours) * 100;

    return {
      safe: safetyPercentage >= 70,
      safetyPercentage,
      safeHours,
      totalHours,
      hourlyAssessments,
      trends: this.analyzeWeatherTrends(forecast.forecasts)
    };
  }

  /**
   * Calculate overall safety assessment
   * @param {Object} currentSafety - Current conditions safety
   * @param {Object} forecastSafety - Forecast conditions safety
   * @returns {Object} Overall safety assessment
   */
  calculateOverallSafety(currentSafety, forecastSafety) {
    const currentWeight = 0.6;
    const forecastWeight = 0.4;

    const currentScore = currentSafety.safe ? 100 : 0;
    const forecastScore = forecastSafety.safetyPercentage;

    const overallScore = (currentScore * currentWeight) + (forecastScore * forecastWeight);
    const safe = overallScore >= 70;

    return {
      safe,
      score: overallScore,
      currentScore,
      forecastScore,
      currentWeight,
      forecastWeight,
      recommendation: this.getSafetyRecommendation(overallScore)
    };
  }

  /**
   * Get safety recommendation based on score
   * @param {number} score - Safety score
   * @returns {string} Safety recommendation
   */
  getSafetyRecommendation(score) {
    if (score >= 90) return 'Excellent conditions for flight';
    if (score >= 80) return 'Good conditions for flight';
    if (score >= 70) return 'Acceptable conditions for flight';
    if (score >= 60) return 'Marginal conditions - exercise caution';
    if (score >= 50) return 'Poor conditions - not recommended';
    return 'Dangerous conditions - flight prohibited';
  }

  /**
   * Analyze weather trends
   * @param {Array} forecasts - Hourly forecasts
   * @returns {Object} Weather trends
   */
  analyzeWeatherTrends(forecasts) {
    const windTrend = this.calculateTrend(forecasts.map(f => f.windSpeed));
    const visibilityTrend = this.calculateTrend(forecasts.map(f => f.visibility));
    const temperatureTrend = this.calculateTrend(forecasts.map(f => f.temperature));

    return {
      wind: windTrend,
      visibility: visibilityTrend,
      temperature: temperatureTrend,
      overall: this.getOverallTrend([windTrend, visibilityTrend, temperatureTrend])
    };
  }

  /**
   * Calculate trend for a series of values
   * @param {Array} values - Series of values
   * @returns {string} Trend direction
   */
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    const threshold = (firstAvg + secondAvg) / 2 * 0.1; // 10% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Get overall trend from multiple trends
   * @param {Array} trends - Array of trend strings
   * @returns {string} Overall trend
   */
  getOverallTrend(trends) {
    const increasing = trends.filter(t => t === 'increasing').length;
    const decreasing = trends.filter(t => t === 'decreasing').length;
    
    if (increasing > decreasing) return 'improving';
    if (decreasing > increasing) return 'deteriorating';
    return 'stable';
  }
}

export const flightSafetyService = new FlightSafetyService();
export default flightSafetyService;
