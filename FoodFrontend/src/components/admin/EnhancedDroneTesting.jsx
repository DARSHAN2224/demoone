import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
// Select component not available, will use HTML select
import { 
  Play, Square, AlertTriangle, MapPin, Battery, Cloud, Camera, QrCode,
  CheckCircle, XCircle, Wifi, WifiOff, Drone, Settings, Activity,
  Navigation, Rocket, Undo2, Trash2, RefreshCw
} from 'lucide-react';
import GoogleMap from '@/components/maps/GoogleMap';
import { api } from '@/services/api';
import { droneService } from '@/services/droneService';
import { useTelemetry, useMissionState, useResetMissionState } from '@/stores/appStore';
import { toast } from 'react-hot-toast';

// This is the definitive, feature-rich testing component.
// It combines the user's detailed UI with the robust, centralized state management.
const EnhancedDroneTesting = () => {
  // --- LOCAL UI STATE ---
  // State for managing the UI itself, like tabs and form inputs.
  const [activeTab, setActiveTab] = useState('mission-planning');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  
  // State for the drone list and the selected drone
  const [availableDrones, setAvailableDrones] = useState([]);
  const [selectedDroneId, setSelectedDroneId] = useState(null);
  
  // State for button management based on drone operational state
  const [droneState, setDroneState] = useState('idle'); // 'idle', 'taking_off', 'flying', 'mission_running', 'landing'
  
  // Debug waypoints
  useEffect(() => {
    console.log('Waypoints updated:', waypoints);
  }, [waypoints]);

  // --- GLOBAL REAL-TIME STATE (from Zustand Store) ---
  // All real-time data is now read directly from the central store.
  // This component NO LONGER manages its own telemetry or mission state.
  const telemetry = useTelemetry();
  const missionState = useMissionState();
  const resetMissionState = useResetMissionState();

  const isMissionRunning = missionState.status && missionState.status !== 'IDLE' && missionState.status !== 'MISSION_COMPLETE' && missionState.status !== 'ERROR';

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch the list of drones from our backend API
    const fetchDrones = async () => {
      try {
        const response = await api.get('/api/v1/test/drone/drones'); // Test endpoint - no auth required
        if (response.data.success && response.data.data.length > 0) {
            setAvailableDrones(response.data.data);
            // Automatically select the first drone in the list
            if (response.data.data[0]) {
                setSelectedDroneId(response.data.data[0].droneId);
            }
          } else {
            setApiError('No available drones found from backend.');
        }
      } catch (err) {
        setApiError('Could not fetch available drones.');
        console.error(err);
      }
    };
    fetchDrones();
  }, []);

  // --- BUTTON STATE LOGIC ---
  const getButtonStates = () => {
    switch (droneState) {
      case 'idle':
        return {
          takeoff: true,
          land: false,
          startMission: true,
          emergency: false
        };
      case 'taking_off':
        return {
          takeoff: false,
          land: false,
          startMission: false,
          emergency: true
        };
      case 'flying':
          return {
          takeoff: false,
          land: true,
          startMission: true,
          emergency: true
        };
      case 'mission_running':
    return {
          takeoff: false,
          land: false,
          startMission: false,
          emergency: true
        };
      case 'landing':
        return {
          takeoff: false,
          land: false,
          startMission: false,
          emergency: true
        };
      default:
        return {
          takeoff: true,
          land: false,
          startMission: true,
          emergency: false
        };
    }
  };

  const buttonStates = getButtonStates();

  // Update drone status when selected drone changes
  useEffect(() => {
    console.log(`Selected drone changed: ${selectedDroneId || 'none'}`);
    
    setAvailableDrones(prev => 
      prev.map(drone => {
        if (selectedDroneId && drone.droneId === selectedDroneId) {
          // Mark selected drone as connected
          return { ...drone, status: 'connected' };
      } else {
          // Mark all other drones as offline
          return { ...drone, status: 'offline' };
        }
      })
    );
  }, [selectedDroneId]);

  // --- API HANDLERS ---
  // Functions that send commands to the backend.
  
  const handleStartMission = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    if (waypoints.length === 0) return toast.error('Please add at least one waypoint.');
    
    setIsLoading(true);
    setApiError('');
    try {
      await droneService.startMission(selectedDroneId, waypoints);
      toast.success(`Mission command sent to ${selectedDroneId}`);
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToLaunch = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    if (waypoints.length === 0) return toast.error('Please add at least one waypoint for mission.');
    
    setIsLoading(true);
    setApiError('');
    setDroneState('mission_running');
    try {
        await droneService.startMission(selectedDroneId, waypoints);
        toast.success(`Mission started for ${selectedDroneId}`);
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
      setDroneState('flying'); // Reset to flying on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakeoff = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    
    setIsLoading(true);
    setApiError('');
    setDroneState('taking_off');
    try {
        await droneService.launchDrone(selectedDroneId, 20);
        toast.success(`Takeoff command sent to ${selectedDroneId}`);
        // Simulate takeoff completion after 3 seconds
        setTimeout(() => {
          setDroneState('flying');
        }, 3000);
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
      setDroneState('idle'); // Reset on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleLand = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    
    setIsLoading(true);
    setApiError('');
    setDroneState('landing');
    try {
        await droneService.landDrone(selectedDroneId);
        toast.success(`Land command sent to ${selectedDroneId}`);
        // Simulate landing completion after 3 seconds
        setTimeout(() => {
          setDroneState('idle');
        }, 3000);
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
      setDroneState('flying'); // Reset to flying on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    
    setIsLoading(true);
    setApiError('');
    try {
        await droneService.emergencyStop(selectedDroneId);
        toast.success(`Emergency stop command sent to ${selectedDroneId}`);
        setDroneState('idle'); // Emergency stop resets to idle
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDrone = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    
    setIsLoading(true);
    setApiError('');
    try {
        await droneService.resetDrone(selectedDroneId);
        toast.success(`Drone reset command sent to ${selectedDroneId}`);
        setDroneState('idle'); // Reset to idle state
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMission = async () => {
    if (!selectedDroneId) return toast.error('Please select a drone first.');
    
    setIsLoading(true);
    setApiError('');
    try {
        await droneService.startDemoMission(selectedDroneId);
        toast.success(`Demo mission started for ${selectedDroneId} - testing collision detection`);
    } catch (error) {
      setApiError(error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearMission = () => {
    if (droneState === 'mission_running') return toast.error('Cannot clear waypoints while mission is active.');
      setWaypoints([]);
    resetMissionState();
    setApiError('');
    toast.success('Mission plan cleared.');
  };

  // --- RENDER LOGIC ---
  const dronePosition = telemetry.latitude_deg && telemetry.longitude_deg 
    ? { lat: telemetry.latitude_deg, lng: telemetry.longitude_deg } 
    : null;

  return (
    <div className="flex h-screen bg-gray-900 text-white p-4 gap-4">
      {/* Map Section */}
      <div className="w-2/3 h-full rounded-lg overflow-hidden border border-gray-700">
        <GoogleMap
          center={dronePosition || { lat: 47.6414678, lng: -122.1401649 }} // Default center
          zoom={15}
          waypoints={waypoints}
          dronePosition={dronePosition}
          droneHeading={telemetry.heading || 0}
          onMapClick={(location) => {
            console.log('Map clicked!', location, 'Drone state:', droneState, 'Mission running:', isMissionRunning);
            if (droneState !== 'mission_running') {
              const newWaypoint = { lat: location.lat, lng: location.lng };
    setWaypoints(prev => {
                const newWaypoints = [...prev, newWaypoint];
                console.log('Adding waypoint:', newWaypoint, 'Total waypoints:', newWaypoints.length);
                return newWaypoints;
              });
              toast.success(`Waypoint ${waypoints.length + 1} added at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
      } else {
              toast.error('Cannot add waypoints while mission is running');
            }
          }}
        />
      </div>

      {/* Control Panel Section */}
      <div className="w-1/3 h-full flex flex-col gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full bg-gray-800 rounded-lg border border-gray-700 flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="mission-planning"><Navigation className="w-4 h-4 mr-2"/>Mission</TabsTrigger>
            <TabsTrigger value="drone-control"><Settings className="w-4 h-4 mr-2"/>Control</TabsTrigger>
            <TabsTrigger value="telemetry"><Activity className="w-4 h-4 mr-2"/>Telemetry</TabsTrigger>
            <TabsTrigger value="weather"><Cloud className="w-4 h-4 mr-2"/>Weather</TabsTrigger>
        </TabsList>

          {/* Mission Planning Tab */}
          <TabsContent value="mission-planning" className="p-4 flex-grow flex flex-col gap-4">
            <div className="space-y-2">
              <Label>Select Drone for Testing</Label>
                  <select
                value={selectedDroneId || ''} 
                onChange={(e) => setSelectedDroneId(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white"
                  >
                    <option value="">Select a drone...</option>
                {availableDrones.map(drone => (
                  <option key={drone.droneId} value={drone.droneId}>
                    {drone.droneId} ({drone.status})
                        </option>
                ))}
                  </select>
                </div>

            <div className="flex-grow overflow-y-auto space-y-2 pr-2">
              <div className="space-y-2">
                <Label>Waypoints ({waypoints.length})</Label>
              <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded border border-gray-600">
                💡 <strong>Click on the map</strong> to add waypoints for your mission
                  </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const testWaypoint = { 
                      lat: 47.6414678 + (Math.random() - 0.5) * 0.01, 
                      lng: -122.1401649 + (Math.random() - 0.5) * 0.01 
                    };
                    setWaypoints(prev => [...prev, testWaypoint]);
                    toast.success(`Test waypoint added at ${testWaypoint.lat.toFixed(4)}, ${testWaypoint.lng.toFixed(4)}`);
                  }}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                >
                  Add Test Waypoint
                </button>
                <button 
                    onClick={() => {
                    console.log('Current waypoints:', waypoints);
                    console.log('Mission running:', isMissionRunning);
                    console.log('Selected drone:', selectedDroneId);
                  }}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs"
                >
                  Debug Info
                </button>
                </div>
                </div>
              {waypoints.map((wp, index) => (
                <div key={index} className="p-2 rounded-md text-sm bg-gray-700 flex justify-between items-center">
                  <span className="font-mono text-cyan-400">WP {index + 1}:</span>
                  <span>{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}</span>
                  <button 
                    onClick={() => {
                      const newWaypoints = waypoints.filter((_, i) => i !== index);
                      setWaypoints(newWaypoints);
                      toast.success(`Waypoint ${index + 1} removed`);
                    }}
                    className="text-red-400 hover:text-red-300 ml-2"
                    title="Remove waypoint"
                  >
                    ×
                  </button>
                  </div>
              ))}
              {waypoints.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-4">
                  No waypoints added yet. Click on the map to add waypoints.
                              </div>
              )}
                </div>
                
            <div className="space-y-2 pt-2 border-t border-gray-600">
              <Button onClick={handleStartMission} disabled={isLoading || droneState === 'mission_running' || !selectedDroneId || waypoints.length === 0} className="w-full bg-green-600 hover:bg-green-700">
                <Rocket className="mr-2 h-4 w-4" /> Start Mission
                  </Button>
              <Button onClick={handleDemoMission} disabled={isLoading || droneState === 'mission_running' || !selectedDroneId} className="w-full bg-purple-600 hover:bg-purple-700">
                <Rocket className="mr-2 h-4 w-4" /> Demo Mission (Collision Test)
                  </Button>
              <Button onClick={handleClearMission} disabled={isLoading || droneState === 'mission_running'} variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" /> Clear Mission
                  </Button>
                </div>
        </TabsContent>

          {/* Drone Control Tab */}
          <TabsContent value="drone-control" className="p-4 space-y-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader><CardTitle>Manual Commands</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                    <Button 
                  onClick={handleTakeoff} 
                  disabled={isLoading || !selectedDroneId || !buttonStates.takeoff} 
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <Rocket className="mr-2 h-4 w-4" /> Takeoff
                    </Button>
                    <Button 
                  onClick={handleLand} 
                  disabled={isLoading || !selectedDroneId || !buttonStates.land} 
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Square className="mr-2 h-4 w-4" /> Land
                    </Button>
                    <Button 
                  onClick={handleReturnToLaunch} 
                  disabled={isLoading || !selectedDroneId || !buttonStates.startMission} 
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                >
                  <Rocket className="mr-2 h-4 w-4" /> Start Mission
                    </Button>
                    <Button 
                  onClick={handleEmergencyStop} 
                  disabled={isLoading || !selectedDroneId || !buttonStates.emergency} 
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Emergency Stop
                    </Button>
                    <Button 
                  onClick={handleResetDrone} 
                  disabled={isLoading || !selectedDroneId} 
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Reset Drone
                    </Button>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Telemetry Tab */}
          <TabsContent value="telemetry" className="p-4 space-y-4">
             <Card className="bg-gray-900 border-gray-700">
                <CardHeader><CardTitle>Live Telemetry</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <p><strong className="text-gray-400">Latitude:</strong> {telemetry.latitude_deg?.toFixed(6) || 'N/A'}</p>
                    <p><strong className="text-gray-400">Longitude:</strong> {telemetry.longitude_deg?.toFixed(6) || 'N/A'}</p>
                    <p><strong className="text-gray-400">Altitude:</strong> {telemetry.absolute_altitude_m?.toFixed(1) || 'N/A'} m</p>
                    <p><strong className="text-gray-400">Battery:</strong> {telemetry.battery || 'N/A'}%</p>
                    <p><strong className="text-gray-400">Speed:</strong> {telemetry.speed_m_s?.toFixed(1) || 'N/A'} m/s</p>
                    <p><strong className="text-gray-400">Heading:</strong> {telemetry.heading?.toFixed(0) || 'N/A'}&deg;</p>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Weather Tab */}
          <TabsContent value="weather" className="p-4">
            {/* Weather information can be added here, potentially from another WebSocket feed or API call */}
            <p>Weather data for the drone's location will be displayed here.</p>
          </TabsContent>
        </Tabs>
        
        {/* Live Status Display */}
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h3 className="text-lg font-bold text-cyan-400 mb-3">Live Status ({selectedDroneId || '...'})</h3>
                  <div className="space-y-2 text-sm">
                <p><strong className="font-semibold text-gray-400 w-28 inline-block">Drone State:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                    droneState === 'idle' ? 'bg-gray-600 text-gray-200' :
                    droneState === 'taking_off' ? 'bg-yellow-600 text-yellow-100' :
                    droneState === 'flying' ? 'bg-green-600 text-green-100' :
                    droneState === 'mission_running' ? 'bg-blue-600 text-blue-100' :
                    droneState === 'landing' ? 'bg-orange-600 text-orange-100' :
                    'bg-gray-600 text-gray-200'
                  }`}>
                    {droneState.toUpperCase()}
                  </span>
                </p>
                <p><strong className="font-semibold text-gray-400 w-28 inline-block">Status:</strong> {missionState.status}</p>
                <p><strong className="font-semibold text-gray-400 w-28 inline-block">Details:</strong> {missionState.details}</p>
                <div className="pt-2">
                    <Progress value={missionState.progress} />
                  </div>
          </div>
             {apiError && (
                <p className="text-xs text-red-400 mt-3 flex items-center"><AlertTriangle className="mr-2 h-4 w-4" /> {apiError}</p>
            )}
                      </div>
    </div>
    </div>
  );
};

export default EnhancedDroneTesting;
