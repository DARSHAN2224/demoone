import axios from 'axios';
import { coreWeatherService } from './weather/coreWeatherService.js';

class WeatherIntegrationService {
    constructor() {
        this.weatherCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        this.droneBridgeUrls = {
            'DRONE-001': 'http://127.0.0.1:8001',
            'DRONE-002': 'http://127.0.0.1:8002'
        };
    }

    /**
     * Get weather data for drone operations
     * @param {string} droneId - Drone identifier
     * @param {Object} location - {lat, lng} coordinates
     * @returns {Object} Weather data with safety recommendations
     */
    async getWeatherForDrone(droneId, location) {
        try {
            const cacheKey = `${droneId}_${location.lat}_${location.lng}`;
            const cached = this.weatherCache.get(cacheKey);
            
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }

            // Get external weather data
            const externalWeather = await coreWeatherService.getCurrentWeather(
                location.lat, 
                location.lng
            );

            // Get drone bridge weather data (AirSim simulation)
            const droneWeather = await this.getDroneBridgeWeather(droneId);

            // Combine and analyze weather data
            const weatherAnalysis = this.analyzeWeatherSafety(externalWeather, droneWeather);

            const weatherData = {
                external: externalWeather,
                droneSimulation: droneWeather,
                analysis: weatherAnalysis,
                timestamp: new Date().toISOString(),
                droneId: droneId,
                location: location
            };

            // Cache the result
            this.weatherCache.set(cacheKey, {
                data: weatherData,
                timestamp: Date.now()
            });

            return weatherData;

        } catch (error) {
            console.error('Weather integration error:', error);
            throw new Error('Failed to get weather data for drone operations');
        }
    }

    /**
     * Get weather data from drone bridge (AirSim simulation)
     * @param {string} droneId - Drone identifier
     * @returns {Object} Drone bridge weather data
     */
    async getDroneBridgeWeather(droneId) {
        try {
            const bridgeUrl = this.droneBridgeUrls[droneId];
            if (!bridgeUrl) {
                throw new Error(`No bridge URL found for drone ${droneId}`);
            }

            const response = await axios.get(`${bridgeUrl}/weather/status`, {
                timeout: 5000
            });

            return response.data;

        } catch (error) {
            console.warn(`Failed to get drone bridge weather for ${droneId}:`, error.message);
            return {
                wind: { speed: 0, direction: 0 },
                rain: 0,
                fog: 0,
                temperature: 20,
                goodToFly: true,
                source: 'fallback'
            };
        }
    }

    /**
     * Analyze weather safety for drone operations
     * @param {Object} externalWeather - External weather data
     * @param {Object} droneWeather - Drone simulation weather data
     * @returns {Object} Safety analysis and recommendations
     */
    analyzeWeatherSafety(externalWeather, droneWeather) {
        const windSpeed = externalWeather.windSpeed || 0;
        const rain = externalWeather.precipitation || 0;
        const visibility = externalWeather.visibility || 10000;
        const temperature = externalWeather.temperature || 20;

        // Safety thresholds
        const MAX_WIND_SPEED = 10.0; // m/s
        const MAX_RAIN = 0.7; // mm/h
        const MIN_VISIBILITY = 1000; // meters
        const MIN_TEMPERATURE = -10; // Celsius
        const MAX_TEMPERATURE = 40; // Celsius

        // Check safety conditions
        const windSafe = windSpeed <= MAX_WIND_SPEED;
        const rainSafe = rain <= MAX_RAIN;
        const visibilitySafe = visibility >= MIN_VISIBILITY;
        const temperatureSafe = temperature >= MIN_TEMPERATURE && temperature <= MAX_TEMPERATURE;

        // Overall safety assessment
        const isSafeToFly = windSafe && rainSafe && visibilitySafe && temperatureSafe;

        // Risk level assessment
        let riskLevel = 'LOW';
        if (!windSafe || !rainSafe) riskLevel = 'HIGH';
        else if (!visibilitySafe || !temperatureSafe) riskLevel = 'MEDIUM';

        // Generate recommendations
        const recommendations = [];
        if (!windSafe) {
            recommendations.push({
                type: 'WIND',
                severity: 'HIGH',
                message: `Wind speed ${windSpeed.toFixed(1)} m/s exceeds safe limit of ${MAX_WIND_SPEED} m/s`,
                action: 'POSTPONE_FLIGHT'
            });
        }
        if (!rainSafe) {
            recommendations.push({
                type: 'RAIN',
                severity: 'HIGH',
                message: `Rain intensity ${rain.toFixed(1)} mm/h exceeds safe limit of ${MAX_RAIN} mm/h`,
                action: 'POSTPONE_FLIGHT'
            });
        }
        if (!visibilitySafe) {
            recommendations.push({
                type: 'VISIBILITY',
                severity: 'MEDIUM',
                message: `Visibility ${visibility}m below safe limit of ${MIN_VISIBILITY}m`,
                action: 'REDUCE_ALTITUDE'
            });
        }
        if (!temperatureSafe) {
            recommendations.push({
                type: 'TEMPERATURE',
                severity: 'MEDIUM',
                message: `Temperature ${temperature}°C outside safe range (${MIN_TEMPERATURE}°C to ${MAX_TEMPERATURE}°C)`,
                action: 'MONITOR_BATTERY'
            });
        }

        return {
            isSafeToFly,
            riskLevel,
            conditions: {
                wind: { safe: windSafe, value: windSpeed, limit: MAX_WIND_SPEED },
                rain: { safe: rainSafe, value: rain, limit: MAX_RAIN },
                visibility: { safe: visibilitySafe, value: visibility, limit: MIN_VISIBILITY },
                temperature: { safe: temperatureSafe, value: temperature, range: [MIN_TEMPERATURE, MAX_TEMPERATURE] }
            },
            recommendations,
            confidence: this.calculateConfidence(externalWeather, droneWeather)
        };
    }

    /**
     * Calculate confidence level in weather assessment
     * @param {Object} externalWeather - External weather data
     * @param {Object} droneWeather - Drone simulation weather data
     * @returns {number} Confidence level (0-1)
     */
    calculateConfidence(externalWeather, droneWeather) {
        let confidence = 0.8; // Base confidence

        // Reduce confidence if external and drone weather differ significantly
        if (droneWeather.source !== 'fallback') {
            const windDiff = Math.abs(externalWeather.windSpeed - (droneWeather.wind?.speed || 0));
            const rainDiff = Math.abs(externalWeather.precipitation - (droneWeather.rain || 0));
            
            if (windDiff > 2.0) confidence -= 0.2;
            if (rainDiff > 0.2) confidence -= 0.1;
        }

        // Reduce confidence for older data
        const dataAge = Date.now() - new Date(externalWeather.timestamp).getTime();
        if (dataAge > 10 * 60 * 1000) confidence -= 0.1; // 10 minutes

        return Math.max(0.1, Math.min(1.0, confidence));
    }

    /**
     * Send weather data to drone bridge
     * @param {string} droneId - Drone identifier
     * @param {Object} weatherData - Weather data to send
     */
    async sendWeatherToDrone(droneId, weatherData) {
        try {
            const bridgeUrl = this.droneBridgeUrls[droneId];
            if (!bridgeUrl) {
                throw new Error(`No bridge URL found for drone ${droneId}`);
            }

            await axios.post(`${bridgeUrl}/weather/update`, {
                weather: weatherData,
                timestamp: new Date().toISOString()
            }, {
                timeout: 5000
            });

            console.log(`Weather data sent to drone ${droneId}`);

        } catch (error) {
            console.error(`Failed to send weather to drone ${droneId}:`, error.message);
        }
    }

    /**
     * Get weather forecast for mission planning
     * @param {Object} location - {lat, lng} coordinates
     * @param {number} hours - Hours to forecast (default 6)
     * @returns {Object} Weather forecast data
     */
    async getWeatherForecast(location, hours = 6) {
        try {
            const forecast = await coreWeatherService.getWeatherForecast(
                location.lat, 
                location.lng, 
                Math.ceil(hours / 24)
            );

            // Analyze forecast for mission planning
            const missionAnalysis = this.analyzeForecastForMission(forecast, hours);

            return {
                forecast,
                missionAnalysis,
                recommendedWindow: this.findBestWeatherWindow(forecast, hours)
            };

        } catch (error) {
            console.error('Weather forecast error:', error);
            throw new Error('Failed to get weather forecast');
        }
    }

    /**
     * Analyze weather forecast for mission planning
     * @param {Object} forecast - Weather forecast data
     * @param {number} hours - Hours to analyze
     * @returns {Object} Mission planning analysis
     */
    analyzeForecastForMission(forecast, hours) {
        const forecasts = forecast.forecasts.slice(0, Math.ceil(hours * 2)); // Every 3 hours
        let safeWindows = 0;
        let riskyWindows = 0;
        let blockedWindows = 0;

        forecasts.forEach(forecast => {
            const windSpeed = forecast.windSpeed || 0;
            const rain = forecast.precipitation || 0;
            const visibility = forecast.visibility || 10000;

            if (windSpeed > 10 || rain > 0.7 || visibility < 1000) {
                blockedWindows++;
            } else if (windSpeed > 7 || rain > 0.3 || visibility < 2000) {
                riskyWindows++;
            } else {
                safeWindows++;
            }
        });

        return {
            totalWindows: forecasts.length,
            safeWindows,
            riskyWindows,
            blockedWindows,
            overallSafety: safeWindows / forecasts.length,
            recommendations: this.generateForecastRecommendations(safeWindows, riskyWindows, blockedWindows)
        };
    }

    /**
     * Find the best weather window for mission execution
     * @param {Object} forecast - Weather forecast data
     * @param {number} hours - Hours to search
     * @returns {Object} Best weather window
     */
    findBestWeatherWindow(forecast, hours) {
        const forecasts = forecast.forecasts.slice(0, Math.ceil(hours * 2));
        let bestWindow = null;
        let bestScore = -1;

        forecasts.forEach((forecast, index) => {
            const windSpeed = forecast.windSpeed || 0;
            const rain = forecast.precipitation || 0;
            const visibility = forecast.visibility || 10000;

            // Calculate safety score (0-1)
            const windScore = Math.max(0, 1 - (windSpeed / 10));
            const rainScore = Math.max(0, 1 - (rain / 0.7));
            const visibilityScore = Math.min(1, visibility / 10000);
            
            const totalScore = (windScore + rainScore + visibilityScore) / 3;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestWindow = {
                    startTime: new Date(forecast.timestamp),
                    endTime: new Date(forecast.timestamp + 3 * 60 * 60 * 1000), // 3 hours
                    score: totalScore,
                    conditions: {
                        windSpeed,
                        rain,
                        visibility,
                        temperature: forecast.temperature
                    }
                };
            }
        });

        return bestWindow;
    }

    /**
     * Generate recommendations based on forecast analysis
     * @param {number} safeWindows - Number of safe weather windows
     * @param {number} riskyWindows - Number of risky weather windows
     * @param {number} blockedWindows - Number of blocked weather windows
     * @returns {Array} Array of recommendations
     */
    generateForecastRecommendations(safeWindows, riskyWindows, blockedWindows) {
        const recommendations = [];

        if (safeWindows > 0) {
            recommendations.push({
                type: 'GO',
                message: `${safeWindows} safe weather windows available`,
                priority: 'HIGH'
            });
        }

        if (riskyWindows > 0) {
            recommendations.push({
                type: 'CAUTION',
                message: `${riskyWindows} risky weather windows - monitor conditions closely`,
                priority: 'MEDIUM'
            });
        }

        if (blockedWindows > 0) {
            recommendations.push({
                type: 'AVOID',
                message: `${blockedWindows} weather windows are unsafe - postpone mission`,
                priority: 'HIGH'
            });
        }

        if (safeWindows === 0 && riskyWindows === 0) {
            recommendations.push({
                type: 'POSTPONE',
                message: 'No safe weather windows available - postpone mission',
                priority: 'CRITICAL'
            });
        }

        return recommendations;
    }

    /**
     * Clear weather cache
     */
    clearCache() {
        this.weatherCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            size: this.weatherCache.size,
            entries: Array.from(this.weatherCache.entries()).map(([key, value]) => ({
                key,
                timestamp: value.timestamp,
                age: Date.now() - value.timestamp
            }))
        };
    }
}

export const weatherIntegrationService = new WeatherIntegrationService();
export default weatherIntegrationService;
