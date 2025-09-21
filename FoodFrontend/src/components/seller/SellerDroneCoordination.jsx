import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../stores/api';
import GoogleMap from '../maps/GoogleMap';
import { 
    MapPin, 
    Clock, 
    Battery, 
    Navigation, 
    CheckCircle, 
    XCircle, 
    AlertCircle,
    Truck,
    Drone,
    User,
    Phone,
    Mail,
    Cloud,
    Wind,
    Settings,
    Activity,
    Zap,
    Globe,
    RefreshCw,
    Eye,
    Wrench,
    Map
} from 'lucide-react';

const SellerDroneCoordination = () => {
    const { seller } = useAuthStore();
    const [pendingOrders, setPendingOrders] = useState([]);
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [callDroneLoading, setCallDroneLoading] = useState(false);
    
    // Map state for drone tracking
    const [showMap, setShowMap] = useState(false);
    const [droneLocation, setDroneLocation] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi
    const [dronePosition, setDronePosition] = useState(null);
    const [droneStatus, setDroneStatus] = useState('idle');

    useEffect(() => {
        if (seller) {
            loadPendingOrders();
            loadActiveDeliveries();
        }
    }, [seller]);

    const loadPendingOrders = async () => {
        try {
            const response = await api.get('/drone/seller/pending-orders');
            setPendingOrders(response.data.data.pendingOrders || []);
        } catch (error) {
            console.error('Failed to load pending orders:', error);
        }
    };

    const loadActiveDeliveries = async () => {
        try {
            const response = await api.get('/drone/seller/active-deliveries');
            setActiveDeliveries(response.data.data.activeDeliveries || []);
        } catch (error) {
            console.error('Failed to load active deliveries:', error);
        } finally {
            setLoading(false);
        }
    };

    const callDroneToShop = async (orderId, pickupLocation) => {
        setCallDroneLoading(true);
        try {
            const response = await api.post('/drone/seller/call-drone', {
                orderId,
                pickupLocation
            });
            
            // Show map and start tracking drone location
            setShowMap(true);
            setSelectedOrder(orderId);
            
            // Set map center to pickup location
            if (pickupLocation && pickupLocation.lat && pickupLocation.lng) {
                setMapCenter({ lat: pickupLocation.lat, lng: pickupLocation.lng });
            }
            
            // Start tracking drone location
            startDroneTracking(orderId);
            
            // Reload data after successful drone call
            await loadPendingOrders();
            await loadActiveDeliveries();
            
            alert('Drone called to shop successfully! Map is now showing drone location.');
        } catch (error) {
            console.error('Failed to call drone:', error);
            alert('Failed to call drone. Please try again.');
        } finally {
            setCallDroneLoading(false);
        }
    };

    // Start tracking drone location for the given order
    const startDroneTracking = async (orderId) => {
        try {
            // Get drone location from the backend
            const response = await api.get(`/drone/seller/track/${orderId}`);
            const droneData = response.data.data;
            
            if (droneData && droneData.location) {
                setDroneLocation(droneData.location);
                setDronePosition({ lat: droneData.location.lat, lng: droneData.location.lng });
                setDroneStatus(droneData.status || 'flying');
                
                // Update map center to drone location
                setMapCenter({ lat: droneData.location.lat, lng: droneData.location.lng });
            }
            
            // Set up periodic tracking
            const trackingInterval = setInterval(async () => {
                try {
                    const trackResponse = await api.get(`/drone/seller/track/${orderId}`);
                    const trackData = trackResponse.data.data;
                    
                    if (trackData && trackData.location) {
                        setDroneLocation(trackData.location);
                        setDronePosition({ lat: trackData.location.lat, lng: trackData.location.lng });
                        setDroneStatus(trackData.status || 'flying');
                    }
                } catch (error) {
                    console.error('Failed to track drone:', error);
                }
            }, 5000); // Update every 5 seconds
            
            // Store interval ID for cleanup
            setDroneTrackingInterval(trackingInterval);
            
        } catch (error) {
            console.error('Failed to start drone tracking:', error);
        }
    };

    // State for tracking interval
    const [droneTrackingInterval, setDroneTrackingInterval] = useState(null);

    // Cleanup tracking interval on unmount
    useEffect(() => {
        return () => {
            if (droneTrackingInterval) {
                clearInterval(droneTrackingInterval);
            }
        };
    }, [droneTrackingInterval]);

    const getStatusColor = (status) => {
        const statusColors = {
            'pending': 'text-yellow-600',
            'weather_blocked': 'text-red-600',
            'assigned': 'text-primary-600',
            'preparing': 'text-orange-600',
            'ready_for_pickup': 'text-green-600',
            'drone_en_route': 'text-purple-600',
            'picked_up': 'text-indigo-600',
            'in_transit': 'text-primary-600'
        };
        return statusColors[status] || 'text-gray-600';
    };

    const getStatusIcon = (status) => {
        const statusIcons = {
            'pending': <Clock className="w-5 h-5" />,
            'weather_blocked': <Cloud className="w-5 h-5" />,
            'assigned': <Drone className="w-5 h-5" />,
            'preparing': <Truck className="w-5 h-5" />,
            'ready_for_pickup': <CheckCircle className="w-5 h-5" />,
            'drone_en_route': <Navigation className="w-5 h-5" />,
            'picked_up': <CheckCircle className="w-5 h-5" />,
            'in_transit': <Navigation className="w-5 h-5" />
        };
        return statusIcons[status] || <AlertCircle className="w-5 h-5" />;
    };

    const formatStatus = (status) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'TBD';
        return new Date(timeString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const PendingOrderCard = ({ order }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {getStatusIcon(order.status)}
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            Order #{order.orderId}
                        </h3>
                        <p className={`text-sm font-medium ${getStatusColor(order.status)}`}>
                            {formatStatus(order.status)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                    </div>
                    <div className="text-xs text-gray-400">
                        {formatTime(order.createdAt)}
                    </div>
                </div>
            </div>

            {/* Customer Information */}
            {order.customer && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                        <User className="w-5 h-5 text-primary-600" />
                        <h4 className="font-medium text-blue-900">Customer Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{order.customer.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{order.customer.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{order.customer.mobile}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Location Information */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div className="text-sm">
                        <p className="text-gray-900 font-medium">Delivery Location</p>
                        <p className="text-gray-600">{order.location?.delivery?.address || 'Address not available'}</p>
                    </div>
                </div>

                {order.location?.delivery?.pincode && (
                    <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Pincode</p>
                            <p className="text-gray-600">{order.location.delivery.pincode}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Weather Check */}
            {order.weatherCheck && (
                <div className={`rounded-lg p-4 mb-4 ${
                    order.weatherCheck.isSafe ? 'bg-green-50' : 'bg-red-50'
                }`}>
                    <div className="flex items-center space-x-3 mb-2">
                        {order.weatherCheck.isSafe ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <h4 className={`font-medium ${
                            order.weatherCheck.isSafe ? 'text-green-900' : 'text-red-900'
                        }`}>
                            Weather Status: {order.weatherCheck.isSafe ? 'Safe for Drone' : 'Weather Blocked'}
                        </h4>
                    </div>
                    
                    {!order.weatherCheck.isSafe && order.weatherCheck.weatherAlert && (
                        <p className="text-sm text-red-700">{order.weatherCheck.weatherAlert}</p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <button
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    View Details
                </button>
                
                {order.status === 'pending' && order.weatherCheck?.isSafe && (
                    <button
                        onClick={() => callDroneToShop(order.orderId, order.location?.pickup)}
                        disabled={callDroneLoading}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {callDroneLoading ? 'Calling...' : 'Call Drone'}
                    </button>
                )}
            </div>
        </div>
    );

    const ActiveDeliveryCard = ({ delivery }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {getStatusIcon(delivery.status)}
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            Order #{delivery.orderId}
                        </h3>
                        <p className={`text-sm font-medium ${getStatusColor(delivery.status)}`}>
                            {formatStatus(delivery.status)}
                        </p>
                    </div>
                </div>
                {delivery.deliveryProgress !== undefined && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                            {Math.round(delivery.deliveryProgress)}%
                        </div>
                        <div className="text-xs text-gray-500">Complete</div>
                    </div>
                )}
            </div>

            {/* Customer Information */}
            {delivery.customer && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                        <User className="w-5 h-5 text-primary-600" />
                        <h4 className="font-medium text-blue-900">Customer Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{delivery.customer.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{delivery.customer.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{delivery.customer.mobile}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Drone Information */}
            {delivery.drone && (
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                        <Drone className="w-6 h-6 text-green-600" />
                        <h4 className="font-medium text-green-900">
                            {delivery.drone.name} ({delivery.drone.droneId})
                        </h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                            <Battery className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {delivery.drone.battery}% Battery
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {delivery.drone.location?.altitude || 0}m Altitude
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Location and Timing */}
            <div className="space-y-3">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div className="text-sm">
                        <p className="text-gray-900 font-medium">Delivery Location</p>
                        <p className="text-gray-600">{delivery.location?.delivery?.address || 'Address not available'}</p>
                    </div>
                </div>

                {delivery.timing?.estimatedDeliveryTime && (
                    <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Estimated Delivery</p>
                            <p className="text-gray-600">
                                {formatTime(delivery.timing.estimatedDeliveryTime)} • {formatDate(delivery.timing.estimatedDeliveryTime)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                    onClick={() => setSelectedOrder(delivery)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    Track Delivery
                </button>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Modern Header */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                                <Drone className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                                    Drone Delivery Coordination
                                </h1>
                                <p className="text-gray-600 mt-1">Manage pending drone orders and track active deliveries</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 px-4 py-2 bg-gray-50 rounded-lg">
                                <Activity className="w-5 h-5 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">
                                  {pendingOrders.length} Pending Orders
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Tab Navigation */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'pending'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <Clock className="w-4 h-4" />
                                <span>Pending Orders ({pendingOrders.length})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    activeTab === 'active'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <Navigation className="w-4 h-4" />
                                <span>Active Deliveries ({activeDeliveries.length})</span>
                            </button>
                        </div>
                    </div>

            {/* Content */}
            {activeTab === 'pending' ? (
                <div>
                    {pendingOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Pending Orders
                            </h3>
                            <p className="text-gray-600">
                                You don't have any pending drone delivery orders at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {pendingOrders.map((order) => (
                                <PendingOrderCard 
                                    key={order._id} 
                                    order={order}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {activeDeliveries.length === 0 ? (
                        <div className="text-center py-12">
                            <Drone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Active Deliveries
                            </h3>
                            <p className="text-gray-600">
                                You don't have any active drone deliveries at the moment.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {activeDeliveries.map((delivery) => (
                                <ActiveDeliveryCard 
                                    key={delivery._id} 
                                    delivery={delivery}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Drone Tracking Map */}
            {showMap && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                                    <Map className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Drone Tracking</h3>
                                    <p className="text-sm text-gray-600">Real-time drone location for Order #{selectedOrder}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMap(false);
                                    if (droneTrackingInterval) {
                                        clearInterval(droneTrackingInterval);
                                        setDroneTrackingInterval(null);
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Close Map
                            </button>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Map */}
                            <div className="lg:col-span-2">
                                <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
                                    <GoogleMap
                                        center={mapCenter}
                                        zoom={15}
                                        dronePosition={dronePosition}
                                        droneStatus={droneStatus}
                                        className="h-full w-full"
                                    />
                                </div>
                            </div>
                            
                            {/* Drone Status */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 mb-3">Drone Status</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Status:</span>
                                            <span className={`text-sm font-medium ${
                                                droneStatus === 'flying' ? 'text-green-600' : 
                                                droneStatus === 'landing' ? 'text-yellow-600' : 
                                                'text-gray-600'
                                            }`}>
                                                {droneStatus || 'Unknown'}
                                            </span>
                                        </div>
                                        {droneLocation && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Latitude:</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {droneLocation.lat?.toFixed(6) || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Longitude:</span>
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {droneLocation.lng?.toFixed(6) || 'N/A'}
                                                    </span>
                                                </div>
                                                {droneLocation.altitude && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">Altitude:</span>
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {droneLocation.altitude}m
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-blue-900 mb-2">Order Information</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-700">Order ID:</span>
                                            <span className="text-sm font-medium text-blue-900">
                                                #{selectedOrder}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-blue-700">Tracking:</span>
                                            <span className="text-sm font-medium text-green-600">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                Order Details - #{selectedOrder.orderId}
                            </h3>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="bg-gray-100 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-2">Order Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Status:</span>
                                        <span className="ml-2 font-medium">{formatStatus(selectedOrder.status)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Created:</span>
                                        <span className="ml-2">{formatDate(selectedOrder.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedOrder.customer && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900 mb-2">Customer Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Name:</span> <span className="ml-2">{selectedOrder.customer.name}</span></div>
                                        <div><span className="text-gray-600">Email:</span> <span className="ml-2">{selectedOrder.customer.email}</span></div>
                                        <div><span className="text-gray-600">Mobile:</span> <span className="ml-2">{selectedOrder.customer.mobile}</span></div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-green-50 rounded-lg p-4">
                                <h4 className="font-medium text-green-900 mb-2">Delivery Location</h4>
                                <div className="space-y-2 text-sm">
                                    <div><span className="text-gray-600">Address:</span> <span className="ml-2">{selectedOrder.location?.delivery?.address || 'Not available'}</span></div>
                                    {selectedOrder.location?.delivery?.pincode && (
                                        <div><span className="text-gray-600">Pincode:</span> <span className="ml-2">{selectedOrder.location.delivery.pincode}</span></div>
                                    )}
                                </div>
                            </div>

                            {selectedOrder.weatherCheck && (
                                <div className={`rounded-lg p-4 ${
                                    selectedOrder.weatherCheck.isSafe ? 'bg-green-50' : 'bg-red-50'
                                }`}>
                                    <h4 className={`font-medium mb-2 ${
                                        selectedOrder.weatherCheck.isSafe ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                        Weather Status
                                    </h4>
                                    <div className="text-sm">
                                        <div className="mb-2">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`ml-2 font-medium ${
                                                selectedOrder.weatherCheck.isSafe ? 'text-green-700' : 'text-red-700'
                                            }`}>
                                                {selectedOrder.weatherCheck.isSafe ? 'Safe for Drone' : 'Weather Blocked'}
                                            </span>
                                        </div>
                                        {selectedOrder.weatherCheck.weatherAlert && (
                                            <div>
                                                <span className="text-gray-600">Alert:</span>
                                                <span className="ml-2 text-red-700">{selectedOrder.weatherCheck.weatherAlert}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
        </div>
    );
};

export default SellerDroneCoordination;
