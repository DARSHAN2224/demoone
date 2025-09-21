import { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Plane, 
  Truck, 
  Clock, 
  Navigation, 
  Battery, 
  Zap,
  RefreshCw,
  Play,
  Square,
  Globe,
  Settings
} from 'lucide-react';

const DroneTrackingMap = ({ orderId, deliveryType = 'drone' }) => {
  const [droneLocation, setDroneLocation] = useState(null);
  const [deliveryStatus, setDeliveryStatus] = useState('en_route');
  const [eta, setEta] = useState(15);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [mockMode, setMockMode] = useState(process.env.NODE_ENV === 'development');
  const [deliveryPath, setDeliveryPath] = useState([]);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [weatherConditions, setWeatherConditions] = useState(null);
  const trackingInterval = useRef(null);

  // Initialize tracking data
  useEffect(() => {
    if (orderId) {
      initializeTracking();
    }
    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, [orderId]);

  const initializeTracking = async () => {
    if (mockMode) {
      // Development: Generate mock drone data
      console.log('🚁 Development mode: Initializing mock drone tracking');
      
      // Mock locations (Bangalore coordinates)
      const mockPickup = { lat: 12.9716, lng: 77.5946 };
      const mockDelivery = { lat: 12.9789, lng: 77.5917 };
      const mockDrone = {
        lat: 12.9716 + (Math.random() - 0.5) * 0.01,
        lng: 77.5946 + (Math.random() - 0.5) * 0.01
      };
      
      setPickupLocation(mockPickup);
      setDeliveryLocation(mockDelivery);
      setDroneLocation(mockDrone);
      setDeliveryStatus(['en_route', 'nearby', 'arrived'][Math.floor(Math.random() * 3)]);
      setEta(Math.floor(Math.random() * 20) + 5);
      
      // Generate mock delivery path
      const path = generateMockDeliveryPath(mockPickup, mockDelivery);
      setDeliveryPath(path);
      
      // Generate mock tracking history
      const history = [];
      for (let i = 0; i < 10; i++) {
        history.push({
          timestamp: new Date(Date.now() - (10 - i) * 60000),
          location: {
            lat: mockDrone.lat + (Math.random() - 0.5) * 0.002,
            lng: mockDrone.lng + (Math.random() - 0.5) * 0.002
          },
          status: ['en_route', 'nearby', 'arrived'][Math.floor(Math.random() * 3)]
        });
      }
      setTrackingHistory(history);
      
      // Mock weather conditions
      setWeatherConditions({
        temperature: 25,
        windSpeed: 8,
        precipitation: 0,
        visibility: 'excellent',
        isSafe: true
      });
    } else {
      // Production: Fetch real drone data
      try {
        const response = await fetch(`/api/drone/track/${orderId}`);
        const data = await response.json();
        setDroneLocation(data.location);
        setDeliveryStatus(data.status);
        setEta(data.eta);
        setPickupLocation(data.pickupLocation);
        setDeliveryLocation(data.deliveryLocation);
        setDeliveryPath(data.deliveryPath || []);
        
        // Fetch weather conditions
        if (data.location) {
          const weatherResponse = await fetch(`/api/weather/check?lat=${data.location.lat}&lng=${data.location.lng}`);
          const weatherData = await weatherResponse.json();
          setWeatherConditions(weatherData.data);
        }
      } catch (error) {
        console.error('Failed to fetch drone tracking data:', error);
      }
    }
  };

  const generateMockDeliveryPath = (start, end) => {
    // Generate a realistic delivery path with waypoints
    const path = [];
    const steps = 10;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const lat = start.lat + (end.lat - start.lat) * progress;
      const lng = start.lng + (end.lng - start.lng) * progress;
      
      // Add some realistic variation to the path
      const variation = 0.001 * Math.sin(progress * Math.PI * 2);
      path.push({
        lat: lat + variation,
        lng: lng + variation
      });
    }
    
    return path;
  };

  const startLiveTracking = () => {
    setIsLiveTracking(true);
    
    if (mockMode) {
      // Development: Simulate live tracking updates
      trackingInterval.current = setInterval(() => {
        setDroneLocation(prev => {
          if (!prev || !deliveryPath.length) return prev;
          
          // Move drone along the delivery path
          const currentIndex = Math.floor(Math.random() * deliveryPath.length);
          const targetPoint = deliveryPath[currentIndex];
          
          const newLocation = {
            lat: prev.lat + (targetPoint.lat - prev.lat) * 0.1,
            lng: prev.lng + (targetPoint.lng - prev.lng) * 0.1
          };
          
          // Add to tracking history
          setTrackingHistory(prev => [
            ...prev.slice(-9), // Keep last 9
            {
              timestamp: new Date(),
              location: newLocation,
              status: deliveryStatus
            }
          ]);
          
          return newLocation;
        });
        
        // Update ETA
        setEta(prev => Math.max(1, prev - 1));
        
        // Randomly change status
        if (Math.random() < 0.1) {
          const statuses = ['en_route', 'nearby', 'arrived'];
          const currentIndex = statuses.indexOf(deliveryStatus);
          if (currentIndex < statuses.length - 1) {
            setDeliveryStatus(statuses[currentIndex + 1]);
          }
        }
      }, 3000); // Update every 3 seconds
    } else {
      // Production: Real-time API polling
      trackingInterval.current = setInterval(async () => {
        try {
          const response = await fetch(`/api/drone/track/${orderId}`);
          const data = await response.json();
          setDroneLocation(data.location);
          setDeliveryStatus(data.status);
          setEta(data.eta);
        } catch (error) {
          console.error('Live tracking update failed:', error);
        }
      }, 5000); // Update every 5 seconds
    }
  };

  const stopLiveTracking = () => {
    setIsLiveTracking(false);
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_route': return 'text-primary-600 bg-primary-50';
      case 'nearby': return 'text-yellow-600 bg-yellow-50';
      case 'arrived': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_route': return <Plane className="w-4 h-4" />;
      case 'nearby': return <Navigation className="w-4 h-4" />;
      case 'arrived': return <MapPin className="w-4 h-4" />;
      default: return <Truck className="w-4 h-4" />;
    }
  };

  const getWeatherStatusColor = (isSafe) => {
    return isSafe ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  if (!droneLocation || !pickupLocation || !deliveryLocation) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading drone tracking...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Plane className="w-5 h-5 text-primary-500" />
            Live Drone Tracking
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Order #{orderId?.slice(-8)} • {deliveryType} Delivery
          </p>
        </div>
        
        {/* Map Provider Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary-100 rounded-lg px-3 py-1">
            <Globe className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">Google Maps</span>
          </div>
          
          {mockMode && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded border">
              🚁 Mock Mode
            </span>
          )}
          
          {!isLiveTracking ? (
            <button
              onClick={startLiveTracking}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Play className="w-4 h-4" />
              Start Live Tracking
            </button>
          ) : (
            <button
              onClick={stopLiveTracking}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Square className="w-4 h-4" />
              Stop Tracking
            </button>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryStatus)}`}>
              {getStatusIcon(deliveryStatus)}
              <span className="ml-1">{deliveryStatus.replace('_', ' ').toUpperCase()}</span>
            </span>
          </div>
          <p className="text-sm text-primary-700">
            {deliveryStatus === 'en_route' && 'Drone is on the way to your location'}
            {deliveryStatus === 'nearby' && 'Drone is approaching your delivery point'}
            {deliveryStatus === 'arrived' && 'Drone has arrived at your location'}
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Estimated Arrival</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{eta} min</p>
          <p className="text-xs text-green-600">ETA updates in real-time</p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Current Location</span>
          </div>
          <p className="text-xs text-purple-700 font-mono">
            Lat: {droneLocation.lat.toFixed(6)}
          </p>
          <p className="text-xs text-purple-700 font-mono">
            Lng: {droneLocation.lng.toFixed(6)}
          </p>
        </div>

        {/* Weather Conditions */}
        {weatherConditions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWeatherStatusColor(weatherConditions.isSafe)}`}>
                <Zap className="w-3 h-3 inline mr-1" />
                {weatherConditions.isSafe ? 'SAFE' : 'UNSAFE'}
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              {weatherConditions.temperature}°C, {weatherConditions.windSpeed} km/h
            </p>
            <p className="text-xs text-yellow-600">
              {weatherConditions.visibility}
            </p>
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Live Delivery Map</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
            <span>Drone</span>
            <div className="w-3 h-3 bg-green-500 rounded-full ml-3"></div>
            <span>Delivery</span>
            <div className="w-3 h-3 bg-orange-500 rounded-full ml-3"></div>
            <span>Pickup</span>
          </div>
        </div>
        
        {/* Google Maps Integration */}
        <div className="relative bg-gray-100 rounded-lg h-96 overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <Globe className="w-12 h-12 text-primary-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">Google Maps Integration</p>
              <p className="text-sm text-gray-500 mb-3">Live drone tracking with Google Maps</p>
              
              {/* Map Placeholder with Delivery Info */}
              <div className="bg-white rounded-lg p-4 shadow-sm max-w-sm mx-auto">
                <div className="space-y-3">
                  {/* Pickup Location */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-700">Pickup</p>
                      <p className="text-xs text-gray-500">
                        Lat: {pickupLocation?.lat?.toFixed(6)}, Lng: {pickupLocation?.lng?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delivery Location */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-700">Delivery</p>
                      <p className="text-xs text-gray-500">
                        Lat: {deliveryLocation?.lat?.toFixed(6)}, Lng: {deliveryLocation?.lng?.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Drone Location */}
                  {droneLocation && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                      <div className="text-left">
                        <p className="text-xs font-medium text-gray-700">Drone</p>
                        <p className="text-xs text-gray-500">
                          Lat: {droneLocation.lat.toFixed(6)}, Lng: {droneLocation.lng.toFixed(6)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                Add your Google Maps API key to enable full map functionality
              </p>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          {mockMode ? 'Mock map showing simulated drone movement' : 'Real-time drone location tracking'}
        </p>
      </div>

      {/* Tracking History */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Tracking History</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {trackingHistory.slice().reverse().map((point, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
              <span className="text-gray-600">
                {point.timestamp.toLocaleTimeString()}
              </span>
              <span className="text-gray-500">
                ({point.location.lat.toFixed(4)}, {point.location.lng.toFixed(4)})
              </span>
              <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(point.status)}`}>
                {point.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live Updates Info */}
      {isLiveTracking && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">Live Tracking Active</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            {mockMode 
              ? 'Mock drone location updates every 3 seconds'
              : 'Real drone location updates every 5 seconds'
            }
          </p>
        </div>
      )}

      {/* Development Mode Info */}
      {mockMode && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-700">
            🚁 <strong>Development Mode:</strong> This is simulated drone tracking data. 
            In production, you'll see real drone locations and live updates.
          </p>
        </div>
      )}
    </div>
  );
};

export default DroneTrackingMap;
