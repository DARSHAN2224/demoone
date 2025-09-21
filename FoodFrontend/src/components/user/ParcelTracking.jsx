import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../stores/api';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
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
    Package,
    ArrowLeft,
    Search,
    Camera,
    Mic,
    MoreVertical,
    Phone,
    MessageCircle
} from 'lucide-react';

const ParcelTracking = () => {
    const { user } = useAuthStore();
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [deliveryHistory, setDeliveryHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Mock data for demonstration - replace with real API calls
    const mockDeliveries = [
        {
            id: 'ORD-12345',
            status: 'in_transit',
            progress: 75,
            product: {
                name: 'Delicious Pizza Margherita',
                image: '/api/placeholder/80/80',
                quantity: 2,
                price: 299
            },
            delivery: {
                estimatedDate: 'November 3, 2024',
                previousDate: 'November 28, 2024',
                time: '2:30 PM',
                address: '123 Main Street, Downtown, City 12345',
                recipient: 'John Smith'
            },
            drone: {
                id: 'DRONE-001',
                name: 'SkyRunner Alpha',
                battery: 78,
                speed: 45,
                altitude: 120,
                location: {
                    lat: 47.6414678,
                    lng: -122.1401649
                }
            },
            timeline: [
                { status: 'ordered', label: 'Ordered', completed: true, time: 'Nov 1, 2:30 PM' },
                { status: 'preparing', label: 'Preparing', completed: true, time: 'Nov 1, 3:15 PM' },
                { status: 'shipped', label: 'Shipped', completed: true, time: 'Nov 2, 10:30 AM' },
                { status: 'in_transit', label: 'Out for delivery', completed: true, time: 'Nov 3, 1:45 PM' },
                { status: 'delivered', label: 'Delivered', completed: false, time: 'Estimated 2:30 PM' }
            ]
        }
    ];

    useEffect(() => {
        if (user) {
            loadDeliveries();
        }
    }, [user]);

    const loadDeliveries = async () => {
        try {
            const response = await api.get('/parcel-tracking/user/active-parcels');
            if (response.data.success) {
                setActiveDeliveries(response.data.data.activeParcels);
            } else {
                // Fallback to mock data if API fails
                setActiveDeliveries(mockDeliveries);
            }
            setDeliveryHistory([]);
        } catch (error) {
            console.error('Failed to load deliveries:', error);
            // Fallback to mock data on error
            setActiveDeliveries(mockDeliveries);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'ordered': 'text-primary-600',
            'preparing': 'text-yellow-600',
            'shipped': 'text-purple-600',
            'in_transit': 'text-green-600',
            'delivered': 'text-green-600',
            'failed': 'text-red-600',
            'cancelled': 'text-gray-600'
        };
        return statusColors[status] || 'text-gray-600';
    };

    const getStatusIcon = (status) => {
        const statusIcons = {
            'ordered': <Package className="w-5 h-5" />,
            'preparing': <Truck className="w-5 h-5" />,
            'shipped': <Drone className="w-5 h-5" />,
            'in_transit': <Navigation className="w-5 h-5" />,
            'delivered': <CheckCircle className="w-5 h-5" />,
            'failed': <XCircle className="w-5 h-5" />,
            'cancelled': <XCircle className="w-5 h-5" />
        };
        return statusIcons[status] || <AlertCircle className="w-5 h-5" />;
    };

    const formatStatus = (status) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const renderMap = (status) => {
        if (status === Status.LOADING) return <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />;
        if (status === Status.FAILURE) return <div className="h-64 bg-red-100 rounded-lg flex items-center justify-center text-red-600">Map failed to load</div>;
        
        return (
            <div className="h-64 w-full rounded-lg overflow-hidden">
                <GoogleMap
                    center={{ lat: 47.6414678, lng: -122.1401649 }}
                    zoom={15}
                    markers={[
                        {
                            position: { lat: 47.6414678, lng: -122.1401649 },
                            title: 'Delivery Location',
                            icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        }
                    ]}
                />
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search Amazon.com"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                                <Camera className="w-5 h-5" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                                <Mic className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-6">
                {activeDeliveries.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No Active Deliveries
                        </h3>
                        <p className="text-gray-600">
                            You don't have any active parcel deliveries at the moment.
                        </p>
                    </div>
                ) : (
                    activeDeliveries.map((delivery) => (
                        <div key={delivery.id} className="space-y-6">
                            {/* Delivery Status Header */}
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Now arriving {delivery.delivery.estimatedDate}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            Previously expected {delivery.delivery.previousDate}
                                        </p>
                                    </div>
                                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                                        See all orders
                                    </button>
                                </div>

                                {/* Product Info */}
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                        <Package className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{delivery.product.name}</h3>
                                        <p className="text-sm text-gray-600">Quantity: {delivery.product.quantity}</p>
                                        <p className="text-sm font-medium text-gray-900">₹{delivery.product.price}</p>
                                    </div>
                                </div>

                                {/* Map Section */}
                                <div className="mb-6">
                                    <div className="relative">
                                        <Wrapper apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY} render={renderMap}>
                                            {renderMap(Status.LOADING)}
                                        </Wrapper>
                                        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
                                            <p className="font-medium text-gray-900">{delivery.delivery.recipient}</p>
                                            <p className="text-sm text-gray-600">{delivery.delivery.address}</p>
                                        </div>
                                        <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                                            © 2024 Google Maps
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Timeline */}
                                <div className="bg-white rounded-lg p-6">
                                    <h3 className="font-semibold text-gray-900 mb-4">Order Progress</h3>
                                    <div className="space-y-4">
                                        {delivery.timeline.map((step, index) => (
                                            <div key={step.status} className="flex items-center space-x-4">
                                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                                    step.completed 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'bg-gray-200 text-gray-400'
                                                }`}>
                                                    {step.completed ? (
                                                        <CheckCircle className="w-5 h-5" />
                                                    ) : (
                                                        <div className="w-3 h-3 rounded-full bg-current" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-medium ${
                                                        step.completed ? 'text-gray-900' : 'text-gray-500'
                                                    }`}>
                                                        {step.label}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{step.time}</p>
                                                </div>
                                                {index < delivery.timeline.length - 1 && (
                                                    <div className="w-px h-8 bg-gray-200 ml-4" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-4 mt-6">
                                    <button className="btn-primary-enhanced flex-1">
                                        Update delivery instructions
                                    </button>
                                    <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                                        Cancel order
                                    </button>
                                    <button className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Order Info */}
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">Order Info</h3>
                                        <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-800">
                                            <span className="text-sm font-medium">View or Change this order</span>
                                            <Navigation className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Drone Status */}
                                {delivery.drone && (
                                    <div className="mt-4 bg-primary-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <Drone className="w-6 h-6 text-primary-600" />
                                                <div>
                                                    <h4 className="font-medium text-primary-900">
                                                        {delivery.drone.name}
                                                    </h4>
                                                    <p className="text-sm text-primary-700">
                                                        Drone ID: {delivery.drone.id}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center space-x-4 text-sm text-primary-700">
                                                    <div className="flex items-center space-x-1">
                                                        <Battery className="w-4 h-4" />
                                                        <span>{delivery.drone.battery}%</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Navigation className="w-4 h-4" />
                                                        <span>{delivery.drone.speed} km/h</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{delivery.drone.altitude}m</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-2">
                    <div className="flex items-center justify-around">
                        <button className="flex flex-col items-center py-2 text-gray-600">
                            <div className="w-6 h-6 mb-1">🏠</div>
                            <span className="text-xs">Home</span>
                        </button>
                        <button className="flex flex-col items-center py-2 text-gray-600">
                            <div className="w-6 h-6 mb-1">✨</div>
                            <span className="text-xs">Deals</span>
                        </button>
                        <button className="flex flex-col items-center py-2 text-primary-600 border-b-2 border-primary-600">
                            <div className="w-6 h-6 mb-1 relative">
                                👤
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            <span className="text-xs">Profile</span>
                        </button>
                        <button className="flex flex-col items-center py-2 text-gray-600">
                            <div className="w-6 h-6 mb-1">🛒</div>
                            <span className="text-xs">Cart</span>
                        </button>
                        <button className="flex flex-col items-center py-2 text-gray-600">
                            <div className="w-6 h-6 mb-1">☰</div>
                            <span className="text-xs">Menu</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParcelTracking;
