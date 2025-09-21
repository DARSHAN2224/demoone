import React, { useState, useEffect, useRef } from 'react';
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
import { api } from '../../stores/api';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';

const EnhancedDroneTesting = () => {
  const [activeTab, setActiveTab] = useState('drone-control');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // Drone Control State
  const [selectedDrone, setSelectedDrone] = useState('DRONE-001');
  const [droneStatus, setDroneStatus] = useState({ 
    status: 'idle', 
    battery: 100, 
    lastUpdate: new Date().toISOString(),
    location: 'Seattle, WA', // Live home location
    temperature: 22.5, // Live home location temperature
    windSpeed: 4.2, // Live home location wind speed
    conditions: 'Clear' // Live home location conditions
  });
  const [telemetry, setTelemetry] = useState({ 
    heading: 0, 
    battery: 100, 
    altitude: 0, 
    speed: 0, 
    lat: 47.6414678, 
    lng: -122.1401649,
    verticalSpeed: 0,
    temperature: 22.5, // Live home location temperature
    humidity: 68, // Live home location humidity
    windSpeed: 4.2, // Live home location wind speed
    pressure: 1015.3 // Live home location pressure
  });
  const [weather, setWeather] = useState({ 
    temperature: 22.5, // Live home location temperature
    humidity: 68, // Live home location humidity
    windSpeed: 4.2, // Live home location wind speed
    conditions: 'Clear', // Live home location conditions
    pressure: 1015.3, // Live home location pressure
    visibility: 12.5, // Live home location visibility
    analysis: {
      isSafeToFly: true, // Default to safe
      riskLevel: 'LOW' // Default to low risk
    }
  });
  
  // Mission Planning State
  const [waypoints, setWaypoints] = useState([]);
  const [missionActive, setMissionActive] = useState(false);
  const [missionProgress, setMissionProgress] = useState(0);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isAtWaypoint, setIsAtWaypoint] = useState(false);
  const [isLandingAtWaypoint, setIsLandingAtWaypoint] = useState(false);
  const [isQRScanning, setIsQRScanning] = useState(false);
  const [qrScanSuccess, setQrScanSuccess] = useState(false);
  const [waypointDelay, setWaypointDelay] = useState(0);
  const [currentQRCode, setCurrentQRCode] = useState(null);
  const [qrCodeVisible, setQrCodeVisible] = useState(false);
  const missionIntervalRef = useRef(null);
  
  // Home Location (manual lat/lng entry)
  const [homeLocation, setHomeLocation] = useState({ lat: 47.6414678, lng: -122.1401649 });
  const [homeLatInput, setHomeLatInput] = useState('47.6414678');
  const [homeLngInput, setHomeLngInput] = useState('-122.1401649');
  
  // Testing State
  const [testResults, setTestResults] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDrones, setConnectedDrones] = useState(new Set());
  
  // Map State - Set to match drone home location (Seattle)
  const [mapCenter, setMapCenter] = useState({ lat: 47.6414678, lng: -122.1401649 });
  const [dronePosition, setDronePosition] = useState({ lat: 47.6414678, lng: -122.1401649 }); // Start at home
  
  // Force drone visibility on map
  const [forceDroneVisible, setForceDroneVisible] = useState(true);
  
  // Refs
  const lastUpdateTime = useRef(0);
  const updateThrottle = 50; // 20 FPS max (1000ms / 50ms = 20 FPS)

  // Available drones - starts with test drones, will be updated from API if available
  const [availableDrones, setAvailableDrones] = useState([
    { id: 'DRONE-001', name: 'Drone Alpha', port: 8001, status: 'idle', battery: 95 }
  ]);

  // Fetch available drones from TEST API only
  const fetchAvailableDrones = async () => {
    try {
      console.log('🔍 Fetching test drones from TEST API...');
      const response = await api.get('/test/drone/drones');
      
      console.log('📡 Test Drone API response:', response.data);
      
      if (response.data.success) {
        let dronesData = response.data.data;
        
        // Handle different response structures
        if (Array.isArray(dronesData)) {
          // If data is already an array (direct array response)
          const drones = dronesData.map(drone => ({
            id: drone.droneId || drone._id || drone.id,
            name: drone.name || `Test Drone ${drone.droneId || drone._id || drone.id}`,
            port: drone.mavsdkPort || drone.port || 8001,
            status: drone.status || 'idle',
            battery: drone.battery || 100
          }));
          
          // Only update if we have drones, otherwise keep test drones
          if (drones.length > 0) {
            setAvailableDrones(drones);
            console.log('✅ Test drones loaded (array format):', drones);
          } else {
            console.log('📭 Test API returned empty drone array, keeping default test drones');
          }
        } else if (dronesData && Array.isArray(dronesData.drones)) {
          // If data has a drones property (nested object with drones array)
          const drones = dronesData.drones.map(drone => ({
            id: drone.droneId || drone._id || drone.id,
            name: drone.name || `Test Drone ${drone.droneId || drone._id || drone.id}`,
            port: drone.mavsdkPort || drone.port || 8001,
            status: drone.status || 'idle',
            battery: drone.battery || 100
          }));
          
          // Only update if we have drones, otherwise keep test drones
          if (drones.length > 0) {
            setAvailableDrones(drones);
            console.log('✅ Test drones loaded (nested format):', drones);
          } else {
            console.log('📭 Test API returned empty drones array, keeping default test drones');
          }
        } else {
          console.warn('⚠️ Unexpected test drone data structure:', dronesData);
          console.warn('Available keys:', Object.keys(dronesData || {}));
          // Keep test drones as fallback if data structure is unexpected
          console.log('🔄 Keeping default test drones as fallback due to unexpected test API response');
        }
      } else {
        console.warn('⚠️ Test API returned success: false:', response.data);
        console.log('🔄 Keeping default test drones as fallback due to test API failure');
      }
    } catch (error) {
      console.error('❌ Failed to fetch test drones:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.log('🔄 Keeping default test drones as fallback due to test API error');
      // Keep test drones as fallback if API fails
    }
  };

  useEffect(() => {
    // Fetch available drones on component mount
    console.log('🚀 Component mounted, initial availableDrones:', availableDrones);
    fetchAvailableDrones();
    
    // Telemetry and weather updates are now handled via WebSocket only
    
    return () => {
      // Cleanup handled by WebSocket disconnect
    };
  }, [selectedDrone]);

  // Apply manually entered home lat/lng
  const applyHomeLocation = async () => {
    const lat = parseFloat(homeLatInput);
    const lng = parseFloat(homeLngInput);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      showMessage('Please enter valid numbers for latitude and longitude', 'error');
      return;
    }
    const clampedLat = Math.max(-90, Math.min(90, lat));
    const clampedLng = Math.max(-180, Math.min(180, lng));
    const newHome = { lat: clampedLat, lng: clampedLng };
    setHomeLocation(newHome);
    setMapCenter(newHome);
    setDronePosition(newHome);
    setTelemetry(prev => ({ ...prev, lat: clampedLat, lng: clampedLng }));
    try {
      await sendTestCommand('set_home', newHome);
    } catch (e) {
      console.warn('set_home command failed or unsupported:', e.message);
    }
    showMessage(`Home set to ${clampedLat.toFixed(6)}, ${clampedLng.toFixed(6)}`);
  };

  // Weather check for specific location
  const checkWeatherForLocation = async (lat, lng) => {
    try {
      console.log(`🌤️ Checking weather for location: ${lat}, ${lng}`);
      
      // Call the drone bridge to set weather based on location
      const response = await api.post('/test/drone/command', {
        droneId: selectedDrone,
        command: 'set_weather_profile',
        parameters: { 
          profile: 'location_based',
          lat: lat,
          lng: lng
        }
      }, { headers: { 'x-test-mode': 'true' } });
      
      if (response.data.success) {
        // Get the updated weather data
        const weatherResponse = await api.get(`/test/drone/weather/${selectedDrone}`);
        
        if (weatherResponse.data.success) {
          const weatherData = weatherResponse.data.data?.weather || weatherResponse.data.data;
        console.log('🌤️ Weather data for location:', weatherData);
        
        if (weatherData && weatherData.analysis) {
          return {
            isSafeToFly: weatherData.analysis.isSafeToFly,
            riskLevel: weatherData.analysis.riskLevel,
            temperature: weatherData.temperature,
            windSpeed: weatherData.windSpeed,
            conditions: weatherData.conditions
          };
          }
        }
      }
    } catch (error) {
      console.warn('Weather check failed for location:', error.message);
    }
    
    // Fallback: assume safe if no weather data
    return {
      isSafeToFly: true,
      riskLevel: 'LOW',
      temperature: 22.5,
      windSpeed: 4.2,
      conditions: 'Clear'
    };
  };

  // QR Scan simulation - now displays actual QR codes
  const simulateQRScan = async () => {
    setIsQRScanning(true);
    setDroneStatus(prev => ({ ...prev, status: 'scanning_qr' }));
    
    try {
      const waypoint = waypoints[currentWaypointIndex];
      if (!waypoint) {
        throw new Error('No waypoint data available');
      }

      // Generate QR code data for display
      const qrData = {
        checkpoint: currentWaypointIndex + 1,
        orderId: `TEST-${Date.now()}`,
        location: {
          lat: waypoint.lat,
          lng: waypoint.lng,
          alt: waypoint.alt || 50
        },
        timestamp: new Date().toISOString(),
        droneId: selectedDrone,
        waypointId: waypoint.id
      };

      // Display QR code on screen
      setCurrentQRCode({
        id: `QR-${currentWaypointIndex + 1}-${Date.now()}`,
        checkpoint: currentWaypointIndex + 1,
        data: qrData,
        qrString: JSON.stringify(qrData),
        waypoint: waypoint
      });
      setQrCodeVisible(true);

      showMessage(`QR code displayed for checkpoint ${currentWaypointIndex + 1}`, 'success');
      addTestResult('QR Display', `QR code displayed for checkpoint ${currentWaypointIndex + 1}`, true);
      
      // Simulate scan process (3-5 seconds)
    const scanTime = 3000 + Math.random() * 2000;
    
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      setQrScanSuccess(success);
      setIsQRScanning(false);
      
      if (success) {
          showMessage(`QR code scanned successfully at checkpoint ${currentWaypointIndex + 1}!`, 'success');
          addTestResult('QR Scan', `Success at checkpoint ${currentWaypointIndex + 1}`, true);
        setDroneStatus(prev => ({ ...prev, status: 'qr_success' }));
          
          // Start waypoint delay countdown
          startWaypointDelay();
      } else {
          showMessage(`QR scan failed at checkpoint ${currentWaypointIndex + 1}, retrying...`, 'error');
          addTestResult('QR Scan', `Failed at checkpoint ${currentWaypointIndex + 1}`, false);
        setDroneStatus(prev => ({ ...prev, status: 'qr_failed' }));
          
          // Retry after 2 seconds
          setTimeout(() => {
            simulateQRScan();
          }, 2000);
      }
    }, scanTime);
    } catch (error) {
      console.error('QR scan error:', error);
      showMessage('Failed to display QR code', 'error');
      addTestResult('QR Display', 'Failed', false);
      setIsQRScanning(false);
      setDroneStatus(prev => ({ ...prev, status: 'qr_failed' }));
    }
  };

  // Waypoint landing sequence
  const handleWaypointLanding = async (waypointIndex) => {
    const waypoint = waypoints[waypointIndex];
    if (!waypoint) return;

    console.log(`🛬 Landing at waypoint ${waypointIndex + 1}:`, waypoint);
    setIsLandingAtWaypoint(true);
    setCurrentWaypointIndex(waypointIndex);
    setDroneStatus(prev => ({ ...prev, status: 'landing_at_waypoint' }));

    // Check weather before landing
    const weatherCheck = await checkWeatherForLocation(waypoint.lat, waypoint.lng);
    if (!weatherCheck.isSafeToFly) {
      showMessage(`Weather not safe at waypoint ${waypointIndex + 1}. Mission paused.`, 'error');
      setDroneStatus(prev => ({ ...prev, status: 'weather_hold' }));
      setIsLandingAtWaypoint(false);
      return;
    }

    // Simulate landing (2-3 seconds)
    setTimeout(() => {
      setIsAtWaypoint(true);
      setDroneStatus(prev => ({ ...prev, status: 'landed_at_waypoint' }));
      setIsLandingAtWaypoint(false);
      
      // Start QR scan
      simulateQRScan();
    }, 2500);
  };

  // Stop mission simulation
  const stopMissionSimulation = () => {
    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
      setMissionActive(false);
      setMissionProgress(0);
      setDroneStatus(prev => ({ ...prev, status: 'idle' }));
      console.log('🛑 Mission simulation stopped');
    }
  };

  // Start waypoint delay countdown
  const startWaypointDelay = () => {
    let delay = 5; // 5 seconds delay at waypoint
    setWaypointDelay(delay);
    
    // Pause mission progress during waypoint delay
    if (missionIntervalRef.current) {
      clearInterval(missionIntervalRef.current);
      missionIntervalRef.current = null;
      console.log('⏸️ Mission progress paused for waypoint delay');
    }
    
    console.log(`⏰ Starting waypoint delay countdown: ${delay} seconds`);
    
    const countdown = setInterval(() => {
      delay -= 1;
      setWaypointDelay(delay);
      console.log(`⏰ Waypoint delay: ${delay} seconds remaining`);
      
      if (delay <= 0) {
        clearInterval(countdown);
        setWaypointDelay(0);
        console.log('✅ Waypoint delay completed, continuing mission');
        // Hide QR code after delay
        setQrCodeVisible(false);
        setCurrentQRCode(null);
        // Continue to next waypoint
        continueFromWaypoint();
      }
    }, 1000);
  };

  // Continue from waypoint after QR scan and delay
  const continueFromWaypoint = async () => {
    if (!qrScanSuccess) {
      showMessage('QR scan must be successful to continue', 'error');
      return;
    }

    console.log(`🚀 Continuing from waypoint ${currentWaypointIndex + 1}`);
    setDroneStatus(prev => ({ ...prev, status: 'taking_off_from_waypoint' }));
    
    // Check weather before takeoff
    const waypoint = waypoints[currentWaypointIndex];
    const weatherCheck = await checkWeatherForLocation(waypoint.lat, waypoint.lng);
    if (!weatherCheck.isSafeToFly) {
      showMessage(`Weather not safe for takeoff. Mission paused.`, 'error');
      setDroneStatus(prev => ({ ...prev, status: 'weather_hold' }));
      return;
    }

    // Simulate takeoff (2-3 seconds)
    setTimeout(() => {
      setIsAtWaypoint(false);
      setQrScanSuccess(false);
      setWaypointDelay(0);
      setDroneStatus(prev => ({ ...prev, status: 'in_mission' }));
      
      // Resume mission progress - create a new interval that continues from current progress
      if (missionActive && !missionIntervalRef.current) {
        console.log('▶️ Resuming mission progress after waypoint delay');
        missionIntervalRef.current = simulateMissionProgress();
      }
      
      showMessage(`Continuing to next waypoint...`, 'success');
    }, 2500);
  };

  // Countdown timer for waypoint delay
  useEffect(() => {
    if (qrScanSuccess && isAtWaypoint && waypointDelay < 60) {
      const timer = setTimeout(() => {
        setWaypointDelay(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [qrScanSuccess, isAtWaypoint, waypointDelay]);

  // WebSocket connection for real-time GPS telemetry from drone bridge
  useEffect(() => {
    console.log('🔌 Attempting WebSocket connection to drone bridge for GPS sync...');
    
    // Try to connect to Food App backend WebSocket (which relays drone bridge telemetry)
    const socketUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const socket = io(`${socketUrl}`, {
      withCredentials: true,
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('🔌 ✅ Connected to drone bridge WebSocket for real-time GPS sync');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 ❌ Disconnected from drone bridge WebSocket');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.log('🔌 ⚠️ WebSocket connection failed, using simulation mode:', error.message);
      setIsConnected(false);
    });

    // Real-time GPS telemetry from drone bridge (Unreal Engine) - THROTTLED
    socket.on('drone:telemetry', (data) => {
      const now = Date.now();
      
      // Throttle updates to prevent overwhelming the browser
      if (now - lastUpdateTime.current < updateThrottle) {
        return;
      }
      lastUpdateTime.current = now;
      
      console.log('📡 🎯 Real-time GPS telemetry from drone bridge:', data);
      
      // Track all connected drones
      if (data.droneId) {
        setConnectedDrones(prev => new Set([...prev, data.droneId]));
      }
      
      // Only update UI for selected drone
      if (data.droneId === selectedDrone && data.lat && data.lng) {
        // Batch state updates to minimize re-renders
        const updates = {
          telemetry: {
            lat: data.lat,
            lng: data.lng,
            altitude: data.alt,
            battery: data.battery,
            speed: data.speed,
            heading: data.heading
          },
          position: { lat: data.lat, lng: data.lng },
          status: {
            battery: data.battery,
            status: data.flightMode || data.mode || 'flying',
            lastUpdate: new Date().toISOString()
          }
        };
        
        // Apply all updates in a single batch
        setTelemetry(prev => ({ ...prev, ...updates.telemetry }));
        setDronePosition(updates.position);
        setDroneStatus(prev => ({ ...prev, ...updates.status }));
        
        console.log('🎯 📍 Map updated with real GPS coordinates from Unreal Engine:', { 
          lat: data.lat, 
          lng: data.lng,
          alt: data.alt,
          heading: data.heading
        });
      }
    });

    // Real-time status updates from drone bridge
    socket.on('drone:status', (data) => {
      console.log('📊 🎯 Real-time status from drone bridge:', data);
      
      // Track all connected drones
      if (data.droneId) {
        setConnectedDrones(prev => new Set([...prev, data.droneId]));
      }
      
      // Only update UI for selected drone
      if (data.droneId === selectedDrone) {
        setDroneStatus(prev => ({
          ...prev,
          status: data.status,
          lastUpdate: new Date().toISOString()
        }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedDrone]);

  // Cleanup mission interval on unmount
  useEffect(() => {
    return () => {
      if (missionIntervalRef.current) {
        clearInterval(missionIntervalRef.current);
        console.log('🧹 Cleaned up mission interval');
      }
    };
  }, []);

  // Handle drone selection change
  const handleDroneChange = (newDroneId) => {
    setSelectedDrone(newDroneId);
    
    // Reset telemetry and position for new drone
    setTelemetry({
      lat: homeLocation.lat,
      lng: homeLocation.lng,
      altitude: 0,
      battery: 100,
      speed: 0,
      heading: 0,
      temperature: 22.5,
      humidity: 68,
      windSpeed: 4.2,
      pressure: 1015.3,
      verticalSpeed: 0
    });
    
    setDronePosition({ lat: homeLocation.lat, lng: homeLocation.lng });
    setDroneStatus({
      status: 'idle',
      battery: 100,
      lastUpdate: new Date().toISOString(),
      location: 'Seattle, WA'
    });
    
    console.log(`🔄 Switched to drone: ${newDroneId}`);
  };

  // Telemetry updates are now handled via WebSocket only - no polling

  // Weather updates are now handled via WebSocket only - no polling
  // Set initial weather data
  useEffect(() => {
    const initialWeather = {
      temperature: 22.5,
      humidity: 68,
      windSpeed: 4.2,
      conditions: 'Clear',
      pressure: 1015.3,
      visibility: 12.5,
      analysis: {
        isSafeToFly: true,
        riskLevel: 'LOW'
      }
    };
    setWeather(initialWeather);
  }, []);

  // Command bus helper for test routes
  const sendTestCommand = async (cmd, params = {}) => {
    try {
      const payload = { droneId: selectedDrone, command: cmd, parameters: params };
      console.log(`🚀 Sending test command: ${cmd}`, payload);
      const res = await api.post('/test/drone/command', payload, { headers: { 'x-test-mode': 'true' } });
      console.log(`✅ Test command response:`, res?.data);
      return res?.data;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Request failed';
      console.error(`❌ Test command failed: ${cmd}`, err);
      throw new Error(msg);
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    toast[type === 'error' ? 'error' : 'success'](msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const addTestResult = (action, result, success) => {
    const newResult = {
      id: Date.now(),
      action,
      result,
      success,
      timestamp: new Date().toISOString(),
      droneId: selectedDrone
    };
    
    setTestResults(prev => [newResult, ...prev.slice(0, 49)]); // Keep last 50 results
  };

  // Drone Control Functions
  const handleLaunch = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('takeoff', { altitude: 20 });
      
      if (response?.success) {
        showMessage(`Drone ${selectedDrone} launched successfully`, 'success');
        addTestResult('Launch', response.message, true);
        setDroneStatus(prev => ({ ...prev, status: 'launched', inAir: true }));
      } else {
        throw new Error(response?.message || 'Launch failed');
      }
    } catch (error) {
      showMessage(`Launch failed: ${error.message}`, 'error');
      addTestResult('Launch', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleLand = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('land');
      
      if (response?.success) {
        showMessage(`Drone ${selectedDrone} landed successfully`, 'success');
        addTestResult('Land', response.message, true);
        setDroneStatus(prev => ({ ...prev, status: 'landed', inAir: false }));
      } else {
        throw new Error(response?.message || 'Land failed');
      }
    } catch (error) {
      showMessage(`Land failed: ${error.message}`, 'error');
      addTestResult('Land', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEmergencyStop = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('emergency_stop');
      
      if (response?.success) {
        showMessage(`Emergency stop executed for ${selectedDrone}`, 'success');
        addTestResult('Emergency Stop', response.message, true);
        setDroneStatus(prev => ({ ...prev, status: 'stopped', inAir: false }));
      } else {
        throw new Error(response?.message || 'Emergency failed');
      }
    } catch (error) {
      showMessage(`Emergency stop failed: ${error.message}`, 'error');
      addTestResult('Emergency Stop', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleRTL = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('return_to_launch');
      if (response?.success) {
        showMessage(`RTL initiated for ${selectedDrone}`, 'success');
        addTestResult('RTL', response.message, true);
        setDroneStatus(prev => ({ ...prev, status: 'returning' }));
      } else {
        throw new Error(response?.message || 'RTL failed');
      }
    } catch (error) {
      showMessage(`RTL failed: ${error.message}`, 'error');
      addTestResult('RTL', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  // Additional Camera/Views/Battery/Weather Profile Handlers
  const handleStartCameraViews = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('start_camera_views');
      if (response?.success) {
        showMessage('Camera views started', 'success');
        addTestResult('Start Camera Views', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to start camera views');
      }
    } catch (error) {
      showMessage(`Start camera views failed: ${error.message}`, 'error');
      addTestResult('Start Camera Views', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleStopCameraViews = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('stop_camera_views');
      if (response?.success) {
        showMessage('Camera views stopped', 'success');
        addTestResult('Stop Camera Views', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to stop camera views');
      }
    } catch (error) {
      showMessage(`Stop camera views failed: ${error.message}`, 'error');
      addTestResult('Stop Camera Views', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchCamera = async (cameraType) => {
    setLoading(true);
    try {
      const response = await sendTestCommand('switch_camera', { camera_type: cameraType });
      if (response?.success) {
        showMessage(`Switched camera to ${cameraType}`, 'success');
        addTestResult('Switch Camera', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to switch camera');
      }
    } catch (error) {
      showMessage(`Switch camera failed: ${error.message}`, 'error');
      addTestResult('Switch Camera', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureAllAngles = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('capture_all_angles');
      if (response?.success) {
        showMessage('Captured photos from all angles', 'success');
        addTestResult('Capture All Angles', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to capture all angles');
      }
    } catch (error) {
      showMessage(`Capture all angles failed: ${error.message}`, 'error');
      addTestResult('Capture All Angles', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleGetBattery = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('get_battery');
      if (response?.success) {
        const battery = response?.data?.battery ?? response?.data?.telemetry?.battery ?? 'unknown';
        showMessage(`Battery: ${battery}%`, 'success');
        addTestResult('Get Battery', `Battery ${battery}%`, true);
      } else {
        throw new Error(response?.message || 'Failed to get battery');
      }
    } catch (error) {
      showMessage(`Get battery failed: ${error.message}`, 'error');
      addTestResult('Get Battery', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleSetWeatherProfile = async (profile) => {
    setLoading(true);
    try {
      const response = await sendTestCommand('set_weather_profile', { profile });
      if (response?.success) {
        showMessage(`Weather profile set to ${profile}`, 'success');
        addTestResult('Set Weather Profile', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to set weather profile');
      }
    } catch (error) {
      showMessage(`Set weather profile failed: ${error.message}`, 'error');
      addTestResult('Set Weather Profile', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatus = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('get_status');
      if (response?.success) {
        const data = response?.data || {};
        setTelemetry(data?.telemetry || telemetry);
        showMessage('Status retrieved', 'success');
        addTestResult('Get Status', 'OK', true);
      } else {
        throw new Error(response?.message || 'Failed to get status');
      }
    } catch (error) {
      showMessage(`Get status failed: ${error.message}`, 'error');
      addTestResult('Get Status', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCharging = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('start_charging');
      if (response?.success) {
        showMessage('Charging started', 'success');
        addTestResult('Start Charging', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to start charging');
      }
    } catch (error) {
      showMessage(`Start charging failed: ${error.message}`, 'error');
      addTestResult('Start Charging', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleStopCharging = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('stop_charging');
      if (response?.success) {
        showMessage('Charging stopped', 'success');
        addTestResult('Stop Charging', response.message, true);
      } else {
        throw new Error(response?.message || 'Failed to stop charging');
      }
    } catch (error) {
      showMessage(`Stop charging failed: ${error.message}`, 'error');
      addTestResult('Stop Charging', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDrone = async () => {
    if (!selectedDrone) {
      showMessage('Please select a drone first', 'error');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🚁 Assigning drone:', selectedDrone);
      
      // First, try to update the drone status to 'idle' if it's available
      const selectedDroneData = availableDrones.find(d => d.id === selectedDrone);
      if (selectedDroneData && selectedDroneData.status !== 'idle') {
        console.log(`📝 Updating drone ${selectedDrone} status from ${selectedDroneData.status} to 'idle'`);
        
        // Skip production API calls in testing mode
        console.log(`🧪 Testing mode: Skipping production drone status update for ${selectedDrone}`);
      }
      
      // Check if this is a test drone (not in database)
      const isTestDrone = selectedDrone.startsWith('DRONE-00') && 
        ['DRONE-001', 'DRONE-002', 'DRONE-003', 'DRONE-004', 'DRONE-005'].includes(selectedDrone);
      
      if (isTestDrone) {
        console.log('🧪 Using test drone mode - simulating assignment');
        // For test drones, simulate successful assignment
        showMessage(`Test drone ${selectedDrone} assigned successfully (simulated)`, 'success');
        addTestResult('Assign', `Test drone ${selectedDrone} assigned (simulated)`, true);
        setDroneStatus(prev => ({ ...prev, status: 'assigned' }));
        return;
      }
      
      const response = await api.post(`/test/drone/assign/TEST-${Date.now()}`, {
        droneId: selectedDrone,
        priority: 'normal'
      });
      
      if (response.data.success) {
        showMessage(`Drone ${selectedDrone} assigned successfully`, 'success');
        addTestResult('Assign', response.data.message, true);
        setDroneStatus(prev => ({ ...prev, status: 'assigned' }));
        
      } else {
        throw new Error(response.data.message || 'Assignment failed');
      }
    } catch (error) {
      console.error('❌ Assignment error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Selected drone:', selectedDrone);
      
      const errorMessage = error.response?.data?.message || error.message || 'Assignment failed';
      const serverMessage = error.response?.data?.error || 'No server error details';
      
      console.error('❌ Server error details:', serverMessage);
      
      showMessage(`Assignment failed: ${errorMessage}`, 'error');
      addTestResult('Assign', `${errorMessage} - Server: ${serverMessage}`, false);
      
      // Provide specific suggestions based on error
      if (errorMessage.includes('No available drone')) {
        showMessage('No drones available with status "idle". Try refreshing the drone list or select a different drone.', 'info');
      } else if (errorMessage.includes('not found')) {
        showMessage('Selected drone not found in database. The test drones may not exist in the backend. Try using the Refresh button to load real drones.', 'info');
      } else {
        showMessage(`Server error: ${serverMessage}. This might be because test drones don't exist in the database.`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mission Functions
  const handleStartMission = async () => {
    if (!selectedDrone) {
      showMessage('Please select a drone first', 'error');
      return;
    }
    
    if (waypoints.length === 0) {
      showMessage('Please add waypoints before starting mission', 'error');
      return;
    }
    
    setLoading(true);
    try {
      console.log(`🚀 Starting mission for ${selectedDrone} with ${waypoints.length} waypoints:`, waypoints);
      
      // Send mission to drone bridge for real execution
      console.log('🚀 Sending mission to drone bridge...');
      try {
        const response = await api.post('/drone/command', {
          droneId: selectedDrone,
          action: 'start_mission',
          waypoints: waypoints.map((wp, index) => ({ 
            lat: wp.lat, 
            lng: wp.lng, 
            alt: wp.alt || 50,
            checkpoint: index + 1
          })),
          orderId: `TEST-${Date.now()}`,
          missionType: 'delivery_test'
        });
        
        if (response.data.success) {
          console.log('✅ Mission sent to drone bridge successfully');
          showMessage(`Mission sent to drone bridge for ${selectedDrone}`, 'success');
        } else {
          console.log('⚠️ Drone bridge response not successful, starting simulation fallback');
          showMessage(`Drone bridge response: ${response.data.message || 'Unknown error'}`, 'warning');
        }
      } catch (error) {
        console.log('⚠️ Drone bridge error, starting simulation fallback:', error.message);
        showMessage(`Drone bridge error: ${error.message} - Starting simulation fallback`, 'warning');
      }
      
      // Generate QR codes for checkpoints (simplified)
      console.log('🔍 Generating QR codes for checkpoints...');
      await generateQRCodesForCheckpoints();
      
      // Start simulation as fallback or primary
      console.log('🚀 Starting mission simulation...');
      addTestResult('Mission Start', `Mission started for ${selectedDrone}`, true);
      setMissionActive(true);
      
      // Start mission progress simulation
      console.log('🎯 Setting mission progress to 1% and starting simulation...');
      setMissionProgress(1); // Start with 1% to trigger the simulation useEffect
      console.log('🎯 Calling simulateMissionProgress()...');
      missionIntervalRef.current = simulateMissionProgress(); // Start the progress counter
      console.log('🎯 Mission interval ref set:', missionIntervalRef.current);
      
      // Update drone status
      setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
      
      // Force trigger simulation after a short delay to ensure state is updated
      setTimeout(() => {
        console.log('🔄 Force triggering simulation after state update...');
        console.log('🔄 Current state check:', {
          missionActive,
          waypointsLength: waypoints.length,
          hasInterval: !!missionIntervalRef.current
        });
        
        // Always restart simulation to ensure it starts
        if (waypoints.length > 0) {
          console.log('🔄 Force restarting mission progress simulation...');
          if (missionIntervalRef.current) {
            clearInterval(missionIntervalRef.current);
          }
          missionIntervalRef.current = simulateMissionProgress();
        }
      }, 200);
      
      console.log(`🚀 Mission simulation started successfully with ${waypoints.length} waypoints!`);
    } catch (error) {
      console.error('❌ Mission start error:', error);
      showMessage(`Mission start failed: ${error.message}`, 'error');
      addTestResult('Mission Start', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR codes for checkpoints
  const generateQRCodesForCheckpoints = async () => {
    try {
      console.log('🔍 Generating QR codes for checkpoints...');
      
      for (let i = 0; i < waypoints.length; i++) {
        const waypoint = waypoints[i];
        const qrData = {
          checkpoint: i + 1,
          orderId: `TEST-${Date.now()}`,
          location: {
            lat: waypoint.lat,
            lng: waypoint.lng,
            alt: waypoint.alt || 50
          },
          timestamp: new Date().toISOString(),
          droneId: selectedDrone
        };
        
        console.log(`📱 Generated QR code for checkpoint ${i + 1}:`, qrData);
        
        // Store QR code data for display
        const qrCodeData = {
          id: `QR-${i + 1}-${Date.now()}`,
          checkpoint: i + 1,
          data: qrData,
          waypoint: waypoint,
          qrString: JSON.stringify(qrData)
        };
        
        // Update waypoint with QR code reference
        setWaypoints(prev => prev.map((wp, index) => 
          index === i ? { ...wp, qrCode: qrCodeData } : wp
        ));
        
        addTestResult('QR Generation', `QR code generated for checkpoint ${i + 1}`, true);
      }
      
      showMessage(`Generated QR codes for ${waypoints.length} checkpoints`, 'success');
    } catch (error) {
      console.error('❌ QR code generation error:', error);
      showMessage(`QR code generation failed: ${error.message}`, 'error');
    }
  };

  // Mission progress simulation - triggers the drone movement useEffect
  const simulateMissionProgress = () => {
    console.log('🚀 Starting mission progress simulation...');
    let progress = Math.max(missionProgress, 1); // Start from current progress or 1%
    
    const interval = setInterval(() => {
      // Don't progress if we're at a waypoint and waiting
      if (isAtWaypoint && waypointDelay > 0) {
        console.log(`⏸️ Mission progress paused - waiting at waypoint (${waypointDelay}s remaining)`);
        return;
      }
      
      // Average speed progress for realistic simulation
      progress += Math.random() * 0.8 + 0.4; // 0.4-1.2% per 400ms for average speed
      
      console.log(`📊 Mission progress update: ${progress.toFixed(1)}%`);
      
      if (progress >= 100) {
        progress = 100;
        setMissionActive(false);
        setMissionProgress(100);
        setDroneStatus(prev => ({ ...prev, status: 'completed' }));
        addTestResult('Mission Complete', 'Mission completed successfully', true);
        clearInterval(interval);
        console.log('🎉 Mission simulation completed!');
      } else {
        setMissionProgress(progress);
        console.log(`📊 Mission progress: ${progress.toFixed(1)}%`);
      }
    }, 400); // 400ms interval for smoother, average speed updates
    
    console.log('⏰ Mission progress interval created:', interval);
    // Store interval reference for cleanup
    return interval;
  };

  // Update drone position from telemetry
  useEffect(() => {
    console.log('🔍 Telemetry update:', telemetry);
    if (telemetry.lat && telemetry.lng) {
      console.log('📍 Setting drone position:', { lat: telemetry.lat, lng: telemetry.lng });
      setDronePosition({
        lat: telemetry.lat,
        lng: telemetry.lng
      });
      // Force map refresh to show drone
      setForceDroneVisible(false);
      setTimeout(() => setForceDroneVisible(true), 50);
    } else {
      console.log('❌ No GPS coordinates in telemetry. Available fields:', Object.keys(telemetry));
      // Ensure drone is visible at home position
      setDronePosition({ lat: 47.6414678, lng: -122.1401649 });
      setForceDroneVisible(true);
    }
  }, [telemetry.lat, telemetry.lng]);

  // Simulate drone movement during missions for testing (only when not connected to real drone)
  useEffect(() => {
    // Run simulation if not connected OR if connected but no real telemetry is being received
    console.log(`🎮 Mission simulation check: isConnected=${isConnected}, missionProgress=${missionProgress}, waypoints=${waypoints.length}, missionActive=${missionActive}`);
    console.log(`🎮 Simulation conditions:`, {
      missionProgress: missionProgress,
      waypointsLength: waypoints.length,
      missionActive: missionActive,
      shouldRun: missionProgress > 0 && waypoints.length > 0 && missionActive
    });
    
    // More lenient condition - allow simulation to run if mission is active and we have waypoints
    if (missionActive && waypoints.length > 0) {
      console.log('✅ Simulation conditions met - starting drone movement simulation');
      console.log('🎯 Starting simulation with waypoints:', waypoints);
      console.log('🎯 Current drone position:', dronePosition);
      console.log('🎯 Mission progress:', missionProgress);
      console.log(`🚁 Starting drone movement simulation with ${waypoints.length} waypoints`);
      const homePosition = homeLocation;
      
      // Add takeoff phase (first 10% of mission - faster for better sync)
      const takeoffPhase = 10; // 10% of mission for takeoff
      const returnPhase = 10; // 10% for return to home
      const currentProgress = Math.max(missionProgress, 1); // Ensure we have at least 1% progress
      const takeoffProgress = Math.min(currentProgress, takeoffPhase);
      
      if (currentProgress <= takeoffPhase) {
        // Takeoff phase - drone stays at home but shows takeoff status
        console.log(`🚁 Takeoff phase: ${takeoffProgress.toFixed(1)}% - Drone taking off from home`);
        setDronePosition(homePosition);
        setTelemetry(prev => ({ 
          ...prev, 
          heading: 0, // Face north during takeoff
          altitude: (takeoffProgress / takeoffPhase) * 20, // Gradually increase altitude to 20m
          speed: 0, // Stationary during takeoff
          verticalSpeed: 1.3, // ~1.3 m/s climb rate (20m in 15 seconds)
          battery: 100 // Full battery at start
        }));
        setDroneStatus(prev => ({ 
          ...prev, 
          status: 'taking_off',
          battery: 100,
          lastUpdate: new Date().toISOString()
        }));
        return;
      }
      
      // Mission phase - drone moves between waypoints with landing sequence
      const missionPhase = 100 - takeoffPhase - returnPhase; // Available mission phase (80%)
      const adjustedMissionProgress = Math.max(0, (currentProgress - takeoffPhase) / missionPhase * 100);
      const fullPath = [...waypoints]; // Only waypoints, not including home
      const totalSegments = fullPath.length; // Number of waypoints to visit
      
      console.log(`🗺️ Mission path:`, {
        homePosition,
        waypoints,
        fullPath,
        totalSegments,
        adjustedMissionProgress: adjustedMissionProgress.toFixed(1)
      });
      
      // Calculate which waypoint we're currently heading to
      const waypointProgress = (adjustedMissionProgress / 100) * totalSegments;
      const currentWaypointIndex = Math.floor(waypointProgress);
      const waypointProgressRatio = waypointProgress - currentWaypointIndex;
      
      console.log(`🎯 Waypoint calculation:`, {
        adjustedMissionProgress: adjustedMissionProgress.toFixed(1),
        waypointProgress: waypointProgress.toFixed(1),
        currentWaypointIndex,
        waypointProgressRatio: waypointProgressRatio.toFixed(3),
        totalSegments
      });
      
      if (currentWaypointIndex < totalSegments) {
        const targetWaypoint = fullPath[currentWaypointIndex];
        
        // Calculate position between home and target waypoint
        const startPos = homePosition;
        const endPos = targetWaypoint;
        
        // Check if we're approaching a waypoint (within 95% of segment)
        const isApproachingWaypoint = waypointProgressRatio > 0.95;
        
        if (isApproachingWaypoint && currentWaypointIndex >= 0 && currentWaypointIndex < waypoints.length && !isAtWaypoint && !isLandingAtWaypoint) {
          // Trigger waypoint landing sequence
          handleWaypointLanding(currentWaypointIndex);
          return;
        }
        
        // If at waypoint, don't move until QR scan is complete and delay is over
        if (isAtWaypoint && currentWaypointIndex >= 0 && currentWaypointIndex < waypoints.length) {
          console.log(`🛑 Drone waiting at waypoint ${currentWaypointIndex + 1} - QR scan: ${qrScanSuccess}, delay: ${waypointDelay}s`);
          
          setDronePosition({ lat: endPos.lat, lng: endPos.lng });
          setTelemetry(prev => ({ 
            ...prev, 
            lat: endPos.lat,
            lng: endPos.lng,
            altitude: 0, // Landed
            speed: 0, // Stationary
            verticalSpeed: 0,
            battery: Math.max(20, 100 - (currentProgress * 0.5))
          }));
          
          // Pause mission progress during waypoint delay
          if (missionIntervalRef.current) {
            clearInterval(missionIntervalRef.current);
            missionIntervalRef.current = null;
            console.log('⏸️ Mission progress paused for waypoint delay');
          }
          
          return;
        }
        
        console.log(`🎯 Mission segment: ${currentWaypointIndex}/${totalSegments}`, {
          startPos,
          endPos,
          waypointProgressRatio: waypointProgressRatio.toFixed(3),
          adjustedMissionProgress: adjustedMissionProgress.toFixed(1)
        });
        
        // Interpolate between start and end positions
        const newLat = startPos.lat + (endPos.lat - startPos.lat) * waypointProgressRatio;
        const newLng = startPos.lng + (endPos.lng - startPos.lng) * waypointProgressRatio;
        
        // Calculate heading based on movement direction
        const newHeading = calculateHeading(startPos, endPos);
        
        console.log(`🎯 Drone moving to waypoint ${currentWaypointIndex + 1}:`, { 
          lat: newLat, 
          lng: newLng,
          heading: `${newHeading.toFixed(1)}°`,
          progress: `${adjustedMissionProgress.toFixed(1)}%`,
          waypoint: `${currentWaypointIndex + 1}/${totalSegments}`
        });
        
        setDronePosition({ lat: newLat, lng: newLng });
        setTelemetry(prev => ({ 
          ...prev, 
          heading: newHeading,
          lat: newLat,
          lng: newLng,
          altitude: 20, // Flying at 20m altitude
          speed: 12, // 12 m/s speed (realistic drone speed)
          verticalSpeed: 0, // Level flight
          battery: Math.max(20, 100 - (missionProgress * 0.5)) // Battery decreases during mission
        }));
        setDroneStatus(prev => ({ 
          ...prev, 
          status: 'in_mission',
          battery: Math.max(20, 100 - (missionProgress * 0.5)),
          lastUpdate: new Date().toISOString()
        }));
      } else if (currentWaypointIndex >= totalSegments) {
        // Mission complete - start return to home
        const lastWaypoint = waypoints[waypoints.length - 1];
        console.log('🎯 Mission complete - returning to home:', lastWaypoint);
        
        // Calculate return to home progress (last 10% of mission)
        const returnProgress = Math.max(0, (currentProgress - (100 - returnPhase)) / returnPhase);
        
        if (returnProgress < 1) {
          // Interpolate between last waypoint and home
          const newLat = lastWaypoint.lat + (homePosition.lat - lastWaypoint.lat) * returnProgress;
          const newLng = lastWaypoint.lng + (homePosition.lng - lastWaypoint.lng) * returnProgress;
          const returnHeading = calculateHeading(lastWaypoint, homePosition);
          
          console.log(`🏠 Returning to home: ${(returnProgress * 100).toFixed(1)}%`);
          setDronePosition({ lat: newLat, lng: newLng });
          setTelemetry(prev => ({ 
            ...prev, 
            heading: returnHeading,
            lat: newLat,
            lng: newLng,
            altitude: 20 - (returnProgress * 20), // Gradually decrease altitude
            speed: 25, // 25 m/s return speed (increased for better visibility)
            verticalSpeed: -1.3, // ~1.3 m/s descent rate
            battery: Math.max(20, 100 - (currentProgress * 0.5))
          }));
          setDroneStatus(prev => ({ 
            ...prev, 
            status: 'returning_home',
            battery: Math.max(20, 100 - (currentProgress * 0.5)),
            lastUpdate: new Date().toISOString()
          }));
        } else {
          // Back at home
          console.log('🏠 Drone returned to home');
          setDronePosition(homePosition);
          setTelemetry(prev => ({ 
            ...prev, 
            heading: 0,
            altitude: 0, // Landed
            speed: 0, // Stationary
            verticalSpeed: 0, // No vertical movement when landed
            battery: Math.max(20, 100 - (currentProgress * 0.5))
          }));
          setDroneStatus(prev => ({ 
            ...prev, 
            status: 'landed',
            battery: Math.max(20, 100 - (currentProgress * 0.5)),
            lastUpdate: new Date().toISOString()
          }));
        }
      }
    }
  }, [missionProgress, waypoints, isAtWaypoint, isLandingAtWaypoint, qrScanSuccess, missionActive]);

  // Calculate heading based on movement direction
  const calculateHeading = (from, to) => {
    if (!from || !to) return 0;
    
    const lat1 = from.lat * Math.PI / 180;
    const lat2 = to.lat * Math.PI / 180;
    const deltaLng = (to.lng - from.lng) * Math.PI / 180;
    
    const y = Math.sin(deltaLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
    
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    const normalizedHeading = (heading + 360) % 360; // Normalize to 0-360 degrees
    
    console.log(`🧭 Heading calculation: from (${from.lat.toFixed(4)}, ${from.lng.toFixed(4)}) to (${to.lat.toFixed(4)}, ${to.lng.toFixed(4)}) = ${normalizedHeading.toFixed(1)}°`);
    return normalizedHeading;
  };

  // Debug drone position changes
  useEffect(() => {
    console.log('🎯 Drone position changed:', dronePosition);
  }, [dronePosition]);

  // Debug telemetry changes
  useEffect(() => {
    console.log('📊 Telemetry updated:', telemetry);
  }, [telemetry]);

  // Debug weather changes
  useEffect(() => {
    console.log('🌤️ Weather updated:', weather);
  }, [weather]);

  // Map Functions
  const handleMapClick = ({ lat, lng }) => {
    handleWaypointAdd({ lat, lng });
  };

  const handleWaypointAdd = ({ lat, lng, alt = 50 }) => {
    const newWaypoint = {
      lat,
      lng,
      alt,
      id: Date.now()
    };
    setWaypoints(prev => {
      const updated = [...prev, newWaypoint];
      console.log(`📍 Added waypoint: ${lat.toFixed(4)}, ${lng.toFixed(4)} at ${alt}m altitude. Total waypoints: ${updated.length}`);
      return updated;
    });
  };

  const handleWaypointRemove = (index) => {
    setWaypoints(prev => prev.filter((_, i) => i !== index));
    console.log(`🗑️ Removed waypoint at index ${index}`);
    showMessage(`Removed waypoint ${index + 1}`, 'info');
  };

  // Clear all waypoints
  const handleClearWaypoints = () => {
    if (waypoints.length === 0) {
      showMessage('No waypoints to clear', 'info');
      return;
    }
    
    if (window.confirm(`Are you sure you want to clear all ${waypoints.length} waypoints?`)) {
      setWaypoints([]);
      console.log('🗑️ Cleared all waypoints');
      showMessage('All waypoints cleared', 'info');
    }
  };

  // QR Functions
  const handleGenerateQR = async () => {
    setLoading(true);
    try {
      const response = await api.post('/test/drone/qr/generate', {
        orderId: `TEST-${Date.now()}`,
        packageId: `PKG-${Date.now()}`,
        droneId: selectedDrone
      });
      
      if (response.data.success) {
        showMessage('QR code generated successfully', 'success');
        addTestResult('QR Generate', response.data.message, true);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      showMessage(`QR generation failed: ${error.message}`, 'error');
      addTestResult('QR Generate', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  // Camera Functions
  const handleCapturePhoto = async () => {
    setLoading(true);
    try {
      const response = await sendTestCommand('capture_photo', { camera_type: 'front' });
      if (response?.success) {
        showMessage('Photo captured successfully', 'success');
        addTestResult('Photo Capture', response.message, true);
      } else {
        throw new Error(response?.message || 'Capture failed');
      }
    } catch (error) {
      showMessage(`Photo capture failed: ${error.message}`, 'error');
      addTestResult('Photo Capture', error.message, false);
    } finally {
      setLoading(false);
    }
  };

  // Weather Functions
  const handleWeatherCheck = async () => {
    setLoading(true);
    try {
      console.log(`🌤️ Checking weather for drone: ${selectedDrone}`);
      const response = await api.get(`/test/drone/weather/${selectedDrone}`);
      console.log('🌤️ Weather API response:', response.data);
      
      if (response.data.success) {
        const weatherData = response.data.data?.weather || response.data.data;
        console.log('🌤️ Weather data received:', weatherData);
        
        if (weatherData && Object.keys(weatherData).length > 0) {
          setWeather(weatherData);
          showMessage('Weather data updated successfully', 'success');
        addTestResult('Weather Check', 'Weather data retrieved', true);
      } else {
          throw new Error('No weather data in response');
        }
      } else {
        throw new Error(response.data.message || 'Weather API failed');
      }
    } catch (error) {
      console.error('Weather check failed:', error);
      showMessage(`Weather check failed: ${error.message}`, 'error');
      addTestResult('Weather Check', error.message, false);
      
      // Fallback to simulated weather data (Seattle, WA)
      const simulatedWeather = {
        temperature: 22.5 + Math.random() * 2 - 1, // 21.5-23.5°C
        humidity: 68 + Math.random() * 10 - 5, // 63-73%
        windSpeed: 4.2 + Math.random() * 2 - 1, // 3.2-5.2 m/s
        conditions: ['Clear', 'Partly Cloudy', 'Overcast'][Math.floor(Math.random() * 3)],
        pressure: 1015.3 + Math.random() * 5 - 2.5, // 1012.8-1017.8 hPa
        visibility: 12.5 + Math.random() * 2 - 1, // 11.5-13.5 km
        analysis: {
          isSafeToFly: Math.random() > 0.2, // 80% chance safe
          riskLevel: Math.random() > 0.3 ? 'LOW' : Math.random() > 0.5 ? 'MEDIUM' : 'HIGH'
        }
      };
      setWeather(simulatedWeather);
      showMessage('Using simulated weather data (Seattle, WA)', 'warning');
      addTestResult('Weather Check', 'Using simulated data', true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'launched': return 'bg-green-500';
      case 'landed': return 'bg-primary-500';
      case 'stopped': return 'bg-red-500';
      case 'assigned': return 'bg-yellow-500';
      case 'taking_off': return 'bg-blue-500';
      case 'in_mission': return 'bg-purple-500';
      case 'landing_at_waypoint': return 'bg-yellow-500';
      case 'landed_at_waypoint': return 'bg-orange-500';
      case 'scanning_qr': return 'bg-blue-500';
      case 'qr_success': return 'bg-green-500';
      case 'qr_failed': return 'bg-red-500';
      case 'taking_off_from_waypoint': return 'bg-blue-500';
      case 'returning_home': return 'bg-indigo-500';
      case 'weather_hold': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getWeatherStatus = () => {
    if (!weather.analysis) return { safe: true, level: 'UNKNOWN' };
    return {
      safe: weather.analysis.isSafeToFly,
      level: weather.analysis.riskLevel
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
                <Drone className="w-8 h-8 text-white" />
              </div>
        <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Enhanced Drone Testing
                </h1>
                <p className="text-gray-600 mt-1">Comprehensive drone testing and mission planning interface</p>
              </div>
        </div>
        <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                <Wrench className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">
                  🧪 TESTING MODE ONLY
                </span>
              </div>
              <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
                <span className="text-sm font-medium text-gray-700">
              {isConnected ? 'GPS Sync Active' : 'Simulation Mode'}
            </span>
              </div>
            {isConnected && (
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                Real-time GPS ({connectedDrones.size} drones)
          </div>
              )}
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
            {droneStatus.status || 'Unknown'}
              </div>
            </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
          <div className={`p-4 rounded-xl border ${
            messageType === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            <div className="flex items-center space-x-2">
              {messageType === 'error' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{message}</span>
            </div>
        </div>
      )}

        {/* Modern Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <TabsList className="grid w-full grid-cols-5 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-1">
                <TabsTrigger 
                  value="drone-control"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Settings className="w-4 h-4" />
                  <span>Control</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="mission-planning"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Mission</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="telemetry"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Activity className="w-4 h-4" />
                  <span>Telemetry</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="weather"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <Cloud className="w-4 h-4" />
                  <span>Weather</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="testing"
                  className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Testing</span>
                </TabsTrigger>
        </TabsList>
            </div>

        {/* Drone Control Tab */}
        <TabsContent value="drone-control" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drone Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Drone Selection</CardTitle>
                <CardDescription>Select and control your drone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="drone-select">Select Drone</Label>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          const testDrones = [
                            { id: 'DRONE-001', name: 'Drone Alpha', port: 8001, status: 'idle', battery: 95 }
                          ];
                          setAvailableDrones(testDrones);
                          console.log('🧪 Reset to test drones:', testDrones);
                        }}
                        className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded"
                      >
                        🧪 Test
                      </button>
                    </div>
                  </div>
                  <select
                    id="drone-select"
                    value={selectedDrone}
                    onChange={(e) => handleDroneChange(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">Select a drone...</option>
                    {availableDrones.map(drone => {
                      console.log(`🔍 Drone ${drone.id}: status=${drone.status}, battery=${drone.battery}`);
                      
                      return (
                        <option key={drone.id} value={drone.id}>
                          {drone.name} ({drone.id}) - {drone.status} - {drone.battery}% Battery
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Found {availableDrones.filter(d => 
                      d.status === 'idle' || d.status === 'available' || 
                      d.status === 'operational' || d.status === 'ready'
                    ).length} available drones • {availableDrones.some(d => d.name.includes('Alpha') || d.name.includes('Beta')) ? 'Using test drones' : 'Real drones from database'} • Select a drone for assignment
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Debug: {availableDrones.length} total drones loaded
                  </p>
                </div>

                {/* Manual Home Location Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="home-lat">Home Lat</Label>
                    <Input
                      id="home-lat"
                      type="text"
                      value={homeLatInput}
                      onChange={(e) => setHomeLatInput(e.target.value)}
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <Label htmlFor="home-lng">Home Lng</Label>
                    <Input
                      id="home-lng"
                      type="text"
                      value={homeLngInput}
                      onChange={(e) => setHomeLngInput(e.target.value)}
                      placeholder="Longitude"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={applyHomeLocation} className="w-full">Apply</Button>
                  </div>
                </div>
                
                {/* Connected Drones Status */}
                {isConnected && connectedDrones.size > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        Connected Drones ({connectedDrones.size})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(connectedDrones).map(droneId => (
                        <Badge 
                          key={droneId} 
                          variant={droneId === selectedDrone ? "default" : "outline"}
                          className={droneId === selectedDrone ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
                        >
                          {droneId}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleAssignDrone} 
                    disabled={loading}
                    variant="outline"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Assign
                  </Button>
                  <Button 
                    onClick={handleLaunch} 
                    disabled={loading || droneStatus.status === 'launched'}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Launch
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={async () => {
                        try {
                          // Try different commands that might enable testing mode
                          const commands = [
                            'enable_testing_mode',
                            'set_testing_mode', 
                            'enable_testing', 
                            'testing_mode', 
                            'set_mode',
                            'start_testing',
                            'activate_testing'
                          ];
                          let success = false;
                          
                          for (const cmd of commands) {
                            try {
                              console.log(`🧪 Trying command: ${cmd}`);
                              const response = await sendTestCommand(cmd, { enabled: true, mode: 'testing' });
                              if (response?.success) {
                                showMessage(`Testing mode enabled via ${cmd}`, 'success');
                                success = true;
                                break;
                              }
                            } catch (e) {
                              console.log(`Command ${cmd} failed:`, e.message);
                            }
                          }
                          
                          if (!success) {
                            showMessage('Testing mode commands not supported. Check drone bridge configuration.', 'warning');
                            console.log('💡 To enable testing mode on drone bridge, you may need to:');
                            console.log('1. Set environment variable: TESTING_MODE=true');
                            console.log('2. Or modify drone bridge config to enable testing');
                            console.log('3. Or restart drone bridge with --testing flag');
                          }
                        } catch (error) {
                          showMessage(`Failed to enable testing mode: ${error.message}`, 'error');
                        }
                      }}
                      disabled={loading}
                      variant="outline"
                      className="text-xs"
                    >
                      🧪 Enable Testing
                    </Button>
                  <Button 
                    onClick={async () => {
                      try {
                        // Try to get drone status to see what's available
                        const response = await sendTestCommand('get_status');
                        if (response?.success) {
                          showMessage('Drone status retrieved - testing mode may already be enabled', 'success');
                        } else {
                          showMessage('Could not get drone status', 'error');
                        }
                      } catch (error) {
                        showMessage(`Status check failed: ${error.message}`, 'error');
                      }
                    }}
                    disabled={loading}
                    variant="outline"
                    className="text-xs"
                  >
                    📊 Check Status
                  </Button>
                  <Button 
                    onClick={() => {
                      // Disable weather updates to avoid testing mode warnings
                      if (weatherInterval.current) {
                        clearInterval(weatherInterval.current);
                        weatherInterval.current = null;
                        showMessage('Weather updates disabled - no more testing mode warnings', 'success');
                      } else {
                        showMessage('Weather updates already disabled', 'info');
                      }
                    }}
                    variant="outline"
                    className="text-xs"
                  >
                    🌤️ Disable Weather
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleLand} 
                    disabled={loading || droneStatus.status !== 'launched'}
                    variant="outline"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Land
                  </Button>
                  <Button 
                    onClick={handleEmergencyStop} 
                    disabled={loading}
                    variant="destructive"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Emergency
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Status Display */}
            <Card>
              <CardHeader>
                <CardTitle>Drone Status</CardTitle>
                <CardDescription>Real-time drone information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Battery</Label>
                    <div className="flex items-center space-x-2">
                      <Battery className="w-4 h-4" />
                      <span className="font-mono">
                        {telemetry.battery || 0}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Altitude</Label>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-mono">
                        {telemetry.altitude || 0}m
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Speed</Label>
                    <span className="font-mono">
                      {telemetry.speed || 0} m/s
                    </span>
                  </div>
                  <div>
                    <Label>Heading</Label>
                    <span className="font-mono">
                      {telemetry.heading || 0}°
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label>GPS Position</Label>
                  <div className="text-sm font-mono text-gray-600">
                    {telemetry.lat ? `${telemetry.lat.toFixed(6)}, ${telemetry.lng.toFixed(6)}` : 'No GPS'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mission Planning Tab */}
        <TabsContent value="mission-planning" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map */}
            <Card>
              <CardHeader>
                <CardTitle>Mission Map</CardTitle>
                <CardDescription>Click to add waypoints</CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleMap
                  key={`map-${missionActive ? 'active' : 'idle'}-${waypoints.length}-${forceDroneVisible}`}
                  center={mapCenter}
                  zoom={15}
                  waypoints={waypoints}
                  dronePosition={dronePosition}
                  droneHeading={telemetry.heading || 0}
                  droneStatus={droneStatus.status}
                  homeLocation={homeLocation}
                  onMapClick={handleMapClick}
                  onWaypointAdd={handleWaypointAdd}
                  onWaypointRemove={handleWaypointRemove}
                  className="h-96 w-full border rounded-lg"
                  forceDroneVisible={forceDroneVisible}
                />
              </CardContent>
            </Card>

            {/* Mission Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Mission Controls</CardTitle>
                <CardDescription>Plan and execute missions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                  <Label>Waypoints ({waypoints.length})</Label>
                    {waypoints.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearWaypoints}
                        className="text-red-600 hover:text-red-700"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {waypoints.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Click on the map to add waypoints
                      </p>
                    ) : (
                      waypoints.map((wp, index) => (
                        <div key={wp.id} className={`p-2 rounded border ${
                          index === currentWaypointIndex && isAtWaypoint 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                          {index + 1}. {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                        </span>
                                {index === currentWaypointIndex && isAtWaypoint && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Current
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Alt: {wp.alt}m
                                {wp.qrCode && (
                                  <span className="ml-2 text-green-600">
                                    • QR: {wp.qrCode.checkpoint}
                                  </span>
                                )}
                              </div>
                            </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWaypointRemove(index)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleStartMission} 
                    disabled={loading || waypoints.length === 0 || missionActive}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Mission
                  </Button>
                  <Button 
                    onClick={stopMissionSimulation} 
                    disabled={!missionActive}
                    variant="outline"
                    className="w-full"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Mission
                  </Button>
                </div>
                
                {/* Debug buttons */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2 text-gray-600">Debug Controls</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => {
                        console.log('🧪 Manual simulation trigger');
                        setMissionActive(true);
                        setMissionProgress(1);
                        if (!missionIntervalRef.current) {
                          missionIntervalRef.current = simulateMissionProgress();
                        }
                        showMessage('Simulation started manually', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      🧪 Force Start Sim
                    </Button>
                    <Button 
                      onClick={() => {
                        // Test the waypoint delay functionality
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        console.log('🧪 Testing waypoint delay simulation');
                        setMissionActive(true);
                        setMissionProgress(1);
                        setIsAtWaypoint(true);
                        setCurrentWaypointIndex(0);
                        setQrScanSuccess(true);
                        setWaypointDelay(5);
                        
                        // Start the delay countdown
                        startWaypointDelay();
                        showMessage('Waypoint delay test started', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      ⏰ Test Delay
                    </Button>
                    <Button 
                      onClick={() => {
                        // Simple mission start test
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        console.log('🚀 SIMPLE MISSION START TEST');
                        console.log('Current state before start:', {
                          missionActive,
                          missionProgress,
                          waypointsLength: waypoints.length,
                          selectedDrone
                        });
                        
                        // Force clear any existing interval
                        if (missionIntervalRef.current) {
                          clearInterval(missionIntervalRef.current);
                          missionIntervalRef.current = null;
                        }
                        
                        // Set states directly
                        setMissionActive(true);
                        setMissionProgress(1);
                        setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
                        
                        // Start simulation immediately
                        setTimeout(() => {
                          console.log('🚀 Starting simple simulation...');
                          missionIntervalRef.current = simulateMissionProgress();
                          showMessage('Simple mission started!', 'success');
                        }, 100);
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-green-50"
                    >
                      🚀 Simple Start
                    </Button>
                    <Button 
                      onClick={() => {
                        console.log('📊 Current state:', {
                          missionActive,
                          missionProgress,
                          waypointsLength: waypoints.length,
                          isConnected,
                          dronePosition,
                          selectedDrone,
                          hasInterval: !!missionIntervalRef.current
                        });
                        showMessage('State logged to console', 'info');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      📊 Log State
                    </Button>
                    <Button 
                      onClick={() => {
                        // Force start simulation regardless of state
                        console.log('🚀 FORCE STARTING SIMULATION');
                        
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        // Clear any existing interval
                        if (missionIntervalRef.current) {
                          clearInterval(missionIntervalRef.current);
                          missionIntervalRef.current = null;
                        }
                        
                        // Force set all required states
                        setMissionActive(true);
                        setMissionProgress(1);
                        setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
                        
                        // Start simulation
                        missionIntervalRef.current = simulateMissionProgress();
                        showMessage('Simulation force started!', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-red-50"
                    >
                      🚀 Force Start
                    </Button>
                    <Button 
                      onClick={() => {
                        // Disable all WebSocket connections and force simulation mode
                        console.log('🧪 DISABLING ALL WEBSOCKET CONNECTIONS');
                        setIsConnected(false);
                        setSocket(null);
                        
                        // Clear any existing intervals
                        if (missionIntervalRef.current) {
                          clearInterval(missionIntervalRef.current);
                          missionIntervalRef.current = null;
                        }
                        
                        // Force simulation mode
                        setMissionActive(false);
                        setMissionProgress(0);
                        setDroneStatus(prev => ({ ...prev, status: 'idle' }));
                        
                        showMessage('All WebSocket connections disabled - Pure simulation mode', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-purple-50"
                    >
                      🧪 Disable WebSocket
                    </Button>
                    <Button 
                      onClick={() => {
                        // Force clear all WebSocket connections and refresh
                        console.log('🔄 FORCE CLEARING ALL WEBSOCKET CONNECTIONS');
                        
                        // Clear all intervals
                        if (missionIntervalRef.current) {
                          clearInterval(missionIntervalRef.current);
                          missionIntervalRef.current = null;
                        }
                        
                        // Reset all states
                        setIsConnected(false);
                        setSocket(null);
                        setMissionActive(false);
                        setMissionProgress(0);
                        setDroneStatus(prev => ({ ...prev, status: 'idle' }));
                        
                        // Force page refresh to clear any cached connections
                        console.log('🔄 Refreshing page to clear WebSocket connections...');
                        window.location.reload();
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-red-50"
                    >
                      🔄 Force Refresh
                    </Button>
                    <Button 
                      onClick={() => {
                        // Comprehensive mission start test
                        console.log('🔍 COMPREHENSIVE MISSION START TEST');
                        console.log('=== BEFORE START ===');
                        console.log('waypoints:', waypoints);
                        console.log('missionActive:', missionActive);
                        console.log('missionProgress:', missionProgress);
                        console.log('selectedDrone:', selectedDrone);
                        console.log('isConnected:', isConnected);
                        console.log('hasInterval:', !!missionIntervalRef.current);
                        
                        if (waypoints.length === 0) {
                          console.log('❌ No waypoints - adding test waypoints first');
                          const testWaypoints = [
                            { lat: 47.6414678, lng: -122.1401649, alt: 50, id: Date.now() + 1 },
                            { lat: 47.6424678, lng: -122.1411649, alt: 50, id: Date.now() + 2 },
                            { lat: 47.6434678, lng: -122.1421649, alt: 50, id: Date.now() + 3 }
                          ];
                          setWaypoints(testWaypoints);
                          showMessage('Test waypoints added, try again', 'info');
                          return;
                        }
                        
                        // Clear everything
                        if (missionIntervalRef.current) {
                          clearInterval(missionIntervalRef.current);
                          missionIntervalRef.current = null;
                        }
                        
                        // Set states
                        setMissionActive(true);
                        setMissionProgress(1);
                        setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
                        
                        // Start simulation
                        console.log('🚀 Starting simulation...');
                        missionIntervalRef.current = simulateMissionProgress();
                        
                        console.log('=== AFTER START ===');
                        console.log('missionActive:', true);
                        console.log('missionProgress:', 1);
                        console.log('hasInterval:', !!missionIntervalRef.current);
                        
                        showMessage('Comprehensive test completed - check console', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-blue-50"
                    >
                      🔍 Full Test
                    </Button>
                    <Button 
                      onClick={() => {
                        // Ultra simple test - just set the states and see what happens
                        console.log('🧪 ULTRA SIMPLE TEST - Just setting states');
                        
                        // Add waypoints if none
                        if (waypoints.length === 0) {
                          const testWaypoints = [
                            { lat: 47.6414678, lng: -122.1401649, alt: 50, id: Date.now() + 1 },
                            { lat: 47.6424678, lng: -122.1411649, alt: 50, id: Date.now() + 2 }
                          ];
                          setWaypoints(testWaypoints);
                          console.log('Added waypoints:', testWaypoints);
                        }
                        
                        // Just set the states - let useEffect handle the rest
                        console.log('Setting missionActive to true...');
                        setMissionActive(true);
                        
                        console.log('Setting missionProgress to 1...');
                        setMissionProgress(1);
                        
                        console.log('Setting drone status to in_flight...');
                        setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
                        
                        console.log('States set - check if useEffect triggers...');
                        showMessage('Ultra simple test - states set', 'info');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-yellow-50"
                    >
                      🧪 Ultra Simple
                    </Button>
                    <Button 
                      onClick={() => {
                        // Add test waypoints around Seattle
                        const testWaypoints = [
                          { lat: 47.6414678, lng: -122.1401649, alt: 50, id: Date.now() + 1 },
                          { lat: 47.6424678, lng: -122.1411649, alt: 50, id: Date.now() + 2 },
                          { lat: 47.6434678, lng: -122.1421649, alt: 50, id: Date.now() + 3 }
                        ];
                        setWaypoints(testWaypoints);
                        showMessage('Added 3 test waypoints', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      📍 Add Test Waypoints
                    </Button>
                    <Button 
                      onClick={() => {
                        // Add more test drones for future testing
                        const additionalDrones = [
                          { id: 'DRONE-002', name: 'Drone Beta', port: 8002, status: 'idle', battery: 87 },
                          { id: 'DRONE-003', name: 'Drone Gamma', port: 8003, status: 'idle', battery: 92 },
                          { id: 'DRONE-004', name: 'Drone Delta', port: 8004, status: 'idle', battery: 78 },
                          { id: 'DRONE-005', name: 'Drone Epsilon', port: 8005, status: 'idle', battery: 85 }
                        ];
                        
                        setAvailableDrones(prev => [...prev, ...additionalDrones]);
                        console.log('🚁 Added additional test drones:', additionalDrones);
                        showMessage('Additional test drones added for future testing', 'success');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-green-50"
                    >
                      🚁 Add More Drones
                    </Button>
                  </div>
                </div>
                
                {missionActive && (
                  <div className="space-y-2">
                    <Label>Mission Progress</Label>
                    <Progress value={missionProgress} className="w-full" />
                    <span className="text-sm text-gray-600">
                      {Math.round(missionProgress)}% Complete
                    </span>
                  </div>
                )}

                {/* Waypoint Landing Status */}
                {isLandingAtWaypoint && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">
                        Landing at Waypoint {currentWaypointIndex + 1}
                      </span>
                    </div>
                    <div className="text-xs text-yellow-700">
                      Checking weather and preparing to land...
                    </div>
                  </div>
                )}

                {/* QR Scan Status */}
                {isQRScanning && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <QrCode className="w-4 h-4 text-blue-600 animate-pulse" />
                      <span className="text-sm font-medium text-blue-800">
                        Scanning QR Code
                      </span>
                    </div>
                    <div className="text-xs text-blue-700">
                      Please wait while the drone scans the QR code...
                    </div>
                  </div>
                )}

                {/* QR Code Display */}
                {qrCodeVisible && currentQRCode && (
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <QrCode className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-800">
                        Checkpoint {currentQRCode.checkpoint} QR Code
                      </span>
                    </div>
                    
                    {/* QR Code Display */}
                    <div className="flex justify-center mb-3">
                      <div className="bg-white p-4 border-2 border-gray-300 rounded-lg">
                        <div className="grid grid-cols-8 gap-1 w-32 h-32">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-3 h-3 rounded-sm ${
                                Math.random() > 0.5 ? 'bg-black' : 'bg-white'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* QR Code Data */}
                    <div className="text-xs text-gray-600 space-y-1">
                      <div><strong>Checkpoint:</strong> {currentQRCode.checkpoint}</div>
                      <div><strong>Location:</strong> {currentQRCode.data.location.lat.toFixed(4)}, {currentQRCode.data.location.lng.toFixed(4)}</div>
                      <div><strong>Altitude:</strong> {currentQRCode.data.location.alt}m</div>
                      <div><strong>Drone:</strong> {currentQRCode.data.droneId}</div>
                      <div><strong>Order:</strong> {currentQRCode.data.orderId}</div>
                    </div>
                    
                    <div className="mt-3 text-xs text-center text-gray-500">
                      Scan this QR code to verify delivery
                    </div>
                  </div>
                )}

                {/* QR Scan Success with Countdown */}
                {qrScanSuccess && isAtWaypoint && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        QR Scan Successful!
                      </span>
                    </div>
                    <div className="text-xs text-green-700 mb-3">
                      Waiting {waypointDelay} seconds before continuing...
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${((5 - waypointDelay) / 5) * 100}%` }}
                      ></div>
                    </div>
                    <Button 
                      onClick={continueFromWaypoint}
                      disabled={waypointDelay > 0}
                      className="w-full mt-2"
                      size="sm"
                    >
                      {waypointDelay > 0 ? `Wait ${waypointDelay}s` : 'Continue Mission'}
                    </Button>
                  </div>
                )}

                {/* Weather Hold Status */}
                {droneStatus.status === 'weather_hold' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <Cloud className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">
                        Mission Paused - Weather Hold
                      </span>
                    </div>
                    <div className="text-xs text-red-700">
                      Weather conditions are not safe for flight. Mission will resume when conditions improve.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Telemetry Tab */}
        <TabsContent value="telemetry" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Battery Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Battery Level</span>
                    <span className="font-mono">{telemetry.battery || 0}%</span>
                  </div>
                  <Progress value={telemetry.battery || 0} className="w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>Lat: {telemetry.lat?.toFixed(6) || 'N/A'}</div>
                  <div>Lng: {telemetry.lng?.toFixed(6) || 'N/A'}</div>
                  <div>Alt: {telemetry.altitude || 0}m</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Movement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>Speed: {telemetry.speed || 0} m/s</div>
                  <div>Heading: {telemetry.heading || 0}°</div>
                  <div>Vertical: {telemetry.verticalSpeed || 0} m/s</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Weather Tab */}
        <TabsContent value="weather" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weather Status</CardTitle>
                <CardDescription>Current weather conditions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleWeatherCheck} disabled={loading} className="w-full">
                  <Cloud className="w-4 h-4 mr-2" />
                  Check Weather
                </Button>
                
                {weather.analysis && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Safe to Fly</span>
                      <Badge variant={weather.analysis.isSafeToFly ? 'default' : 'destructive'}>
                        {weather.analysis.isSafeToFly ? 'YES' : 'NO'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Risk Level</span>
                      <Badge variant={
                        weather.analysis.riskLevel === 'LOW' ? 'default' : 
                        weather.analysis.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'
                      }>
                        {weather.analysis.riskLevel}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weather Details</CardTitle>
              </CardHeader>
              <CardContent>
                {weather.temperature ? (
                  <div className="space-y-2 text-sm">
                    <div>Temperature: {weather.temperature?.toFixed(1)}°C</div>
                    <div>Humidity: {weather.humidity?.toFixed(0)}%</div>
                    <div>Wind: {weather.windSpeed?.toFixed(1)} m/s</div>
                    <div>Conditions: {weather.conditions}</div>
                    <div>Pressure: {weather.pressure?.toFixed(0)} hPa</div>
                    <div>Visibility: {weather.visibility?.toFixed(1)} km</div>
                  </div>
                ) : (
                  <div className="text-gray-500">No weather data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Functions</CardTitle>
                <CardDescription>Test individual components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleGenerateQR} disabled={loading} variant="outline">
                    <QrCode className="w-4 h-4 mr-2" />
                    Generate QR
                  </Button>
                  <Button onClick={handleCapturePhoto} disabled={loading} variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Unreal Engine Integration</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={async () => {
                        if (!selectedDrone) {
                          showMessage('Please select a drone first', 'error');
                          return;
                        }
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        try {
                          const response = await api.post(`/test/drone/mission/start/${selectedDrone}`, {
                            waypoints: waypoints.map((wp, index) => ({ 
                              lat: wp.lat, 
                              lng: wp.lng, 
                              alt: wp.alt || 50,
                              checkpoint: index + 1
                            })),
                            orderId: `TEST-${Date.now()}`,
                            missionType: 'delivery_test'
                          });
                          
                          if (response.data.success) {
                            showMessage('Mission sent to Unreal Engine successfully!', 'success');
                          } else {
                            showMessage('Failed to send mission to Unreal Engine', 'error');
                          }
                        } catch (error) {
                          showMessage(`Unreal Engine error: ${error.message}`, 'error');
                        }
                      }}
                      disabled={loading || !selectedDrone || waypoints.length === 0}
                      variant="outline"
                      className="bg-blue-50 hover:bg-blue-100"
                    >
                      🎮 Send to Unreal
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!selectedDrone) {
                          showMessage('Please select a drone first', 'error');
                          return;
                        }
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        try {
                          // Try direct drone bridge command
                          const response = await api.post('/drone/command', {
                            droneId: selectedDrone,
                            action: 'start_mission',
                            waypoints: waypoints.map((wp, index) => ({ 
                              lat: wp.lat, 
                              lng: wp.lng, 
                              alt: wp.alt || 50,
                              checkpoint: index + 1
                            })),
                            orderId: `TEST-${Date.now()}`,
                            missionType: 'delivery_test'
                          });
                          
                          if (response.data.success) {
                            showMessage('Mission sent to drone bridge successfully!', 'success');
                          } else {
                            showMessage('Failed to send mission to drone bridge', 'error');
                          }
                        } catch (error) {
                          showMessage(`Drone bridge error: ${error.message}`, 'error');
                        }
                      }}
                      disabled={loading || !selectedDrone || waypoints.length === 0}
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100"
                    >
                      🚁 Send to Bridge
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!selectedDrone) {
                          showMessage('Please select a drone first', 'error');
                          return;
                        }
                        if (waypoints.length === 0) {
                          showMessage('Please add waypoints first', 'error');
                          return;
                        }
                        
                        // Start simulation without drone bridge
                        console.log('🚀 Starting pure simulation mode');
                        setMissionActive(true);
                        setMissionProgress(1);
                        setDroneStatus(prev => ({ ...prev, status: 'in_flight' }));
                        
                        if (!missionIntervalRef.current) {
                          missionIntervalRef.current = simulateMissionProgress();
                        }
                        
                        showMessage('Pure simulation started (no drone bridge needed)', 'success');
                      }}
                      disabled={loading || !selectedDrone || waypoints.length === 0}
                      variant="outline"
                      className="bg-purple-50 hover:bg-purple-100"
                    >
                      🎮 Pure Simulation
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!selectedDrone) {
                          showMessage('Please select a drone first', 'error');
                          return;
                        }
                        
                        try {
                          const response = await sendTestCommand('takeoff', { altitude: 20 });
                          if (response?.success) {
                            showMessage('Takeoff command sent to Unreal Engine!', 'success');
                          } else {
                            showMessage('Failed to send takeoff command', 'error');
                          }
                        } catch (error) {
                          showMessage(`Takeoff error: ${error.message}`, 'error');
                        }
                      }}
                      disabled={loading || !selectedDrone}
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100"
                    >
                      🚁 Takeoff
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={handleGetStatus} disabled={loading} variant="outline">Get Status</Button>
                  <Button onClick={handleGetBattery} disabled={loading} variant="outline">Get Battery</Button>
                  <Button onClick={handleCaptureAllAngles} disabled={loading} variant="outline">All Angles</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleStartCameraViews} disabled={loading} variant="outline">
                    Start Camera Views
                  </Button>
                  <Button onClick={handleStopCameraViews} disabled={loading} variant="outline">
                    Stop Camera Views
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleSwitchCamera('front')} disabled={loading} variant="outline">Front Cam</Button>
                  <Button onClick={() => handleSwitchCamera('bottom')} disabled={loading} variant="outline">Bottom Cam</Button>
                  <Button onClick={() => handleSwitchCamera('back')} disabled={loading} variant="outline">Back Cam</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleStartCharging} disabled={loading} variant="outline">Start Charging</Button>
                  <Button onClick={handleStopCharging} disabled={loading} variant="outline">Stop Charging</Button>
                </div>
                
                <Button onClick={handleWeatherCheck} disabled={loading} variant="outline" className="w-full">
                  <Cloud className="w-4 h-4 mr-2" />
                  Check Weather
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  {['Clear','Rain','Snow','Fog','Storm','Windy'].map(p => (
                    <Button key={p} onClick={() => handleSetWeatherProfile(p)} disabled={loading} variant="outline">
                      {p}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>Recent test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {testResults.map(result => (
                    <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">{result.action}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
    </div>
  );
};

export default EnhancedDroneTesting;
