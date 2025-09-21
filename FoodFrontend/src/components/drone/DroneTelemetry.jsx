import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Battery, 
  Signal, 
  MapPin, 
  Navigation,
  Gauge,
  Thermometer,
  Wind,
  Eye,
  Clock
} from 'lucide-react';

const DroneTelemetry = ({ drone, telemetryData }) => {
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  // Add telemetry data to history when it updates
  useEffect(() => {
    if (telemetryData) {
      setTelemetryHistory(prev => {
        const newHistory = [...prev, { ...telemetryData, timestamp: Date.now() }];
        // Keep only last 50 readings
        return newHistory.slice(-50);
      });
    }
  }, [telemetryData]);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const clearHistory = () => {
    setTelemetryHistory([]);
  };

  const getBatteryColor = (level) => {
    if (level > 60) return 'text-green-500';
    if (level > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSignalColor = (signal) => {
    if (signal > 0.8) return 'text-green-500';
    if (signal > 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'idle': 'bg-gray-500',
      'in_flight': 'bg-blue-500',
      'delivering': 'bg-green-500',
      'returning_to_base': 'bg-yellow-500',
      'emergency_landing': 'bg-red-500',
      'hovering': 'bg-purple-500',
      'landed': 'bg-gray-400'
    };
    return statusColors[status] || 'bg-gray-500';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const calculateAverage = (values) => {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const getLatestValue = (key) => {
    if (telemetryHistory.length === 0) return null;
    return telemetryHistory[telemetryHistory.length - 1][key];
  };

  const getTrend = (key) => {
    if (telemetryHistory.length < 2) return 'stable';
    
    const recent = telemetryHistory.slice(-5);
    const first = recent[0][key];
    const last = recent[recent.length - 1][key];
    
    if (typeof first === 'number' && typeof last === 'number') {
      const change = last - first;
      const threshold = Math.abs(first) * 0.1; // 10% threshold
      
      if (change > threshold) return 'increasing';
      if (change < -threshold) return 'decreasing';
      return 'stable';
    }
    
    return 'stable';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return '↗️';
      case 'decreasing': return '↘️';
      default: return '→';
    }
  };

  if (!telemetryData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Telemetry Data</h3>
          <p className="text-muted-foreground">
            Telemetry data will appear here when the drone is active.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Telemetry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Current Telemetry</span>
            </span>
            <div className="flex items-center space-x-2">
              <Badge variant={isRecording ? 'destructive' : 'secondary'}>
                {isRecording ? 'Recording' : 'Live'}
              </Badge>
              <button
                onClick={toggleRecording}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isRecording 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isRecording ? 'Stop' : 'Start'} Recording
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Battery */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Battery className={`h-6 w-6 ${getBatteryColor(telemetryData.batteryLevel)}`} />
              </div>
              <p className="text-sm text-muted-foreground">Battery</p>
              <p className="text-2xl font-bold">{telemetryData.batteryLevel}%</p>
              <Progress value={telemetryData.batteryLevel} className="mt-2" />
            </div>

            {/* GPS Signal */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Signal className={`h-6 w-6 ${getSignalColor(telemetryData.gpsSignal || 0)}`} />
              </div>
              <p className="text-sm text-muted-foreground">GPS Signal</p>
              <p className="text-2xl font-bold">
                {((telemetryData.gpsSignal || 0) * 100).toFixed(0)}%
              </p>
              <Progress value={(telemetryData.gpsSignal || 0) * 100} className="mt-2" />
            </div>

            {/* Altitude */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">Altitude</p>
              <p className="text-2xl font-bold">{telemetryData.altitude || 0}m</p>
              <p className="text-xs text-muted-foreground">
                Max: {drone?.maxAltitude || 120}m
              </p>
            </div>

            {/* Speed */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">Speed</p>
              <p className="text-2xl font-bold">{telemetryData.speed || 0} m/s</p>
              <p className="text-xs text-muted-foreground">
                Max: {drone?.maxSpeed || 25} m/s
              </p>
            </div>
          </div>

          {/* Status and Location */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Navigation className="h-5 w-5 text-purple-500" />
                <span className="font-semibold">Status</span>
              </div>
              <Badge className={`${getStatusColor(telemetryData.status)} text-white`}>
                {telemetryData.status || 'Unknown'}
              </Badge>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Location</span>
              </div>
              <p className="text-sm">
                {telemetryData.location?.lat?.toFixed(6)}, {telemetryData.location?.lng?.toFixed(6)}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Last Update</span>
              </div>
              <p className="text-sm">
                {telemetryData.timestamp ? formatTimestamp(telemetryData.timestamp) : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telemetry History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Telemetry History</span>
            </span>
            <button
              onClick={clearHistory}
              className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Clear History
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {telemetryHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No telemetry history available
            </div>
          ) : (
            <div className="space-y-4">
              {/* History Chart */}
              <div className="h-32 bg-gray-50 rounded-lg p-4">
                <div className="flex items-end justify-between h-full space-x-1">
                  {telemetryHistory.slice(-20).map((reading, index) => (
                    <div
                      key={index}
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{
                        height: `${(reading.altitude || 0) / (drone?.maxAltitude || 120) * 100}%`,
                        minHeight: '4px'
                      }}
                      title={`${reading.altitude || 0}m at ${formatTimestamp(reading.timestamp)}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Altitude History (Last 20 readings)</span>
                  <span>Max: {Math.max(...telemetryHistory.map(r => r.altitude || 0))}m</span>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="font-semibold text-blue-900">Avg Altitude</p>
                  <p className="text-lg">{Math.round(calculateAverage(telemetryHistory.map(r => r.altitude || 0)))}m</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="font-semibold text-green-900">Avg Speed</p>
                  <p className="text-lg">{Math.round(calculateAverage(telemetryHistory.map(r => r.speed || 0)))} m/s</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="font-semibold text-yellow-900">Avg Battery</p>
                  <p className="text-lg">{Math.round(calculateAverage(telemetryHistory.map(r => r.batteryLevel || 0)))}%</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="font-semibold text-purple-900">Readings</p>
                  <p className="text-lg">{telemetryHistory.length}</p>
                </div>
              </div>

              {/* Recent Readings Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Altitude</th>
                      <th className="text-left p-2">Speed</th>
                      <th className="text-left p-2">Battery</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetryHistory.slice(-10).reverse().map((reading, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{formatTimestamp(reading.timestamp)}</td>
                        <td className="p-2">{reading.altitude || 0}m</td>
                        <td className="p-2">{reading.speed || 0} m/s</td>
                        <td className="p-2">{reading.batteryLevel || 0}%</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {reading.status || 'Unknown'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DroneTelemetry;
