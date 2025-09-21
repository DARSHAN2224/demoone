import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

const OrderAnalytics = ({ orders, stats }) => {
  const [timeRange, setTimeRange] = useState('week');
  const [chartType, setChartType] = useState('status');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusData = () => {
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      outForDelivery: 0,
      delivered: 0,
      cancelled: 0
    };

    orders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : 0
    }));
  };

  const getRevenueData = () => {
    const dailyRevenue = {};
    
    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      if (order.status === 'delivered') {
        dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total;
      }
    });

    return Object.entries(dailyRevenue)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-7); // Last 7 days
  };

  const getDeliveryTypeData = () => {
    const deliveryCounts = {
      regular: 0,
      drone: 0,
      pickup: 0
    };

    orders.forEach(order => {
      deliveryCounts[order.deliveryType] = (deliveryCounts[order.deliveryType] || 0) + 1;
    });

    return Object.entries(deliveryCounts).map(([type, count]) => ({
      type,
      count,
      percentage: orders.length > 0 ? ((count / orders.length) * 100).toFixed(1) : 0
    }));
  };

  const getTopProducts = () => {
    const productCounts = {};
    
    orders.forEach(order => {
      order.items.forEach(item => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });

    return Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  const getAverageOrderValue = () => {
    if (orders.length === 0) return 0;
    const total = orders.reduce((sum, order) => sum + order.total, 0);
    return total / orders.length;
  };

  const getConversionRate = () => {
    const delivered = orders.filter(order => order.status === 'delivered').length;
    const cancelled = orders.filter(order => order.status === 'cancelled').length;
    const total = orders.length;
    
    if (total === 0) return 0;
    return ((delivered / (total - cancelled)) * 100).toFixed(1);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-primary-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-purple-500';
      case 'outForDelivery': return 'bg-indigo-500';
      case 'delivered': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDeliveryTypeColor = (type) => {
    switch (type) {
      case 'regular': return 'bg-primary-500';
      case 'drone': return 'bg-purple-500';
      case 'pickup': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const statusData = getStatusData();
  const revenueData = getRevenueData();
  const deliveryTypeData = getDeliveryTypeData();
  const topProducts = getTopProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into your order performance</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="status">Order Status</option>
            <option value="revenue">Revenue</option>
            <option value="delivery">Delivery Type</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            <span>+12% from last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            <span>+8% from last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(getAverageOrderValue())}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            <span>+5% from last period</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{getConversionRate()}%</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
            <span>+3% from last period</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="space-y-4">
            {statusData.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getStatusColor(item.status)}`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.status.replace(/([A-Z])/g, ' $1')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  <span className="text-sm text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Type Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Type Distribution</h3>
          <div className="space-y-4">
            {deliveryTypeData.map((item) => (
              <div key={item.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${getDeliveryTypeColor(item.type)}`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {item.type} Delivery
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  <span className="text-sm text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (Last 7 Days)</h3>
        <div className="h-64 flex items-end justify-between space-x-2">
          {revenueData.map(([date, revenue], index) => {
            const maxRevenue = Math.max(...revenueData.map(([, r]) => r));
            const height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
            
            return (
              <div key={date} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(revenue)}
                </div>
                <div 
                  className="w-full bg-primary-500 rounded-t"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
        <div className="space-y-3">
          {topProducts.map((product, index) => (
            <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 font-medium text-sm">{index + 1}</span>
                </div>
                <span className="font-medium text-gray-900">{product.name}</span>
              </div>
              <span className="text-sm text-gray-600">{product.count} units sold</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Positive Trends</span>
            </div>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• 15% increase in drone delivery orders</li>
              <li>• Average order value up by 8%</li>
              <li>• 92% customer satisfaction rate</li>
            </ul>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-900">Areas for Improvement</span>
            </div>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 8% order cancellation rate</li>
              <li>• Peak hours: 12-2 PM, 6-8 PM</li>
              <li>• Consider expanding delivery radius</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderAnalytics;
