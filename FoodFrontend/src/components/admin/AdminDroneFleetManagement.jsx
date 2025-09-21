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
    Settings,
    Wrench,
    Activity,
    TrendingUp,
    RefreshCw,
    Eye,
    BarChart3,
    Shield,
    Zap,
    Thermometer,
    Gauge
} from 'lucide-react';

const AdminDroneFleetManagement = () => {
    const { admin } = useAuthStore();
    const [fleetOverview, setFleetOverview] = useState(null);
    const [maintenanceDrones, setMaintenanceDrones] = useState([]);
    const [realTimeLocations, setRealTimeLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        if (admin) {
            loadFleetData();
        }
    }, [admin]);

    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => {
                loadFleetData();
            }, 15000); // Refresh every 15 seconds
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadFleetData = async () => {
        try {
            const [overviewRes, maintenanceRes, locationsRes] = await Promise.all([
                api.get('/drone/admin/fleet-overview'),
                api.get('/drone/admin/maintenance-needed'),
                api.get('/drone/telemetry/locations')
            ]);

            setFleetOverview(overviewRes.data.data);
            setMaintenanceDrones(maintenanceRes.data.data.maintenanceDrones || []);
            setRealTimeLocations(locationsRes.data.data.activeDrones || []);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load fleet data:', error);
        } finally {
            setLoading(false);
        }
        };

    const getOperationalStatusColor = (status) => {
        const statusColors = {
            'operational': 'text-green-600',
            'maintenance_required': 'text-yellow-600',
            'emergency': 'text-red-600',
            'offline': 'text-gray-600'
        };
        return statusColors[status] || 'text-gray-600';
    };

    const getOperationalStatusIcon = (status) => {
        const statusIcons = {
            'operational': <CheckCircle className="w-5 h-5" />,
            'maintenance_required': <Wrench className="w-5 h-5" />,
            'emergency': <AlertCircle className="w-5 h-5" />,
            'offline': <XCircle className="w-5 h-5" />
        };
        return statusIcons[status] || <AlertCircle className="w-5 h-5" />;
    };

    const getBatteryColor = (battery) => {
        if (battery <= 20) return 'text-red-600';
        if (battery <= 40) return 'text-orange-600';
        if (battery <= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    const getHealthScoreColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
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

    const FleetOverviewCard = () => {
        if (!fleetOverview) return null;

        const { fleet, recentDeliveries } = fleetOverview;
        const operationalPercentage = fleet.totalDrones > 0 ? 
            Math.round((fleet.operationalDrones / fleet.totalDrones) * 100) : 0;

        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Fleet Overview</h3>
                
                {/* Fleet Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-primary-600">{fleet.totalDrones}</div>
                        <div className="text-sm text-gray-600">Total Drones</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{fleet.operationalDrones}</div>
                        <div className="text-sm text-gray-600">Operational</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{fleet.maintenanceDrones}</div>
                        <div className="text-sm text-gray-600">Maintenance</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{fleet.emergencyDrones}</div>
                        <div className="text-sm text-gray-600">Emergency</div>
                    </div>
                </div>

                {/* Fleet Health */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Fleet Health</span>
                        <span className="text-sm font-medium text-gray-900">{operationalPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full ${
                                operationalPercentage >= 80 ? 'bg-green-600' : 
                                operationalPercentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${operationalPercentage}%` }}
                        ></div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                            <Battery className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Avg Battery</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {Math.round(fleet.avgBattery || 0)}%
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                            <Shield className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Avg Health</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                            {Math.round(fleet.avgHealthScore || 0)}%
                        </div>
                    </div>
                </div>

                {/* Recent Deliveries */}
                {recentDeliveries && recentDeliveries.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Deliveries</h4>
                        <div className="space-y-2">
                            {recentDeliveries.slice(0, 3).map((delivery, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Order #{delivery.orderId}</span>
                                    <span className="text-gray-500">
                                        {formatTime(delivery.deliveredAt)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const MaintenanceDroneCard = ({ drone }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    {getOperationalStatusIcon(drone.operationalStatus)}
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {drone.name} ({drone.droneId})
                        </h3>
                        <p className={`text-sm font-medium ${getOperationalStatusColor(drone.operationalStatus)}`}>
                            {formatStatus(drone.operationalStatus)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${getHealthScoreColor(drone.healthScore)}`}>
                        {drone.healthScore}%
                    </div>
                    <div className="text-xs text-gray-500">Health</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                    <Battery className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.battery}% Battery
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <Wrench className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.criticalErrors} Critical Errors
                    </span>
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Last Maintenance:</span>
                    <span className="text-gray-900">
                        {drone.lastMaintenance ? formatDate(drone.lastMaintenance) : 'Never'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Next Maintenance:</span>
                    <span className="text-gray-900">
                        {drone.nextMaintenance ? formatDate(drone.nextMaintenance) : 'TBD'}
                    </span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                    onClick={() => setSelectedDrone(drone)}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors"
                >
                    <Eye className="w-4 h-4 inline mr-2" />
                    View Details
                </button>
            </div>
        </div>
    );

    const RealTimeDroneCard = ({ drone }) => (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <Drone className="w-6 h-6 text-primary-600" />
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {drone.name} ({drone.droneId})
                        </h3>
                        <p className="text-sm font-medium text-primary-600">
                            {formatStatus(drone.status)}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${getBatteryColor(drone.battery)}`}>
                        {drone.battery}%
                    </div>
                    <div className="text-xs text-gray-500">Battery</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.location?.altitude || 0}m Altitude
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.location?.speed || 0} m/s Speed
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.location?.heading || 0}° Heading
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                        {drone.flightMode || 'Unknown'}
                    </span>
                </div>
            </div>

            <div className="text-sm text-gray-500 mb-4">
                Last active: {drone.lastActive ? formatTime(drone.lastActive) : 'Unknown'}
            </div>

            <div className="flex space-x-3">
                <button
                    onClick={() => setSelectedDrone(drone)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Track
                </button>
                
                <button
                    onClick={loadFleetData}
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
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    🚁 Drone Fleet Management
                </h1>
                <p className="text-gray-600">
                    Monitor and manage your entire drone fleet in real-time
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
                        <span className="text-sm text-gray-700">Auto-refresh every 15s</span>
                    </label>
                    
                    <button
                        onClick={loadFleetData}
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

            {/* Fleet Overview */}
            <div className="mb-8">
                <FleetOverviewCard />
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                <button
                    onClick={() => setActiveTab('maintenance')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'maintenance'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Maintenance Needed ({maintenanceDrones.length})
                </button>
                <button
                    onClick={() => setActiveTab('realtime')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'realtime'
                            ? 'bg-white text-primary-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                    Real-time Locations ({realTimeLocations.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'maintenance' ? (
                <div>
                    {maintenanceDrones.length === 0 ? (
                        <div className="text-center py-12">
                            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Maintenance Required
                            </h3>
                            <p className="text-gray-600">
                                All drones are in good operational condition.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {maintenanceDrones.map((drone) => (
                                <MaintenanceDroneCard 
                                    key={drone._id} 
                                    drone={drone}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    {realTimeLocations.length === 0 ? (
                        <div className="text-center py-12">
                            <Drone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No Active Drones
                            </h3>
                            <p className="text-gray-600">
                                No drones are currently in flight or active.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {realTimeLocations.map((drone) => (
                                <RealTimeDroneCard 
                                    key={drone._id} 
                                    drone={drone}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Drone Details Modal */}
            {selectedDrone && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">
                                Drone Details - {selectedDrone.name} ({selectedDrone.droneId})
                            </h3>
                            <button
                                onClick={() => setSelectedDrone(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <div className="bg-gray-100 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Model:</span> <span className="ml-2">{selectedDrone.model || 'Unknown'}</span></div>
                                        <div><span className="text-gray-600">Serial:</span> <span className="ml-2">{selectedDrone.serialNumber || 'Unknown'}</span></div>
                                        <div><span className="text-gray-600">Status:</span> <span className="ml-2">{formatStatus(selectedDrone.status)}</span></div>
                                        <div><span className="text-gray-600">Operational:</span> <span className="ml-2">{formatStatus(selectedDrone.operationalStatus)}</span></div>
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-lg p-4">
                                    <h4 className="font-medium text-blue-900 mb-2">Current Location</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Latitude:</span> <span className="ml-2">{selectedDrone.location?.lat || 'Unknown'}</span></div>
                                        <div><span className="text-gray-600">Longitude:</span> <span className="ml-2">{selectedDrone.location?.lng || 'Unknown'}</span></div>
                                        <div><span className="text-gray-600">Altitude:</span> <span className="ml-2">{selectedDrone.location?.altitude || 0}m</span></div>
                                        <div><span className="text-gray-600">Speed:</span> <span className="ml-2">{selectedDrone.location?.speed || 0} m/s</span></div>
                                        <div><span className="text-gray-600">Heading:</span> <span className="ml-2">{selectedDrone.location?.heading || 0}°</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance & Health */}
                            <div className="space-y-4">
                                <div className="bg-green-50 rounded-lg p-4">
                                    <h4 className="font-medium text-green-900 mb-2">Performance</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Battery:</span> <span className="ml-2">{selectedDrone.battery}%</span></div>
                                        <div><span className="text-gray-600">Health Score:</span> <span className="ml-2">{selectedDrone.maintenance?.healthScore || 0}%</span></div>
                                        <div><span className="text-gray-600">Flight Hours:</span> <span className="ml-2">{selectedDrone.maintenance?.totalFlightHours || 0}h</span></div>
                                        <div><span className="text-gray-600">Total Flights:</span> <span className="ml-2">{selectedDrone.maintenance?.totalFlights || 0}</span></div>
                                    </div>
                                </div>

                                <div className="bg-yellow-50 rounded-lg p-4">
                                    <h4 className="font-medium text-yellow-900 mb-2">Maintenance</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Last Maintenance:</span> <span className="ml-2">{selectedDrone.maintenance?.lastMaintenance ? formatDate(selectedDrone.maintenance.lastMaintenance) : 'Never'}</span></div>
                                        <div><span className="text-gray-600">Next Maintenance:</span> <span className="ml-2">{selectedDrone.maintenance?.nextMaintenance ? formatDate(selectedDrone.maintenance.nextMaintenance) : 'TBD'}</span></div>
                                        <div><span className="text-gray-600">Critical Errors:</span> <span className="ml-2">{selectedDrone.errors?.filter(e => e.severity === 'critical' && !e.resolved).length || 0}</span></div>
                                    </div>
                                </div>

                                <div className="bg-red-50 rounded-lg p-4">
                                    <h4 className="font-medium text-red-900 mb-2">Flight Status</h4>
                                    <div className="space-y-2 text-sm">
                                        <div><span className="text-gray-600">Flight Mode:</span> <span className="ml-2">{selectedDrone.flightMode || 'Unknown'}</span></div>
                                        <div><span className="text-gray-600">Armed:</span> <span className="ml-2">{selectedDrone.armed ? 'Yes' : 'No'}</span></div>
                                        <div><span className="text-gray-600">In Air:</span> <span className="ml-2">{selectedDrone.inAir ? 'Yes' : 'No'}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                            <button
                                onClick={loadFleetData}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4 inline mr-2" />
                                Refresh
                            </button>
                            <button
                                onClick={() => setSelectedDrone(null)}
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

export default AdminDroneFleetManagement;
