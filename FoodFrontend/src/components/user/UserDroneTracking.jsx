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
    Drone
} from 'lucide-react';

const UserDroneTracking = () => {
    const { user } = useAuthStore();
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [deliveryHistory, setDeliveryHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');
    const [selectedDelivery, setSelectedDelivery] = useState(null);

    useEffect(() => {
        if (user) {
            loadActiveDeliveries();
            loadDeliveryHistory();
        }
    }, [user]);

    const loadActiveDeliveries = async () => {
        try {
            const response = await api.get('/drone/user/active-deliveries');
            setActiveDeliveries(response.data.data.activeDeliveries || []);
        } catch (error) {
            console.error('Failed to load active deliveries:', error);
        }
    };

    const loadDeliveryHistory = async () => {
        try {
            const response = await api.get('/drone/user/history');
            setDeliveryHistory(response.data.data.deliveries || []);
        } catch (error) {
            console.error('Failed to load delivery history:', error);
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
            'approaching_delivery': 'text-green-600',
            'delivered': 'text-green-600',
            'failed': 'text-red-600',
            'cancelled': 'text-gray-600'
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
            'approaching_delivery': <MapPin className="w-5 h-5" />,
            'delivered': <CheckCircle className="w-5 h-5" />,
            'failed': <XCircle className="w-5 h-5" />,
            'cancelled': <XCircle className="w-5 h-5" />
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

    const DeliveryCard = ({ delivery, isActive = true }) => (
        <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
            isActive ? 'border-blue-500' : 'border-gray-300'
        }`}>
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
                {isActive && delivery.deliveryProgress !== undefined && (
                    <div className="text-right">
                        <div className="text-2xl font-bold text-primary-600">
                            {Math.round(delivery.deliveryProgress)}%
                        </div>
                        <div className="text-xs text-gray-500">Complete</div>
                    </div>
                )}
            </div>

            {isActive && delivery.drone && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3">
                        <Drone className="w-6 h-6 text-primary-600" />
                        <div>
                            <h4 className="font-medium text-blue-900">
                                {delivery.drone.name} ({delivery.drone.droneId})
                            </h4>
                            <p className="text-sm text-blue-700">
                                Status: {formatStatus(delivery.drone.status)}
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
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

            <div className="space-y-3">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div className="text-sm">
                        <p className="text-gray-900 font-medium">Delivery Location</p>
                        <p className="text-gray-600">{delivery.location?.delivery?.address || 'Address not available'}</p>
                    </div>
                </div>

                {isActive && delivery.estimatedDeliveryTime && (
                    <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Estimated Delivery</p>
                            <p className="text-gray-600">
                                {formatTime(delivery.estimatedDeliveryTime)} • {formatDate(delivery.estimatedDeliveryTime)}
                            </p>
                        </div>
                    </div>
                )}

                {!isActive && delivery.deliveredAt && (
                    <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Delivered On</p>
                            <p className="text-gray-600">
                                {formatTime(delivery.deliveredAt)} • {formatDate(delivery.deliveredAt)}
                            </p>
                        </div>
                    </div>
                )}

                {delivery.seller && (
                    <div className="flex items-center space-x-3">
                        <Truck className="w-4 h-4 text-gray-500" />
                        <div className="text-sm">
                            <p className="text-gray-900 font-medium">Restaurant</p>
                            <p className="text-gray-600">{delivery.seller.name}</p>
                        </div>
                    </div>
                )}

                {!isActive && delivery.totalPrice && (
                    <div className="flex items-center space-x-3">
                        <span className="text-sm">
                            <p className="text-gray-900 font-medium">Total Cost</p>
                            <p className="text-gray-600">₹{delivery.totalPrice}</p>
                        </span>
                    </div>
                )}
            </div>

            {isActive && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => setSelectedDelivery(delivery)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Track Live Location
                    </button>
                </div>
            )}
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
                    🚁 Drone Delivery Tracking
                </h1>
                <p className="text-gray-600">
                    Track your drone deliveries in real-time and view delivery history
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'active'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Active Deliveries ({activeDeliveries.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'history'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Delivery History ({deliveryHistory.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'active' ? (
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
                                <DeliveryCard 
                                    key={delivery._id} 
                                    delivery={delivery} 
                                    isActive={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {deliveryHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Delivery History
                            </h3>
                            <p className="text-gray-600">
                                You haven't completed any drone deliveries yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {deliveryHistory.map((delivery) => (
                                <DeliveryCard 
                                    key={delivery._id} 
                                    delivery={delivery} 
                                    isActive={false}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Live Tracking Modal */}
            {selectedDelivery && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
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
                        
                        <div className="bg-gray-100 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                Real-time drone tracking will be implemented here with:
                            </p>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Live GPS coordinates</li>
                                <li>• Real-time altitude and speed</li>
                                <li>• Estimated time of arrival</li>
                                <li>• Interactive map view</li>
                            </ul>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
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

export default UserDroneTracking;
