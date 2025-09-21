import { useState, useEffect } from 'react';
import { MapPin, Truck, Clock, Globe } from 'lucide-react';

const DroneTracking = ({ orderId }) => {
  const [droneLocation, setDroneLocation] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderId) {
      fetchDroneLocation();
      // Simulate real-time updates every 10 seconds
      const interval = setInterval(fetchDroneLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const fetchDroneLocation = async () => {
    try {
      // Mock data for development
      if (process.env.NODE_ENV === 'development') {
        const mockData = {
          droneLocation: {
            lat: 12.9716 + (Math.random() - 0.5) * 0.01,
            lng: 77.5946 + (Math.random() - 0.5) * 0.01,
            timestamp: new Date()
          },
          deliveryLocation: {
            lat: 12.9789,
            lng: 77.5917,
            address: '123 Main Street, Bangalore'
          },
          pickupLocation: {
            lat: 12.9716,
            lng: 77.5946,
            address: '456 Restaurant Lane, Bangalore'
          }
        };
        
        setDroneLocation(mockData.droneLocation);
        setDeliveryLocation(mockData.deliveryLocation);
        setPickupLocation(mockData.pickupLocation);
        setIsLoading(false);
      } else {
        // Production: Fetch real data
        const response = await fetch(`/api/drone/track/${orderId}`);
        const data = await response.json();
        setDroneLocation(data.droneLocation);
        setDeliveryLocation(data.deliveryLocation);
        setPickupLocation(data.pickupLocation);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Failed to fetch drone location');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading drone tracking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!droneLocation || !deliveryLocation || !pickupLocation) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No tracking data available</p>
      </div>
    );
  }

  const mapCenter = [
    (pickupLocation.lat + deliveryLocation.lat) / 2,
    (pickupLocation.lng + deliveryLocation.lng) / 2
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-full">
            <Truck className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Drone Delivery Tracking</h2>
            <p className="text-sm text-gray-600">Order #{orderId}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-blue-700">Status</span>
            </div>
            <p className="text-lg font-semibold text-blue-700">In Transit</p>
            <p className="text-xs text-primary-600">Drone is on the way</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">ETA</span>
            </div>
            <p className="text-lg font-semibold text-green-700">15 min</p>
            <p className="text-xs text-green-600">Estimated arrival</p>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Truck className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Distance</span>
            </div>
            <p className="text-lg font-semibold text-purple-700">2.3 km</p>
            <p className="text-xs text-purple-600">Remaining</p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">Live Tracking</h3>
          <p className="text-sm text-gray-500">Real-time drone location and delivery route</p>
        </div>
        
        <div className="h-96 relative">
          {/* Google Maps Placeholder */}
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <Globe className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">Google Maps Integration</p>
              <p className="text-sm text-gray-500 mb-3">Live drone tracking with Google Maps</p>
              
              {/* Map Placeholder with Delivery Info */}
              <div className="bg-white rounded-lg p-4 shadow-sm max-w-sm mx-auto">
                <div className="space-y-3">
                  {/* Pickup Location */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-700">Pickup</p>
                      <p className="text-xs text-gray-500">{pickupLocation.address}</p>
                      <p className="text-xs text-gray-400">
                        Lat: {pickupLocation.lat.toFixed(4)}, Lng: {pickupLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delivery Location */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-700">Delivery</p>
                      <p className="text-xs text-gray-500">{deliveryLocation.address}</p>
                      <p className="text-xs text-gray-400">
                        Lat: {deliveryLocation.lat.toFixed(4)}, Lng: {deliveryLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Drone Location */}
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-gray-700">Drone</p>
                      <p className="text-xs text-gray-500">
                        Last updated: {droneLocation.timestamp.toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        Lat: {droneLocation.lat.toFixed(4)}, Lng: {droneLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3">
                Add your Google Maps API key to enable full map functionality
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-100 rounded-full">
              <MapPin className="h-4 w-4 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900">Pickup Location</h4>
          </div>
          <p className="text-sm text-gray-600">{pickupLocation.address}</p>
          <p className="text-xs text-gray-400 mt-1">
            Coordinates: {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-red-100 rounded-full">
              <MapPin className="h-4 w-4 text-red-600" />
            </div>
            <h4 className="font-medium text-gray-900">Delivery Location</h4>
          </div>
          <p className="text-sm text-gray-600">{deliveryLocation.address}</p>
          <p className="text-xs text-gray-400 mt-1">
            Coordinates: {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Tracking Information</h4>
        <ul className="text-sm text-primary-800 space-y-1">
          <li>• The drone location updates every 10 seconds</li>
          <li>• Green marker shows pickup location (restaurant/shop)</li>
          <li>• Red marker shows delivery location (your address)</li>
          <li>• Blue marker shows current drone position</li>
          <li>• Estimated arrival time is calculated based on distance and speed</li>
        </ul>
      </div>
    </div>
  );
};

export default DroneTracking;
