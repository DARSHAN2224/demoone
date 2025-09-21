import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import droneTrackingService from '../../services/droneTrackingService';
import { Loader2, MapPin, Navigation, Video, Satellite, Settings, Play, Pause, Square, RotateCcw } from 'lucide-react';

const QGroundControlDashboard = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [drones, setDrones] = useState([]);
  const [selectedDrone, setSelectedDrone] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 37.7749, lng: -122.4194 });
  const [zoom, setZoom] = useState(12);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef(new Map());
  const pathsRef = useRef(new Map());

  useEffect(() => {
    initializeTracking();
    return () => {
      droneTrackingService.disconnect();
    };
  }, []);

  const initializeTracking = async () => {
    try {
      await droneTrackingService.connect();
      
      // Listen for connection status
      droneTrackingService.on('tracking:connected', () => {
        setIsConnected(true);
        console.log('🚁 Connected to drone tracking service');
      });

      droneTrackingService.on('tracking:disconnected', () => {
        setIsConnected(false);
        console.log('🔌 Disconnected from drone tracking service');
      });

      // Listen for drone updates
      droneTrackingService.on('drone:position_updated', handleDronePositionUpdate);
      droneTrackingService.on('drone:telemetry_updated', handleTelemetryUpdate);
      droneTrackingService.on('drone:mission_updated', handleMissionUpdate);
      droneTrackingService.on('drone:video_updated', handleVideoUpdate);

      // Initialize map
      initializeMap();
      
      // Load initial drones
      loadDrones();
      
    } catch (error) {
      console.error('Failed to initialize tracking:', error);
    }
  };

  const initializeMap = () => {
    // Initialize Google Maps
    if (window.google && window.google.maps) {
      const mapElement = mapRef.current;
      if (mapElement) {
        mapInstance.current = new window.google.maps.Map(mapElement, {
          center: mapCenter,
          zoom: zoom,
          mapTypeId: 'satellite',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        // Add map controls
        mapInstance.current.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(
          createMapControl()
        );
      }
    }
  };

  const createMapControl = () => {
    const controlDiv = document.createElement('div');
    controlDiv.style.backgroundColor = '#fff';
    controlDiv.style.border = '2px solid #fff';
    controlDiv.style.borderRadius = '3px';
    controlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlDiv.style.margin = '10px';
    controlDiv.style.padding = '5px';

    const controlUI = document.createElement('div');
    controlUI.style.fontFamily = 'Roboto,Arial,sans-serif';
    controlUI.style.fontSize = '12px';
    controlUI.style.padding = '5px';
    controlUI.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">Drone Controls</div>
      <button id="center-map" style="margin: 2px; padding: 3px 6px;">Center Map</button>
      <button id="toggle-paths" style="margin: 2px; padding: 3px 6px;">Toggle Paths</button>
    `;

    controlDiv.appendChild(controlUI);

    // Add event listeners
    setTimeout(() => {
      const centerBtn = controlDiv.querySelector('#center-map');
      const pathsBtn = controlDiv.querySelector('#toggle-paths');
      
      if (centerBtn) {
        centerBtn.addEventListener('click', centerMapOnDrones);
      }
      if (pathsBtn) {
        pathsBtn.addEventListener('click', toggleFlightPaths);
      }
    }, 100);

    return controlDiv;
  };

  const centerMapOnDrones = () => {
    if (drones.length > 0 && mapInstance.current) {
      const bounds = new window.google.maps.LatLngBounds();
      drones.forEach(drone => {
        if (drone.position) {
          bounds.extend(new window.google.maps.LatLng(
            drone.position.latitude,
            drone.position.longitude
          ));
        }
      });
      mapInstance.current.fitBounds(bounds);
    }
  };

  const toggleFlightPaths = () => {
    // Toggle visibility of flight paths
    pathsRef.current.forEach((path, droneId) => {
      path.setMap(path.getMap() ? null : mapInstance.current);
    });
  };

  const loadDrones = async () => {
    try {
      // Load drones from your API
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

  const handleDronePositionUpdate = ({ droneId, position }) => {
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, position, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });

    // Update map marker
    updateMapMarker(droneId, position);
    
    // Update flight path
    updateFlightPath(droneId, position);
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
  };

  const handleMissionUpdate = ({ droneId, mission }) => {
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, mission, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });
  };

  const handleVideoUpdate = ({ droneId, video }) => {
    setDrones(prevDrones => {
      const updatedDrones = prevDrones.map(drone => 
        drone._id === droneId 
          ? { ...drone, video, lastUpdate: new Date() }
          : drone
      );
      return updatedDrones;
    });
  };

  const updateMapMarker = (droneId, position) => {
    if (!mapInstance.current) return;

    const { latitude, longitude, altitude, heading } = position;
    
    if (markersRef.current.has(droneId)) {
      // Update existing marker
      const marker = markersRef.current.get(droneId);
      marker.setPosition({ lat: latitude, lng: longitude });
      marker.setIcon(createDroneIcon(heading));
    } else {
      // Create new marker
      const marker = new window.google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: mapInstance.current,
        icon: createDroneIcon(heading),
        title: `Drone ${droneId}`,
        draggable: false
      });

      // Add info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: createDroneInfoWindow(droneId, position)
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedDrone(droneId);
      });

      markersRef.current.set(droneId, marker);
    }
  };

  const createDroneIcon = (heading) => {
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="#00ff00" stroke="#000" stroke-width="1"/>
          <circle cx="12" cy="12" r="2" fill="#ff0000"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(24, 24),
      anchor: new window.google.maps.Point(12, 12),
      rotation: heading
    };
  };

  const createDroneInfoWindow = (droneId, position) => {
    const drone = drones.find(d => d._id === droneId);
    return `
      <div style="padding: 10px; min-width: 200px;">
        <h3 style="margin: 0 0 10px 0;">Drone ${droneId}</h3>
        <p><strong>Position:</strong> ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}</p>
        <p><strong>Altitude:</strong> ${position.altitude}m</p>
        <p><strong>Heading:</strong> ${position.heading}°</p>
        <p><strong>Speed:</strong> ${position.speed}m/s</p>
        ${drone?.telemetry ? `
          <p><strong>Battery:</strong> ${drone.telemetry.battery}%</p>
          <p><strong>Status:</strong> ${drone.telemetry.status}</p>
        ` : ''}
        <button onclick="selectDrone('${droneId}')" style="margin-top: 10px; padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
          Select Drone
        </button>
      </div>
    `;
  };

  const updateFlightPath = (droneId, position) => {
    if (!mapInstance.current) return;

    const { latitude, longitude, altitude } = position;
    
    if (pathsRef.current.has(droneId)) {
      // Update existing path
      const path = pathsRef.current.get(droneId);
      const newPoint = new window.google.maps.LatLng(latitude, longitude);
      path.getPath().push(newPoint);
    } else {
      // Create new path
      const path = new window.google.maps.Polyline({
        path: [{ lat: latitude, lng: longitude }],
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
        map: mapInstance.current
      });
      
      pathsRef.current.set(droneId, path);
    }
  };

  const getAuthToken = () => {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  };

  const handleMissionControl = async (action, droneId, missionId) => {
    try {
      switch (action) {
        case 'start':
          await droneTrackingService.startMission(droneId, missionId);
          break;
        case 'pause':
          await droneTrackingService.pauseMission(droneId, missionId);
          break;
        case 'resume':
          await droneTrackingService.resumeMission(droneId, missionId);
          break;
        case 'cancel':
          await droneTrackingService.cancelMission(droneId, missionId);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} mission:`, error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-gray-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 50) return 'text-green-600';
    if (battery > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QGroundControl Dashboard</h1>
          <p className="text-gray-600">Professional drone tracking and mission control</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="map" className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Live Map</span>
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="flex items-center space-x-2">
            <Satellite className="w-4 h-4" />
            <span>Telemetry</span>
          </TabsTrigger>
          <TabsTrigger value="mission" className="flex items-center space-x-2">
            <Navigation className="w-4 h-4" />
            <span>Mission</span>
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center space-x-2">
            <Video className="w-4 h-4" />
            <span>Video Feed</span>
          </TabsTrigger>
          <TabsTrigger value="fleet" className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4" />
            <span>Fleet Status</span>
          </TabsTrigger>
        </TabsList>

        {/* Live Map Tab */}
        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Real-time Drone Tracking</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] relative">
                <div 
                  ref={mapRef} 
                  className="w-full h-full rounded-lg border"
                  style={{ minHeight: '600px' }}
                />
                {!window.google && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Loading Google Maps...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Telemetry Tab */}
        <TabsContent value="telemetry" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {drones.map(drone => (
              <Card key={drone._id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Drone {drone.name || drone._id}</span>
                    <Badge variant="outline" className={getStatusColor(drone.telemetry?.status)}>
                      {drone.telemetry?.status || 'Unknown'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {drone.telemetry ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Battery</p>
                          <p className={`text-lg font-semibold ${getBatteryColor(drone.telemetry.battery)}`}>
                            {drone.telemetry.battery}%
                          </p>
                          <Progress value={drone.telemetry.battery} className="mt-2" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Altitude</p>
                          <p className="text-lg font-semibold">{drone.telemetry.altitude}m</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Speed</p>
                          <p className="text-lg font-semibold">{drone.telemetry.speed}m/s</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Heading</p>
                          <p className="text-lg font-semibold">{drone.telemetry.heading}°</p>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600">Signal Strength</p>
                        <div className="flex space-x-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-4 rounded ${
                                i < drone.telemetry.signal / 20 ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Waiting for telemetry data...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Mission Tab */}
        <TabsContent value="mission" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Navigation className="w-5 h-5" />
                <span>Mission Planning & Control</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {drones.map(drone => (
                  <div key={drone._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Drone {drone.name || drone._id}</h3>
                      <Badge variant="outline" className={getStatusColor(drone.mission?.status)}>
                        {drone.mission?.status || 'No Mission'}
                      </Badge>
                    </div>
                    
                    {drone.mission ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Mission ID</p>
                            <p className="font-medium">{drone.mission.missionId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Progress</p>
                            <p className="font-medium">{drone.mission.progress}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Waypoints</p>
                            <p className="font-medium">{drone.mission.waypoints.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className="font-medium">{drone.mission.status}</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {drone.mission.status === 'idle' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleMissionControl('start', drone._id, drone.mission.missionId)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Start
                            </Button>
                          )}
                          {drone.mission.status === 'active' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMissionControl('pause', drone._id, drone.mission.missionId)}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleMissionControl('cancel', drone._id, drone.mission.missionId)}
                              >
                                <Square className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </>
                          )}
                          {drone.mission.status === 'paused' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleMissionControl('resume', drone._id, drone.mission.missionId)}
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No active mission</p>
                        <Button className="mt-2" size="sm">
                          Create Mission
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Feed Tab */}
        <TabsContent value="video" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {drones.map(drone => (
              <Card key={drone._id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Video className="w-5 h-5" />
                    <span>Drone {drone.name || drone._id}</span>
                    {drone.video?.isActive && (
                      <Badge variant="default" className="bg-green-500">
                        Live
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {drone.video?.isActive ? (
                    <div className="space-y-4">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <video
                          src={drone.video.streamUrl}
                          controls
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Quality: {drone.video.quality}</p>
                        <p>Stream: {drone.video.streamUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <Video className="w-12 h-12 mx-auto mb-2" />
                        <p>No video feed available</p>
                        <p className="text-sm">Camera may be offline or not configured</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Fleet Status Tab */}
        <TabsContent value="fleet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5" />
                <span>Fleet Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-primary-600">{drones.length}</h3>
                  <p className="text-gray-600">Total Drones</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-green-600">
                    {drones.filter(d => d.telemetry?.status === 'active').length}
                  </h3>
                  <p className="text-gray-600">Active Drones</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold text-yellow-600">
                    {drones.filter(d => d.mission?.status === 'active').length}
                  </h3>
                  <p className="text-gray-600">Active Missions</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Drone Status Summary</h3>
                <div className="space-y-2">
                  {drones.map(drone => (
                    <div key={drone._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Drone {drone.name || drone._id}</p>
                        <p className="text-sm text-gray-600">
                          {drone.telemetry?.status || 'Unknown'} • 
                          Battery: {drone.telemetry?.battery || 'N/A'}% • 
                          Alt: {drone.telemetry?.altitude || 'N/A'}m
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getStatusColor(drone.telemetry?.status)}>
                          {drone.telemetry?.status || 'Unknown'}
                        </Badge>
                        {drone.mission && (
                          <Badge variant="secondary">
                            Mission: {drone.mission.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QGroundControlDashboard;
