import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import droneTrackingService from '../../services/droneTrackingService';
import { Battery, Gauge, Navigation, Satellite, Signal, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Label } from '../ui/label';

const TelemetryDashboard = () => {
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    initializeTelemetry();
    return () => {
      droneTrackingService.disconnect();
    };
  }, []);

  const initializeTelemetry = async () => {
    try {
      await droneTrackingService.connect();
      
      // Listen for connection status
      droneTrackingService.on('tracking:connected', () => {
        setIsConnected(true);
        console.log('🚁 Connected to telemetry service');
      });

      droneTrackingService.on('tracking:disconnected', () => {
        setIsConnected(false);
        console.log('🔌 Disconnected from telemetry service');
      });

      // Listen for telemetry updates
      droneTrackingService.on('drone:telemetry_updated', handleTelemetryUpdate);
      droneTrackingService.on('drone:position_updated', handlePositionUpdate);

      // Load initial drones
      loadDrones();
      
    } catch (error) {
      console.error('Failed to initialize telemetry:', error);
    }
  };

  const loadDrones = async () => {
    try {
      const response = await fetch('/api/v1/drones', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const dronesData = await response.json();
        setDrones(dronesData.data || []);
      }
    } catch (error) {
      console.error('Failed to load drones:', error);
    }
  };

  const handleTelemetryUpdate = ({ droneId, telemetry }) => {
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, telemetry, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });

    // Store telemetry history
    setTelemetryHistory(prev => {
      const newHistory = new Map(prev);
      if (!newHistory.has(droneId)) {
        newHistory.set(droneId, []);
      }
      
      const droneHistory = newHistory.get(droneId);
      droneHistory.push({ ...telemetry, timestamp: new Date() });
      
      // Keep only last 100 readings
      if (droneHistory.length > 100) {
        droneHistory.shift();
      }
      
      newHistory.set(droneId, droneHistory);
      return newHistory;
    });
  };

  const handlePositionUpdate = ({ droneId, position }) => {
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, position, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'landing': return 'bg-orange-500';
      case 'taking_off': return 'bg-primary-500';
      default: return 'bg-gray-500';
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBatteryIcon = (battery) => {
    if (battery > 80) return <Battery className="w-5 h-5 text-green-600" />;
    if (battery > 40) return <Battery className="w-5 h-5 text-yellow-600" />;
    return <Battery className="w-5 h-5 text-red-600" />;
  };

  const getSignalStrength = (signal) => {
    if (signal > 80) return { bars: 5, color: 'text-green-600' };
    if (signal > 60) return { bars: 4, color: 'text-green-600' };
    if (signal > 40) return { bars: 3, color: 'text-yellow-600' };
    if (signal > 20) return { bars: 2, color: 'text-orange-600' };
    return { bars: 1, color: 'text-red-600' };
  };

  const getAltitudeStatus = (altitude) => {
    if (altitude > 300) return { status: 'High', color: 'text-red-600' };
    if (altitude > 150) return { status: 'Medium', color: 'text-yellow-600' };
    return { status: 'Low', color: 'text-green-600' };
  };

  const getSpeedStatus = (speed) => {
    if (speed > 25) return { status: 'Fast', color: 'text-red-600' };
    if (speed > 15) return { status: 'Normal', color: 'text-green-600' };
    return { status: 'Slow', color: 'text-primary-600' };
  };

  const getAuthToken = () => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  const getLastUpdateTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  const getConnectionQuality = (signal) => {
    if (signal > 80) return { quality: 'Excellent', color: 'text-green-600' };
    if (signal > 60) return { quality: 'Good', color: 'text-green-600' };
    if (signal > 40) return { quality: 'Fair', color: 'text-yellow-600' };
    if (signal > 20) return { quality: 'Poor', color: 'text-orange-600' };
    return { quality: 'Very Poor', color: 'text-red-600' };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Telemetry Dashboard</h1>
          <p className="text-gray-600">Real-time drone monitoring and status</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Badge>
          <div className="text-sm text-gray-600">
            {drones.length} drones • {drones.filter(d => d.telemetry?.status === 'active').length} active
          </div>
        </div>
      </div>

      {/* Fleet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Navigation className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Drones</p>
                <p className="text-2xl font-bold text-gray-900">{drones.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Drones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drones.filter(d => d.telemetry?.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Warning</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drones.filter(d => d.telemetry?.battery < 20).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {drones.filter(d => d.telemetry?.status === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Individual Drone Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {drones.map(drone => (
          <Card key={drone._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span>Drone {drone.name || drone._id}</span>
                  <Badge variant="outline" className={getStatusColor(drone.telemetry?.status)}>
                    {drone.telemetry?.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {drone.telemetry?.battery && getBatteryIcon(drone.telemetry.battery)}
                  <span className="text-sm text-gray-500">
                    {getLastUpdateTime(drone.lastUpdate)}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {drone.telemetry ? (
                <>
                  {/* Battery Status */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Battery Level</Label>
                      <span className={`text-sm font-semibold ${getBatteryColor(drone.telemetry.battery)}`}>
                        {drone.telemetry.battery}%
                      </span>
                    </div>
                    <Progress value={drone.telemetry.battery} className="h-2" />
                    {drone.telemetry.battery < 20 && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Low battery warning</p>
                    )}
                  </div>

                  {/* Flight Parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Gauge className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Altitude</span>
                      </div>
                      <p className="text-lg font-semibold">{drone.telemetry.altitude}m</p>
                      <p className={`text-xs ${getAltitudeStatus(drone.telemetry.altitude).color}`}>
                        {getAltitudeStatus(drone.telemetry.altitude).status}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Navigation className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Speed</span>
                      </div>
                      <p className="text-lg font-semibold">{drone.telemetry.speed}m/s</p>
                      <p className={`text-xs ${getSpeedStatus(drone.telemetry.speed).color}`}>
                        {getSpeedStatus(drone.telemetry.speed).status}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Satellite className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Heading</span>
                      </div>
                      <p className="text-lg font-semibold">{drone.telemetry.heading}°</p>
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full relative">
                        <div 
                          className="absolute inset-1 bg-blue-500 rounded-full"
                          style={{
                            transform: `rotate(${drone.telemetry.heading}deg)`,
                            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <Signal className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Signal</span>
                      </div>
                      <p className="text-lg font-semibold">{drone.telemetry.signal}%</p>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => {
                          const signalInfo = getSignalStrength(drone.telemetry.signal);
                          return (
                            <div
                              key={i}
                              className={`w-2 h-4 rounded ${
                                i < signalInfo.bars ? signalInfo.color : 'bg-gray-300'
                              }`}
                            />
                          );
                        })}
                      </div>
                      <p className={`text-xs ${getConnectionQuality(drone.telemetry.signal).color}`}>
                        {getConnectionQuality(drone.telemetry.signal).quality}
                      </p>
                    </div>
                  </div>

                  {/* Flight Mode and Status */}
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Flight Mode</p>
                        <Badge variant="outline" className="mt-1">
                          {drone.telemetry.mode || 'Unknown'}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Update</p>
                        <p className="text-sm font-medium mt-1">
                          {getLastUpdateTime(drone.lastUpdate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Position Information */}
                  {drone.position && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-2">Current Position</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Lat:</span>
                          <span className="ml-2 font-mono">{drone.position.latitude.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Lng:</span>
                          <span className="ml-2 font-mono">{drone.position.longitude.toFixed(6)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                  <p>Waiting for telemetry data...</p>
                  <p className="text-sm">Drone may be offline or not configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Drones Message */}
      {drones.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Navigation className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Drones Available</h3>
            <p className="text-gray-600">No drones have been registered or are currently online.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TelemetryDashboard;
