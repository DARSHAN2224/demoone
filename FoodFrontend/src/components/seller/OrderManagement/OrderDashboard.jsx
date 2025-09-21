import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  TrendingUp, 
  AlertCircle,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import OrderStats from './OrderStats';
import OrderFilters from './OrderFilters';
import OrderList from './OrderList';
import OrderDetails from './OrderDetails';
import OrderAnalytics from './OrderAnalytics';

const OrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0
  });

  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'today',
    searchQuery: '',
    minAmount: '',
    maxAmount: '',
    deliveryType: 'all',
    paymentStatus: 'all'
  });

  const [viewMode, setViewMode] = useState('list'); // 'list', 'analytics', 'details'
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadOrders();
    startAutoRefresh();
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const startAutoRefresh = () => {
    const interval = setInterval(() => {
      loadOrders(true); // Silent refresh
    }, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
  };

  const loadOrders = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    try {
      // This would call the backend API
      const mockOrders = generateMockOrders();
      setOrders(mockOrders);
      
      if (!silent) {
        toast.success('Orders loaded successfully');
      }
    } catch (error) {
      if (!silent) {
        toast.error('Failed to load orders');
      }
      console.error('Error loading orders:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const startDate = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(order => new Date(order.createdAt) >= startDate);
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderId.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query)
      );
    }

    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(order => order.total >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(order => order.total <= parseFloat(filters.maxAmount));
    }

    // Delivery type filter
    if (filters.deliveryType !== 'all') {
      filtered = filtered.filter(order => order.deliveryType === filters.deliveryType);
    }

    // Payment status filter
    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === filters.paymentStatus);
    }

    setFilteredOrders(filtered);
    updateStats(filtered);
  };

  const updateStats = (orderList) => {
    const newStats = {
      total: orderList.length,
      pending: orderList.filter(o => o.status === 'pending').length,
      confirmed: orderList.filter(o => o.status === 'confirmed').length,
      preparing: orderList.filter(o => o.status === 'preparing').length,
      ready: orderList.filter(o => o.status === 'ready').length,
      outForDelivery: orderList.filter(o => o.status === 'outForDelivery').length,
      delivered: orderList.filter(o => o.status === 'delivered').length,
      cancelled: orderList.filter(o => o.status === 'cancelled').length,
      todayRevenue: calculateTodayRevenue(orderList),
      weeklyRevenue: calculateWeeklyRevenue(orderList),
      monthlyRevenue: calculateMonthlyRevenue(orderList)
    };
    
    setStats(newStats);
  };

  const calculateTodayRevenue = (orderList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orderList
      .filter(order => new Date(order.createdAt) >= today && order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0);
  };

  const calculateWeeklyRevenue = (orderList) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return orderList
      .filter(order => new Date(order.createdAt) >= weekAgo && order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0);
  };

  const calculateMonthlyRevenue = (orderList) => {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    return orderList
      .filter(order => new Date(order.createdAt) >= monthAgo && order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0);
  };

  const handleOrderAction = async (orderId, action, data = {}) => {
    try {
      // This would call the backend API
      const updatedOrders = orders.map(order => {
        if (order._id === orderId) {
          return { ...order, ...data, status: action };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      toast.success(`Order ${action} successfully`);
      
      // Update selected order if it's the one being modified
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder(updatedOrders.find(o => o._id === orderId));
      }
    } catch (error) {
      toast.error(`Failed to ${action} order`);
      console.error(`Error ${action} order:`, error);
    }
  };

  const exportOrders = () => {
    // This would generate and download a CSV/Excel file
    toast.success('Orders exported successfully');
  };

  const generateMockOrders = () => {
    return [
      {
        _id: '1',
        orderId: 'ORD001',
        customerName: 'John Doe',
        customerPhone: '+1234567890',
        customerEmail: 'john@example.com',
        status: 'pending',
        paymentStatus: 'paid',
        deliveryType: 'regular',
        total: 45.99,
        items: [
          { name: 'Pizza Margherita', quantity: 2, price: 22.99 },
          { name: 'Coke', quantity: 1, price: 2.99 }
        ],
        deliveryAddress: '123 Main St, City, State 12345',
        deliveryInstructions: 'Leave at door',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        estimatedDelivery: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        shopId: 'shop1',
        shopName: 'Pizza Palace'
      },
      {
        _id: '2',
        orderId: 'ORD002',
        customerName: 'Jane Smith',
        customerPhone: '+1987654321',
        customerEmail: 'jane@example.com',
        status: 'preparing',
        paymentStatus: 'paid',
        deliveryType: 'drone',
        total: 78.50,
        items: [
          { name: 'Burger Combo', quantity: 1, price: 15.99 },
          { name: 'Chicken Wings', quantity: 1, price: 12.99 },
          { name: 'Fries', quantity: 2, price: 4.99 },
          { name: 'Milkshake', quantity: 1, price: 6.99 }
        ],
        deliveryAddress: '456 Oak Ave, City, State 12345',
        pickupLocation: '789 Food Court, City, State 12345',
        deliveryLocation: '456 Oak Ave, City, State 12345',
        deliveryInstructions: 'Call when arriving',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
        shopId: 'shop1',
        shopName: 'Burger House'
      }
    ];
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Manage and track all customer orders</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadOrders()}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={exportOrders}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <OrderStats stats={stats} />

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Orders List
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'analytics' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Analytics
          </button>
        </div>

        <div className="text-sm text-gray-500">
          Auto-refresh every 30 seconds
        </div>
      </div>

      {/* Filters */}
      <OrderFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApplyFilters={applyFilters}
      />

      {/* Content */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-2">
            <OrderList
              orders={filteredOrders}
              onOrderSelect={setSelectedOrder}
              onOrderAction={handleOrderAction}
              isLoading={isLoading}
            />
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1">
            {selectedOrder ? (
              <OrderDetails
                order={selectedOrder}
                onOrderAction={handleOrderAction}
                onClose={() => setSelectedOrder(null)}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select an order to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === 'analytics' && (
        <OrderAnalytics orders={filteredOrders} stats={stats} />
      )}
    </div>
  );
};

export default OrderDashboard;
