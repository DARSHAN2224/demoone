import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Cloud, 
  Sun, 
  Wind, 
  Thermometer, 
  Eye, 
  AlertTriangle,
  RefreshCw,
  MapPin
} from 'lucide-react';

const WeatherWidget = ({ location, droneType = 'standard' }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [safetyData, setSafetyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (location) {
      fetchWeatherData();
    }
  }, [location, droneType]);

  const fetchWeatherData = async () => {
    if (!location) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call - in real implementation, this would call the weather service
      const mockWeather = {
        temperature: 22,
        humidity: 65,
        windSpeed: 8,
        windDirection: 180,
        visibility: 10000,
        pressure: 1013,
        conditions: 'partly_cloudy',
        description: 'Partly cloudy with light winds'
      };
      
      const mockSafety = {
        safe: true,
        riskLevel: 'low',
        warnings: [],
        recommendations: ['Weather conditions are suitable for flight'],
        restrictions: []
      };
      
      setWeatherData(mockWeather);
      setSafetyData(mockSafety);
    } catch (error) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (conditions) => {
    const icons = {
      'clear': Sun,
      'partly_cloudy': Cloud,
      'cloudy': Cloud,
      'rain': Cloud,
      'snow': Cloud,
      'storm': Cloud
    };
    return icons[conditions] || Cloud;
  };

  const getWeatherColor = (conditions) => {
    const colors = {
      'clear': 'text-yellow-500',
      'partly_cloudy': 'text-blue-500',
      'cloudy': 'text-gray-500',
      'rain': 'text-primary-600',
      'snow': 'text-gray-400',
      'storm': 'text-red-500'
    };
    return colors[conditions] || 'text-gray-500';
  };

  const getSafetyColor = (riskLevel) => {
    const colors = {
      'low': 'bg-green-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-red-500'
    };
    return colors[riskLevel] || 'bg-gray-500';
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  const isFlightSafe = () => {
    if (!weatherData || !safetyData) return false;
    
    // Basic safety checks
    if (weatherData.windSpeed > 15) return false; // Too windy
    if (weatherData.visibility < 5000) return false; // Poor visibility
    if (weatherData.temperature < -10 || weatherData.temperature > 40) return false; // Extreme temperatures
    
    return safetyData.safe;
  };

  if (!location) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Location Data</h3>
          <p className="text-muted-foreground">
            Location coordinates are required to display weather information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Weather */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Cloud className="h-5 w-5" />
              <span>Current Weather</span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchWeatherData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading weather data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchWeatherData}>Retry</Button>
            </div>
          ) : weatherData ? (
            <div className="space-y-6">
              {/* Main Weather Display */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  {React.createElement(getWeatherIcon(weatherData.conditions), {
                    className: `h-16 w-16 ${getWeatherColor(weatherData.conditions)}`
                  })}
                </div>
                <h2 className="text-3xl font-bold mb-2">{weatherData.temperature}°C</h2>
                <p className="text-lg text-muted-foreground mb-2">{weatherData.description}</p>
                <p className="text-sm text-muted-foreground">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Thermometer className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Humidity</p>
                  <p className="text-lg font-semibold">{weatherData.humidity}%</p>
                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Wind className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Wind Speed</p>
                  <p className="text-lg font-semibold">{weatherData.windSpeed} m/s</p>
                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Wind className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Wind Direction</p>
                  <p className="text-lg font-semibold">{getWindDirection(weatherData.windDirection)}</p>
                </div>

                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Eye className="h-5 w-5 text-yellow-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">Visibility</p>
                  <p className="text-lg font-semibold">{(weatherData.visibility / 1000).toFixed(1)} km</p>
                </div>
              </div>

              {/* Additional Weather Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Pressure:</span>
                  <span className="ml-2">{weatherData.pressure} hPa</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Conditions:</span>
                  <span className="ml-2 capitalize">{weatherData.conditions.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Flight Safety Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Flight Safety Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {safetyData ? (
            <div className="space-y-4">
              {/* Safety Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Flight Safety Status</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on current weather conditions for {droneType} drone
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={`${getSafetyColor(safetyData.riskLevel)} text-white`}>
                    {safetyData.riskLevel.toUpperCase()} RISK
                  </Badge>
                  <div className="mt-2">
                    <Badge variant={isFlightSafe() ? 'default' : 'destructive'}>
                      {isFlightSafe() ? 'SAFE TO FLY' : 'UNSAFE TO FLY'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Safety Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-semibold mb-2 text-green-700">✅ Recommendations</h5>
                  <ul className="space-y-1 text-sm">
                    {safetyData.recommendations.map((rec, index) => (
                      <li key={index} className="text-green-600">• {rec}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold mb-2 text-red-700">⚠️ Warnings</h5>
                  {safetyData.warnings.length > 0 ? (
                    <ul className="space-y-1 text-sm">
                      {safetyData.warnings.map((warning, index) => (
                        <li key={index} className="text-red-600">• {warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-green-600">No warnings</p>
                  )}
                </div>
              </div>

              {/* Flight Restrictions */}
              {safetyData.restrictions.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h5 className="font-semibold mb-2 text-red-700">🚫 Flight Restrictions</h5>
                  <ul className="space-y-1 text-sm text-red-600">
                    {safetyData.restrictions.map((restriction, index) => (
                      <li key={index}>• {restriction}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Tips */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h5 className="font-semibold mb-2 text-blue-700">💡 Safety Tips</h5>
                <ul className="space-y-1 text-sm text-primary-600">
                  <li>• Always check weather conditions before takeoff</li>
                  <li>• Monitor wind speed and direction during flight</li>
                  <li>• Maintain visual line of sight</li>
                  <li>• Have emergency landing procedures ready</li>
                  <li>• Check local aviation regulations</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No safety assessment available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weather Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Weather Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="h-12 w-12 mx-auto mb-4" />
            <p>No active weather alerts for this location</p>
            <p className="text-sm">Weather alerts will appear here when conditions require attention</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherWidget;
