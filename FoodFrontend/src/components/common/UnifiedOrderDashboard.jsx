import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { 
  Package, Clock, CheckCircle, XCircle, Truck, 
  Filter, Search, Download, RefreshCw, Eye, User, Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-hot-toast';

const UnifiedOrderDashboard = () => {
  const { user } = useAuthStore();
  const { getUserOrders } = useAppStore();
  
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [filters, setFilters] = useState({
    status: 'all',
    searchQuery: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    delivered: 0,
    cancelled: 0
  });

  useEffect(() => {
    loadOrders();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      if (user.role === 'user') {
        await getUserOrders();
        const userOrders = useAppStore.getState().userOrders || [];
        setOrders(userOrders);
      } else {
        // Mock data for seller/admin
        setOrders(generateMockOrders());
      }
      updateStats();
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderId.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query)
      );
    }
    setFilteredOrders(filtered);
  };

  const updateStats = () => {
    const newStats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
    setStats(newStats);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.delivered}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.cancelled}</div>
        </CardContent>
      </Card>
    </div>
  );

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search orders..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderOrderList = () => (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order._id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1 capitalize">{order.status}</span>
                      </Badge>
                      <span className="text-sm text-gray-500">#{order.orderId}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{order.customerName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold">${order.total}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOrderDetails = () => (
    selectedOrder && (
      <Card className="sticky top-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Order Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrder(null)}
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="text-sm font-medium">#{selectedOrder.orderId}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge className={getStatusColor(selectedOrder.status)}>
                {getStatusIcon(selectedOrder.status)}
                <span className="ml-1 capitalize">{selectedOrder.status}</span>
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Customer:</span>
              <span className="text-sm font-medium">{selectedOrder.customerName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-sm font-bold">${selectedOrder.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user.role === 'user' ? 'My Orders' : 
             user.role === 'seller' ? 'Shop Orders' : 'All Orders'}
          </h1>
          <p className="text-gray-600">Manage and track orders</p>
        </div>
        
        <Button
          variant="outline"
          onClick={() => loadOrders()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {renderStatsCards()}
      {renderFilters()}

      <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="list">Orders List</TabsTrigger>
          <TabsTrigger value="details">Order Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {renderOrderList()}
            </div>
            <div className="lg:col-span-1">
              {renderOrderDetails()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details">
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Order</h3>
            <p className="text-gray-600">Choose an order from the list to view details</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const generateMockOrders = () => [
  {
    _id: '1',
    orderId: 'ORD001',
    customerName: 'John Doe',
    status: 'pending',
    total: 25.99
  },
  {
    _id: '2',
    orderId: 'ORD002',
    customerName: 'Jane Smith',
    status: 'delivered',
    total: 18.50
  }
];

export default UnifiedOrderDashboard;
