import React, { useState, useEffect } from 'react';
import { useTelemetry, useMissionState } from '@/stores/appStore';
import DroneTrackingMap from '@/components/user/DroneTrackingMap';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Package, Truck } from 'lucide-react';

/**
 * UserDroneTracking - Production UI for Regular Users
 * This is the clean, simple interface that regular users see when tracking their delivery.
 * It only shows information relevant to their specific order.
 */
const UserDroneTracking = () => {
  const { orderId } = useParams(); // Get the order ID from the URL (e.g., /track/ORDER123)
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get live telemetry and mission state from our global store
  const telemetry = useTelemetry();
  const missionState = useMissionState();

    useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        // This API endpoint would return the drone assigned to this specific order
        const response = await api.get(`/orders/track/${orderId}`);
        setOrderDetails(response.data.data);
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Could not find order details. Please check your order ID.');
        } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrderDetails();
  }, [orderId]);

  // We only care about the telemetry for the drone assigned to THIS order
  const isRelevantTelemetry = orderDetails && telemetry.droneId === orderDetails.assignedDroneId;
  const dronePosition = isRelevantTelemetry && telemetry.latitude_deg && telemetry.longitude_deg 
    ? { lat: telemetry.latitude_deg, lng: telemetry.longitude_deg } 
    : null;

  // Prepare waypoints for the map (pickup and delivery locations)
  const waypoints = orderDetails ? [
    {
      lat: orderDetails.pickupLocation?.coordinates?.[1] || orderDetails.pickupLocation?.lat,
      lng: orderDetails.pickupLocation?.coordinates?.[0] || orderDetails.pickupLocation?.lng,
      label: 'Pickup Location'
    },
    {
      lat: orderDetails.deliveryLocation?.coordinates?.[1] || orderDetails.deliveryLocation?.lat,
      lng: orderDetails.deliveryLocation?.coordinates?.[0] || orderDetails.deliveryLocation?.lng,
      label: 'Delivery Location'
    }
  ].filter(wp => wp.lat && wp.lng) : [];

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading order details...</p>
                    </div>
                </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center p-8">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
          <p className="text-gray-400 mb-4">{error}</p>
                    <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                    >
            Go Back
                    </button>
                </div>
        </div>
    );
  }

  if (!orderDetails) {
        return (
      <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <p className="text-lg">No order details available</p>
        </div>
            </div>
        );
    }

    return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Map takes up most of the screen */}
      <div className="w-full h-full relative">
        <DroneTrackingMap
          dronePosition={dronePosition}
          waypoints={waypoints}
          showDronePath={true}
          showWaypointLabels={true}
        />
            </div>

      {/* Status overlay at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-6 m-4 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold">Order #{orderDetails.shortId || orderDetails.orderId}</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-mono text-cyan-400">{missionState.status || 'Preparing'}</p>
            <p className="text-sm text-gray-400">Status</p>
          </div>
            </div>

        <p className="text-sm text-gray-300 mb-4">{missionState.details || 'Your order is being prepared for delivery'}</p>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Delivery Progress</span>
            <span className="text-cyan-400">{missionState.progress || 0}%</span>
                        </div>
          <Progress value={missionState.progress || 0} className="h-2" />
                        </div>
                        
        {/* Order details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-green-400" />
            <span className="text-gray-400">From:</span>
            <span className="text-white">{orderDetails.shopName || 'Restaurant'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-blue-400" />
            <span className="text-gray-400">To:</span>
            <span className="text-white">{orderDetails.deliveryAddress || 'Your Address'}</span>
                        </div>
                        </div>
                        
        {/* Estimated delivery time */}
        {orderDetails.estimatedDeliveryTime && (
          <div className="mt-4 pt-4 border-t border-gray-600">
            <div className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-gray-400">Estimated delivery:</span>
              <span className="text-white font-medium">{orderDetails.estimatedDeliveryTime}</span>
                    </div>
                </div>
            )}
      </div>
        </div>
    );
};

export default UserDroneTracking;
