import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { 
  Play, 
  Square, 
  AlertTriangle, 
  MapPin, 
  Battery, 
  Cloud, 
  Camera, 
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Drone,
  Settings,
  Activity,
  Navigation,
  Zap,
  Globe,
  RefreshCw,
  Eye,
  Wrench
} from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import { droneService } from '../../services/droneService';
import { toast } from 'react-hot-toast';
import { 
  useTelemetry, 
  useMissionState, 
  useDroneConnection, 
  useUI,
  useAppActions,
  useAppComputed 
} from '../../stores/appStore';

/**
 * Enhanced Drone Testing Component - Fully synchronized with central state store.
 * This component reads all its data directly from the Zustand store and provides
 * real-time updates from the drone bridge via WebSocket.
 */
const EnhancedDroneTesting = () => {
  const [activeTab, setActiveTab] = useState('drone-control');
  const [waypoints, setWaypoints] = useState([]);
  const [homeLocation, setHomeLocation] = useState({ lat: 47.6414678, lng: -122.1401649 });
  const [homeLatInput, setHomeLatInput] = useState('47.6414678');
  const [homeLngInput, setHomeLngInput] = useState('-122.1401649');

  // Get all data from central store - NO local useState for real-time data
  const telemetry = useTelemetry();
  const missionState = useMissionState();
  const droneConnection = useDroneConnection();
  const ui = useUI();
  const { setLoading, setError, addNotification } = useAppActions();
  const { getMissionStatusText, getProgressPercentage, isDroneOnMission, getDronePosition } = useAppComputed();

  // Update home location when inputs change
  useEffect(() => {
    const lat = parseFloat(homeLatInput);
    const lng = parseFloat(homeLngInput);
    if (!isNaN(lat) && !isNaN(lng)) {
      setHomeLocation({ lat, lng });
    }
  }, [homeLatInput, homeLngInput]);

  // Mission control functions
  const startMission = async () => {
    if (waypoints.length === 0) {
      toast.error('Please add waypoints before starting mission');
      return;
    }

    setLoading(true);
    try {
      const result = await droneService.startMission(waypoints);
      if (result.success) {
        toast.success('Mission started successfully');
        addNotification({
          type: 'success',
          title: 'Mission Started',
          message: 'Drone mission has been initiated'
        });
      } else {
        toast.error(result.message || 'Failed to start mission');
        setError(result.error || 'Failed to start mission');
      }
    } catch (error) {
      toast.error('Failed to start mission');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const returnToLaunch = async () => {
    setLoading(true);
    try {
      const result = await droneService.returnToLaunch();
      if (result.success) {
        toast.success('Return to launch command sent');
        addNotification({
          type: 'info',
          title: 'Return to Launch',
          message: 'Drone is returning to launch position'
        });
      } else {
        toast.error(result.message || 'Failed to send RTL command');
        setError(result.error || 'Failed to send RTL command');
      }
    } catch (error) {
      toast.error('Failed to send RTL command');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addWaypoint = () => {
    if (homeLocation.lat && homeLocation.lng) {
      const newWaypoint = {
        lat: homeLocation.lat,
        lng: homeLocation.lng,
        id: Date.now()
      };
      setWaypoints([...waypoints, newWaypoint]);
      toast.success('Waypoint added');
    } else {
      toast.error('Please enter valid coordinates');
    }
  };

  const clearWaypoints = () => {
    setWaypoints([]);
    toast.success('Waypoints cleared');
  };

  const removeWaypoint = (index) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    setWaypoints(newWaypoints);
    toast.success('Waypoint removed');
  };

  // Get drone position for map display
  const dronePosition = getDronePosition();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Drone Testing</h1>
          <p className="text-gray-600 mt-2">Real-time drone control and monitoring</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={droneConnection.isConnected ? "default" : "destructive"} className="flex items-center space-x-1">
            {droneConnection.isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{droneConnection.isConnected ? 'Connected' : 'Disconnected'}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Drone className="w-3 h-3" />
            <span>{droneConnection.droneId || 'DRONE-001'}</span>
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="drone-control">Drone Control</TabsTrigger>
          <TabsTrigger value="mission-planning">Mission Planning</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        {/* Drone Control Tab */}
        <TabsContent value="drone-control" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mission Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Mission Status</span>
                </CardTitle>
                <CardDescription>Current mission progress and status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={missionState.status === 'idle' ? 'secondary' : 'default'}>
                      {missionState.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Waypoint:</span>
                    <span>{missionState.currentWaypoint} / {missionState.totalWaypoints}</span>
                  </div>
                </div>
                <Progress value={getProgressPercentage()} className="w-full" />
                <p className="text-sm text-gray-600">{getMissionStatusText()}</p>
              </CardContent>
              <CardFooter className="flex space-x-2">
                <Button 
                  onClick={startMission} 
                  disabled={ui.isLoading || isDroneOnMission() || waypoints.length === 0}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Mission
                </Button>
                <Button 
                  onClick={returnToLaunch} 
                  disabled={ui.isLoading || !isDroneOnMission()}
                  variant="outline"
                  className="flex-1"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Return to Launch
                </Button>
              </CardFooter>
            </Card>

            {/* Drone Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Drone className="w-5 h-5" />
                  <span>Drone Status</span>
                </CardTitle>
                <CardDescription>Current drone operational status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Connection:</span>
                    <Badge variant={droneConnection.isConnected ? "default" : "destructive"}>
                      {droneConnection.isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Drone ID:</span>
                    <span>{droneConnection.droneId || 'DRONE-001'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Update:</span>
                    <span>{telemetry.lastUpdate ? new Date(telemetry.lastUpdate).toLocaleTimeString() : 'Never'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mission Planning Tab */}
        <TabsContent value="mission-planning" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Waypoint Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Add Waypoint</span>
                </CardTitle>
                <CardDescription>Enter coordinates for mission waypoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    value={homeLatInput}
                    onChange={(e) => setHomeLatInput(e.target.value)}
                    placeholder="47.6414678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    value={homeLngInput}
                    onChange={(e) => setHomeLngInput(e.target.value)}
                    placeholder="-122.1401649"
                  />
                </div>
                <Button onClick={addWaypoint} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Add Waypoint
                </Button>
              </CardContent>
            </Card>

            {/* Waypoints List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <Navigation className="w-5 h-5" />
                    <span>Mission Waypoints</span>
                  </span>
                  <Badge variant="outline">{waypoints.length} waypoints</Badge>
                </CardTitle>
                <CardDescription>Current mission waypoints</CardDescription>
              </CardHeader>
              <CardContent>
                {waypoints.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No waypoints added yet</p>
                ) : (
                  <div className="space-y-2">
                    {waypoints.map((waypoint, index) => (
                      <div key={waypoint.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <span className="text-sm">
                            {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeWaypoint(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={clearWaypoints} variant="outline" className="w-full">
                  Clear All Waypoints
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Telemetry Tab */}
        <TabsContent value="telemetry" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Position Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Position</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Latitude:</span>
                  <span>{telemetry.latitude_deg ? telemetry.latitude_deg.toFixed(6) : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Longitude:</span>
                  <span>{telemetry.longitude_deg ? telemetry.longitude_deg.toFixed(6) : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Altitude:</span>
                  <span>{telemetry.relative_altitude_m ? `${telemetry.relative_altitude_m.toFixed(1)}m` : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Mission Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Mission Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={missionState.status === 'idle' ? 'secondary' : 'default'}>
                      {missionState.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Current Waypoint:</span>
                    <span>{missionState.currentWaypoint} / {missionState.totalWaypoints}</span>
                  </div>
                </div>
                <Progress value={getProgressPercentage()} className="w-full" />
              </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wifi className="w-5 h-5" />
                  <span>Connection</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <Badge variant={droneConnection.isConnected ? "default" : "destructive"}>
                    {droneConnection.isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Drone ID:</span>
                  <span>{droneConnection.droneId || 'DRONE-001'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Last Update:</span>
                  <span>{telemetry.lastUpdate ? new Date(telemetry.lastUpdate).toLocaleTimeString() : 'Never'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Map View Tab */}
        <TabsContent value="map" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Real-time Map</span>
              </CardTitle>
              <CardDescription>Live drone position and mission waypoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                <GoogleMap
                  center={dronePosition || homeLocation}
                  zoom={15}
                  markers={[
                    ...(dronePosition ? [{
                      position: dronePosition,
                      title: 'Drone Position',
                      icon: '🚁'
                    }] : []),
                    ...waypoints.map((waypoint, index) => ({
                      position: waypoint,
                      title: `Waypoint ${index + 1}`,
                      icon: '📍'
                    }))
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {ui.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Error:</span>
              <span>{ui.error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedDroneTesting;
