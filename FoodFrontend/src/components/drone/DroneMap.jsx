import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Navigation, 
  Target, 
  Route,
  ZoomIn,
  ZoomOut,
  Crosshair
} from 'lucide-react';

const DroneMap = ({ drone, telemetryData, activeFlights }) => {
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [zoom, setZoom] = useState(15);
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const mapRef = useRef(null);

  // Initialize map center when drone data changes
  useEffect(() => {
    if (drone?.currentLocation) {
      setMapCenter(drone.currentLocation);
    } else if (drone?.baseLocation) {
      setMapCenter(drone.baseLocation);
    }
  }, [drone]);

  // Update map center when telemetry updates
  useEffect(() => {
    if (telemetryData?.location) {
      setMapCenter(telemetryData.location);
    }
  }, [telemetryData]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 1, 10));
  };

  const centerOnDrone = () => {
    if (telemetryData?.location) {
      setMapCenter(telemetryData.location);
    }
  };

  const getDroneStatusColor = (status) => {
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

  const getFlightPathColor = (status) => {
    const pathColors = {
      'planned': 'stroke-blue-400',
      'active': 'stroke-green-400',
      'completed': 'stroke-gray-400',
      'cancelled': 'stroke-red-400'
    };
    return pathColors[status] || 'stroke-blue-400';
  };

  // Mock map rendering (in real implementation, this would use Google Maps or similar)
  const renderMap = () => {
    const centerLat = mapCenter.lat;
    const centerLng = mapCenter.lng;
    const zoomFactor = Math.pow(2, zoom - 15);
    const pixelScale = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / (256 * zoomFactor);

    return (
      <div className="relative w-full h-96 bg-gray-100 border rounded-lg overflow-hidden">
        {/* Map Grid */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="absolute w-full h-px bg-gray-300" style={{ top: `${i * 10}%` }} />
            ))}
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="absolute h-full w-px bg-gray-300" style={{ left: `${i * 10}%` }} />
            ))}
          </div>
        </div>

        {/* Base Location */}
        {drone?.baseLocation && (
          <div
            className="absolute w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            title="Base Location"
          >
            <MapPin className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Drone Current Position */}
        {telemetryData?.location && (
          <div
            className={`absolute w-8 h-8 ${getDroneStatusColor(telemetryData.status)} rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-pulse`}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            title={`Drone: ${telemetryData.status} at ${telemetryData.altitude}m`}
          >
            <Navigation className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Flight Path */}
        {showFlightPath && activeFlights?.flightPlan && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path
              d={generateFlightPath(activeFlights.flightPlan.waypoints, centerLat, centerLng, pixelScale)}
              stroke={getFlightPathColor(activeFlights.status)}
              strokeWidth="3"
              fill="none"
              strokeDasharray="5,5"
              opacity="0.7"
            />
          </svg>
        )}

        {/* Waypoints */}
        {showWaypoints && activeFlights?.flightPlan?.waypoints && (
          activeFlights.flightPlan.waypoints.map((waypoint, index) => (
            <div
              key={index}
              className="absolute w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-md flex items-center justify-center"
              style={{
                left: `${50 + (waypoint.lng - centerLng) / pixelScale * 256}%`,
                top: `${50 - (waypoint.lat - centerLat) / pixelScale * 256}%`,
                transform: 'translate(-50%, -50%)'
              }}
              title={`Waypoint ${index + 1}: ${waypoint.altitude}m`}
            >
              <Target className="w-2 h-2 text-white" />
            </div>
          ))
        )}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleZoomIn}
            className="w-8 h-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleZoomOut}
            className="w-8 h-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={centerOnDrone}
            className="w-8 h-8 p-0"
          >
            <Crosshair className="w-4 h-4" />
          </Button>
        </div>

        {/* Map Info */}
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="text-sm space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Zoom:</span>
              <span>{zoom}x</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Center:</span>
              <span>{centerLat.toFixed(6)}, {centerLng.toFixed(6)}</span>
            </div>
            {telemetryData?.location && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold">Drone:</span>
                <span>{telemetryData.location.lat.toFixed(6)}, {telemetryData.location.lng.toFixed(6)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Generate SVG path for flight plan
  const generateFlightPath = (waypoints, centerLat, centerLng, pixelScale) => {
    if (!waypoints || waypoints.length < 2) return '';

    const points = waypoints.map((waypoint, index) => {
      const x = 50 + (waypoint.lng - centerLng) / pixelScale * 256;
      const y = 50 - (waypoint.lat - centerLat) / pixelScale * 256;
      return `${x}% ${y}%`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Drone Map</span>
          </span>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={showFlightPath ? 'default' : 'outline'}
              onClick={() => setShowFlightPath(!showFlightPath)}
            >
              <Route className="w-4 h-4 mr-2" />
              Path
            </Button>
            <Button
              size="sm"
              variant={showWaypoints ? 'default' : 'outline'}
              onClick={() => setShowWaypoints(!showWaypoints)}
            >
              <Target className="w-4 h-4 mr-2" />
              Waypoints
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderMap()}
        
        {/* Map Legend */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
            <span>Base Location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <span>Drone Position</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
            <span>Waypoints</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
            <span>Flight Path</span>
          </div>
        </div>

        {/* Flight Status */}
        {activeFlights && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Active Flight</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span>
                <Badge variant="outline" className="ml-2">
                  {activeFlights.status || 'Unknown'}
                </Badge>
              </div>
              <div>
                <span className="font-medium">ETA:</span>
                <span className="ml-2">
                  {activeFlights.eta ? new Date(activeFlights.eta).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-medium">Distance:</span>
                <span className="ml-2">
                  {activeFlights.distance ? `${activeFlights.distance}m` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="font-medium">Altitude:</span>
                <span className="ml-2">
                  {activeFlights.altitude ? `${activeFlights.altitude}m` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DroneMap;
