import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../stores/api';
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
    Eye,
    RefreshCw,
    TrendingUp
} from 'lucide-react';

const SellerDroneTracking = () => {
    const { seller } = useAuthStore();
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        if (seller) {
            loadActiveDeliveries();
        }
    }, [seller]);

    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                loadActiveDeliveries();
            }, 10000); // Refresh every 10 seconds
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadActiveDeliveries = async () => {
        try {
            const response = await api.get('/drone/seller/active-deliveries');
            setActiveDeliveries(response.data.data.activeDeliveries || []);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load active deliveries:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'assigned': 'text-primary-600',
            'preparing': 'text-yellow-600',
            'ready_for_pickup': 'text-orange-600',
            'drone_en_route': 'text-purple-600',
            'picked_up': 'text-indigo-600',
            'in_transit': 'text-primary-600',
            'approaching_delivery': 'text-green-600'
        };
        return statusColors[status] || 'text-gray-600';
    };

    const getStatusIcon = (status) => {
        const statusIcons = {
            'assigned': <Drone className="w-5 h-5" />,
            'preparing': <Truck className="w-5 h-5" />,
            'ready_for_pickup': <CheckCircle className="w-5 h-5" />,
            'drone_en_route': <Navigation className="w-5 h-5" />,
            'picked_up': <CheckCircle className="w-5 h-5" />,
            'in_transit': <Navigation className="w-5 h-5" />,
            'approaching_delivery': <MapPin className="w-5 h-5" />
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

    const getBatteryColor = (battery) => {
        if (battery <= 20) return 'text-red-600';
        if (battery <= 40) return 'text-orange-600';
        if (battery <= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getBatteryIcon = (battery) => {
        if (battery <= 20) return '🔴';
        if (battery <= 40) return '🟠';
        if (battery <= 70) return '🟡';
        return '🟢';
    };

    const DeliveryTrackingCard = ({ delivery }) => (
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
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <Drone className="w-6 h-6 text-green-600" />
                            <h4 className="font-medium text-green-900">
                                {delivery.drone.name} ({delivery.drone.droneId})
                            </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm">{getBatteryIcon(delivery.drone.battery)}</span>
                            <span className={`text-sm font-medium ${getBatteryColor(delivery.drone.battery)}`}>
                                {delivery.drone.battery}%
                            </span>
                        </div>
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
                        <div className="flex items-center space-x-2">
                            <Navigation className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {delivery.drone.location?.speed || 0} m/s Speed
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {delivery.drone.location?.heading || 0}° Heading
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Location and Timing */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div className="text-sm">
                        <p className="text-gray-900 font-medium">Delivery Location</p>
                        <p className="text-gray-600">{delivery.location?.delivery?.address || 'Address not available'}</p>
                    </div>
                </div>

                {delivery.location?.delivery?.pincode && (
                    <div className="flex items-center space-x-3">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Pincode</p>
                            <p className="text-gray-600">{delivery.location.delivery.pincode}</p>
                        </div>
                    </div>
                )}

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

                {delivery.timing?.actualPickupTime && (
                    <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Picked Up At</p>
                            <p className="text-gray-600">
                                {formatTime(delivery.timing.actualPickupTime)} • {formatDate(delivery.timing.actualPickupTime)}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
                <button
                    onClick={() => setSelectedDelivery(delivery)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Track Live
                </button>
                
                <button
                    onClick={loadActiveDeliveries}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
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
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    🚁 Live Drone Tracking
                </h1>
                <p className="text-gray-600">
                    Track your active drone deliveries in real-time
                </p>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded text-primary-600"
                        />
                        <span className="text-sm text-gray-700">Auto-refresh every 10s</span>
                    </label>
                    
                    <button
                        onClick={loadActiveDeliveries}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Refresh Now</span>
                    </button>
                </div>

                {lastUpdate && (
                    <div className="text-sm text-gray-500">
                        Last updated: {formatTime(lastUpdate)}
                    </div>
                )}
            </div>

            {/* Active Deliveries */}
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
                            <DeliveryTrackingCard 
                                key={delivery._id} 
                                delivery={delivery}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Live Tracking Modal */}
            {selectedDelivery && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                Live Tracking - Order #{selectedDelivery.orderId}
                            </h3>
                            <button
                                onClick={() => setSelectedDelivery(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Delivery Information */}
                            <div className="space-y-4">
                                <div className="bg-gray-100 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Delivery Status</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`font-medium ${getStatusColor(selectedDelivery.status)}`}>
                                                {formatStatus(selectedDelivery.status)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Progress:</span>
                                            <span className="font-medium text-primary-600">
                                                {Math.round(selectedDelivery.deliveryProgress || 0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {selectedDelivery.customer && (
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-900 mb-2">Customer Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="text-gray-600">Name:</span> <span className="ml-2">{selectedDelivery.customer.name}</span></div>
                                            <div><span className="text-gray-600">Email:</span> <span className="ml-2">{selectedDelivery.customer.email}</span></div>
                                            <div><span className="text-gray-600">Mobile:</span> <span className="ml-2">{selectedDelivery.customer.mobile}</span></div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-green-50 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900 mb-2">Delivery Location</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Address:</span> <span className="ml-2">{selectedDelivery.location?.delivery?.address || 'Not available'}</span></div>
                                        {selectedDelivery.location?.delivery?.pincode && (
                                            <div><span className="text-gray-600">Pincode:</span> <span className="ml-2">{selectedDelivery.location.delivery.pincode}</span></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Drone Information */}
                            {selectedDelivery.drone && (
                                <div className="space-y-4">
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <h4 className="font-medium text-green-900 mb-2">Drone Information</h4>
                                        <div className="space-y-2 text-sm">
                                            <div><span className="text-gray-600">Name:</span> <span className="ml-2">{selectedDelivery.drone.name}</span></div>
                                            <div><span className="text-gray-600">ID:</span> <span className="ml-2">{selectedDelivery.drone.droneId}</span></div>
                                            <div><span className="text-gray-600">Status:</span> <span className="ml-2">{formatStatus(selectedDelivery.drone.status)}</span></div>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-900 mb-2">Real-time Telemetry</h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Battery:</span>
                                                <span className={`font-medium ${getBatteryColor(selectedDelivery.drone.battery)}`}>
                                                    {selectedDelivery.drone.battery}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Altitude:</span>
                                                <span className="font-medium">{selectedDelivery.drone.location?.altitude || 0}m</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Speed:</span>
                                                <span className="font-medium">{selectedDelivery.drone.location?.speed || 0} m/s</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Heading:</span>
                                                <span className="font-medium">{selectedDelivery.drone.location?.heading || 0}°</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 rounded-lg p-4">
                                        <h4 className="font-medium text-yellow-900 mb-2">Estimated Times</h4>
                                        <div className="space-y-2 text-sm">
                                            {selectedDelivery.timing?.estimatedDeliveryTime && (
                                                <div><span className="text-gray-600">ETA:</span> <span className="ml-2">{formatTime(selectedDelivery.timing.estimatedDeliveryTime)}</span></div>
                                            )}
                                            {selectedDelivery.timing?.actualPickupTime && (
                                                <div><span className="text-gray-600">Picked Up:</span> <span className="ml-2">{formatTime(selectedDelivery.timing.actualPickupTime)}</span></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={loadActiveDeliveries}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4 inline mr-2" />
                                Refresh
                            </button>
                            <button
                                onClick={() => setSelectedDelivery(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerDroneTracking;
