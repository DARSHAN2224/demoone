import { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Truck, 
  CheckCircle,
  BarChart3,
  PieChart
} from 'lucide-react';
import { api } from '../../stores/api.js';

import AdminSidebar from './AdminSidebar';
import AdminStatCard from '../common/AdminStatCard';
import DroneOrderTable from '../common/DroneOrderTable';
import PageHeader from '../common/PageHeader';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeDroneDeliveries: 0,
    completedDeliveries: 0
  });
  
  const [droneOrders, setDroneOrders] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalOrders: 0,
    activeDroneDeliveries: 0,
    completedDeliveries: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Integrated admin drone management state
  const [adminDroneNotifications, setAdminDroneNotifications] = useState([]);
  const [globalWeatherConditions, setGlobalWeatherConditions] = useState({
    temperature: 0,
    windSpeed: 0,
    precipitation: 0,
    visibility: 'unknown',
    droneFlightSafe: false,
    activeRegions: 0,
    totalFleet: 0,
    availableDrones: 0,
    dronesInFlight: 0
  });
  const [droneFleetStatus, setDroneFleetStatus] = useState([]);

  useEffect(() => {
    // Add a small delay to ensure authentication is established
    const timer = setTimeout(() => {
      fetchDashboardData();
      fetchDroneOrders();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [selectedStatus, currentPage]);

  // Auto-update admin drone notifications and global conditions
  useEffect(() => {
    // Generate initial notifications
    const notifications = generateAdminDroneNotifications();
    setAdminDroneNotifications(notifications);
    
    // Fetch real data immediately
    updateGlobalConditions();
    
    // Update global conditions every 30 seconds for real-time monitoring
    const globalInterval = setInterval(updateGlobalConditions, 30000);
    
    // Update notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      const newNotifications = generateAdminDroneNotifications();
      setAdminDroneNotifications(newNotifications);
    }, 30000);
    
    return () => {
      clearInterval(globalInterval);
      clearInterval(notificationInterval);
    };
  }, [analytics, droneOrders]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔍 AdminDashboard: Fetching dashboard stats...');
      
      // Fetch dashboard statistics
      const statsResponse = await api.get('/admin/stats');
      console.log('🔍 AdminDashboard: Stats response:', statsResponse);
      
      if (statsResponse.data.success) {
        console.log('🔍 AdminDashboard: Setting stats:', statsResponse.data.data);
        setStats(statsResponse.data.data);
      } else {
        console.warn('⚠️ AdminDashboard: Stats response not successful:', statsResponse.data);
      }
    } catch (error) {
      console.error('❌ AdminDashboard: Failed to fetch dashboard stats:', error);
      console.error('❌ AdminDashboard: Error response:', error.response);
      // Don't fail completely, just log the error
    }
    
    try {
      console.log('🔍 AdminDashboard: Fetching analytics...');
      
      const analyticsResp = await api.get('/admin/analytics');
      console.log('🔍 AdminDashboard: Analytics response:', analyticsResp);
      
      if (analyticsResp.data?.success) {
        console.log('🔍 AdminDashboard: Setting analytics:', analyticsResp.data.data);
        setAnalytics(analyticsResp.data.data);
      } else {
        console.warn('⚠️ AdminDashboard: Analytics response not successful:', analyticsResp.data);
      }
    } catch (error) {
      console.error('❌ AdminDashboard: Failed to fetch analytics:', error);
      console.error('❌ AdminDashboard: Error response:', error.response);
      // Don't fail completely, just log the error
    }

    // Fetch real weather and fleet data
    await fetchWeatherData();
    await fetchDroneFleetData();
  };

  const fetchDroneOrders = async () => {
    try {
      console.log('🔍 AdminDashboard: Fetching drone orders...');
      console.log('🔍 AdminDashboard: Params:', { status: selectedStatus, page: currentPage });
      
      setIsLoading(true);
      const response = await api.get(`/drone/admin/all`, { params: { status: selectedStatus, page: currentPage } });
      
      console.log('🔍 AdminDashboard: Drone orders response:', response);
      
      if (response.data.success) {
        console.log('🔍 AdminDashboard: Setting drone orders:', response.data.data.droneOrders);
        console.log('🔍 AdminDashboard: Total pages:', response.data.data.pagination.totalPages);
        setDroneOrders(response.data.data.droneOrders);
        setTotalPages(response.data.data.pagination.totalPages);
      } else {
        console.warn('⚠️ AdminDashboard: Drone orders response not successful:', response.data);
      }
    } catch (error) {
      console.error('❌ AdminDashboard: Failed to fetch drone orders:', error);
      console.error('❌ AdminDashboard: Error response:', error.response);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDroneOrderStatus = async (droneOrderId, newStatus) => {
    try {
      const response = await api.patch(`/drone/update/${droneOrderId}`, { status: newStatus });
      
      if (response.data.success) {
        // Refresh the list
        fetchDroneOrders();
      }
    } catch (error) {
      console.error('Failed to update drone order status:', error);
    }
  };

  const fetchWeatherData = async () => {
    try {
      console.log('🌤️ Fetching weather data...');
      // Try to get weather from fleet overview first
      const response = await api.get('/drone/admin/fleet-overview');
      
      if (response.data.success && response.data.data?.weatherStatus) {
        const weather = response.data.data.weatherStatus;
        setGlobalWeatherConditions(prev => ({
          ...prev,
          temperature: weather.temperature || 22,
          windSpeed: weather.windSpeed || 8,
          precipitation: weather.precipitation || 0,
          visibility: weather.visibility || 'good',
          droneFlightSafe: weather.safeToFly || true
        }));
        console.log('✅ Weather data updated from fleet overview:', weather);
      } else {
        // Fallback to default weather data
        setGlobalWeatherConditions(prev => ({
          ...prev,
          temperature: 22,
          windSpeed: 8,
          precipitation: 0,
          visibility: 'good',
          droneFlightSafe: true
        }));
        console.log('ℹ️ Using default weather data');
      }
    } catch (error) {
      console.error('❌ Failed to fetch weather data, using defaults:', error);
      // Use fallback data on error
      setGlobalWeatherConditions(prev => ({
        ...prev,
        temperature: 22,
        windSpeed: 8,
        precipitation: 0,
        visibility: 'good',
        droneFlightSafe: true
      }));
    }
  };

  const fetchDroneFleetData = async () => {
    try {
      console.log('🚁 Fetching real fleet data...');
      const response = await api.get('/drone/admin/fleet-overview');
      
      if (response.data.success && response.data.data) {
        const fleetData = response.data.data;
        setGlobalWeatherConditions(prev => ({
          ...prev,
          totalFleet: fleetData.totalDrones || 0,
          availableDrones: fleetData.operationalDrones || 0,
          dronesInFlight: fleetData.activeDeliveries || 0,
          activeRegions: fleetData.activeRegions || 1
        }));
        setDroneFleetStatus(fleetData.drones || []);
        console.log('✅ Fleet data updated:', fleetData);
        
        // Also update weather if available in fleet data
        if (fleetData.weatherStatus) {
          const weather = fleetData.weatherStatus;
          setGlobalWeatherConditions(prev => ({
            ...prev,
            temperature: weather.temperature || prev.temperature,
            windSpeed: weather.windSpeed || prev.windSpeed,
            precipitation: weather.precipitation || prev.precipitation,
            visibility: weather.visibility || prev.visibility,
            droneFlightSafe: weather.safeToFly !== undefined ? weather.safeToFly : prev.droneFlightSafe
          }));
          console.log('✅ Weather data updated from fleet:', weather);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch fleet data:', error);
    }
  };

  // Generate real admin drone notifications from actual drone orders
  const generateAdminDroneNotifications = () => {
    const notifications = [];
    
    // Use real drone orders data if available
    if (droneOrders && droneOrders.length > 0) {
      droneOrders.slice(0, 4).forEach((order, index) => {
        const createdAt = new Date(order.createdAt);
        const now = new Date();
        const minutesAgo = Math.floor((now - createdAt) / (1000 * 60));
        
        let status, bgColor, textColor, borderColor, timeText;
        
        // Map order status to notification status
        switch (order.status) {
          case 'assigned':
            status = 'Drone Assignment';
            bgColor = 'bg-yellow-50';
            textColor = 'text-yellow-800';
            borderColor = 'border-yellow-200';
            break;
          case 'preparing':
            status = 'Drone Preparing for Launch';
            bgColor = 'bg-blue-50';
            textColor = 'text-blue-800';
            borderColor = 'border-blue-200';
            break;
          case 'ready_for_pickup':
            status = 'Drone Arrived at Shop';
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
            borderColor = 'border-green-200';
            break;
          case 'in_flight':
            status = 'Drone En Route to Customer';
            bgColor = 'bg-purple-50';
            textColor = 'text-purple-800';
            borderColor = 'border-purple-200';
            break;
          case 'delivering':
            status = 'Drone Delivering Package';
            bgColor = 'bg-indigo-50';
            textColor = 'text-indigo-800';
            borderColor = 'border-indigo-200';
            break;
          default:
            status = 'Drone Order Created';
            bgColor = 'bg-gray-50';
            textColor = 'text-gray-800';
            borderColor = 'border-gray-200';
        }
        
        // Format time
        if (minutesAgo < 1) {
          timeText = 'Just Now';
        } else if (minutesAgo < 60) {
          timeText = `${minutesAgo} min ago`;
        } else {
          const hoursAgo = Math.floor(minutesAgo / 60);
          timeText = `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
        }
        
        notifications.push({
          id: `admin-notification-${order._id}`,
          orderId: order.orderId,
          droneId: order.droneId?.droneId || 'N/A',
          shopName: order.sellerId?.name || 'Unknown Shop',
          city: order.location?.city || 'Unknown City',
          status,
          bgColor,
          textColor,
          borderColor,
          timeText,
          orderDetails: {
            items: order.items?.length || 0,
            amount: order.pricing?.totalAmount || 0,
            battery: order.droneId?.battery || 0,
            eta: order.timing?.estimatedDeliveryTime || 0
          }
        });
      });
    }
    
    return notifications;
  };

  // Update global weather and fleet conditions with real data
  const updateGlobalConditions = async () => {
    console.log('🔄 Updating global conditions...');
    await fetchWeatherData();
    await fetchDroneFleetData();
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <AdminSidebar />
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <PageHeader
            title="Admin Dashboard"
            subtitle="Manage your food delivery platform"
          />


        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <AdminStatCard
            title="Total Users"
            value={stats.totalUsers || 0}
            icon={Users}
            bgColor="bg-blue-100"
            iconColor="text-primary-600"
          />
          <AdminStatCard
            title="Total Orders"
            value={stats.totalOrders || 0}
            icon={Package}
            bgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <AdminStatCard
            title="Active Drone Deliveries"
            value={stats.activeDroneDeliveries || 0}
            icon={Truck}
            bgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
          <AdminStatCard
            title="Completed Deliveries"
            value={stats.completedDeliveries || 0}
            icon={CheckCircle}
            bgColor="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* Analytics Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Platform Overview</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Users', value: analytics.totalUsers, max: Math.max(analytics.totalUsers, 1), color: 'bg-blue-500' },
                { label: 'Orders', value: analytics.totalOrders, max: Math.max(analytics.totalOrders, 1), color: 'bg-green-500' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{row.label}</span>
                    <span className="text-gray-900 font-medium">{row.value}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div className={`h-2 ${row.color} rounded`} style={{ width: `${Math.min(100, (row.value / row.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border rounded p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><PieChart className="w-4 h-4" /> Drone Success Rate</h3>
            </div>
            {(() => {
              const total = (analytics.completedDeliveries || 0) + (analytics.activeDroneDeliveries || 0);
              const rate = total > 0 ? Math.round(((analytics.completedDeliveries || 0) / total) * 100) : 0;
              return (
                <div>
                  <div className="text-3xl font-bold mb-2">{rate}%</div>
                  <div className="text-sm text-gray-600 mb-4">Completed vs Active</div>
                  <div className="w-full h-3 bg-gray-200 rounded">
                    <div className="h-3 bg-emerald-500 rounded" style={{ width: `${rate}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>Completed: {analytics.completedDeliveries || 0}</span>
                    <span>Active: {analytics.activeDroneDeliveries || 0}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Drone Notifications Section */}
        <div className="bg-white border rounded p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-600" />
              <span>Live Drone Notifications</span>
            </h3>
            <button
              onClick={() => fetchDroneOrders()}
              className="text-primary-600 hover:text-blue-700 text-sm font-medium"
            >
              Refresh →
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Integrated admin drone notifications based on real analytics */}
            {process.env.NODE_ENV === 'development' && adminDroneNotifications.length > 0 ? (
              <div className="space-y-3">
                {adminDroneNotifications.map((notification) => (
                  <div key={notification.id} className={`p-4 ${notification.bgColor} border ${notification.borderColor} rounded-lg`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Truck className={`w-4 h-4 ${notification.textColor.replace('text-', 'text-')}`} />
                      <span className={`font-medium ${notification.textColor}`}>{notification.status}</span>
                      <span className={`text-xs ${notification.textColor} ${notification.bgColor.replace('50', '100')} px-2 py-1 rounded-full`}>
                        {notification.timeText}
                      </span>
                    </div>
                    <p className={`text-sm ${notification.textColor.replace('800', '700')} mb-2`}>
                      Drone #{notification.droneId} - {notification.shopName} ({notification.city}) for order #{notification.orderId}
                    </p>
                    <div className={`text-xs ${notification.textColor.replace('800', '600')} space-y-1`}>
                      <p><strong>Order:</strong> {notification.orderId} • {notification.orderDetails.items} items • ₹{notification.orderDetails.amount}</p>
                      <p><strong>Shop:</strong> {notification.shopName} • Location: {notification.city}</p>
                      <p><strong>Drone Status:</strong> {notification.status.includes('Arrived') ? 'Ready for pickup' : notification.status.includes('En Route') ? `ETA: ${notification.orderDetails.eta} min` : 'Preparing for launch'} • Battery: {notification.orderDetails.battery}%</p>
                    </div>
                  </div>
                ))}
                
                {/* Global Fleet Status */}
                <div className={`p-3 ${globalWeatherConditions.droneFlightSafe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{globalWeatherConditions.droneFlightSafe ? '✅' : '⚠️'}</span>
                      <span className={`font-medium ${globalWeatherConditions.droneFlightSafe ? 'text-green-800' : 'text-red-800'}`}>
                        Global Fleet Status: {globalWeatherConditions.droneFlightSafe ? 'All Systems Operational' : 'Weather Alert Active'}
                      </span>
                    </div>
                    <div className={`text-xs ${globalWeatherConditions.droneFlightSafe ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {globalWeatherConditions.dronesInFlight}/{globalWeatherConditions.totalFleet} Drones Active
                    </div>
                  </div>
                  <div className={`text-xs ${globalWeatherConditions.droneFlightSafe ? 'text-green-600' : 'text-red-600'} grid grid-cols-2 md:grid-cols-4 gap-2`}>
                    <span>🌡️ {globalWeatherConditions.temperature}°C</span>
                    <span>💨 {globalWeatherConditions.windSpeed} km/h</span>
                    <span>☔ {globalWeatherConditions.precipitation}%</span>
                    <span>🚁 {globalWeatherConditions.availableDrones} Available</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <div className="text-lg font-medium mb-2">No Active Drone Orders</div>
                <p className="text-sm">Real drone delivery notifications will appear here when you have active drone orders in your database</p>
                <p className="text-xs text-gray-400 mt-2">
                  Current database shows: {droneOrders.length} drone orders
                </p>
              </div>
            )}
            
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Truck className="w-5 h-5 mr-2" />
                Production Drone Management
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm mb-4">
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Real-time monitoring</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Weather integration</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Fleet optimization</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Emergency controls</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <span>Route planning</span>
                </div>
                <div className="flex items-center space-x-2 text-blue-700">
                  <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                  <span>Performance analytics</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>🚁 Drone Registration:</strong> To add new drones to your fleet, go to the <strong>Drone Fleet Management</strong> section in the sidebar and use the <strong>"Register Drone"</strong> tab.
                </p>
                <p className="text-xs text-blue-600">
                  The drone registration form includes all necessary fields: Drone ID, Name, Model, Serial Number, MAVSDK Port, Max Payload, Max Range, and Home Location.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Drone Orders Management */}
        {droneOrders.length > 0 && (
          <DroneOrderTable
            droneOrders={droneOrders}
            isLoading={isLoading}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            updateDroneOrderStatus={updateDroneOrderStatus}
          />
        )}
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
