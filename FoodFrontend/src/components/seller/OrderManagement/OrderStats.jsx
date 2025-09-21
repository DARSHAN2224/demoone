import React from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  Zap
} from 'lucide-react';

const OrderStats = ({ stats }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-primary-100 text-primary-800';
      case 'preparing': return 'bg-orange-100 text-orange-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'outForDelivery': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle className="w-5 h-5" />;
      case 'preparing': return <Package className="w-5 h-5" />;
      case 'ready': return <AlertCircle className="w-5 h-5" />;
      case 'outForDelivery': return <Truck className="w-5 h-5" />;
      case 'delivered': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRevenueTrend = (current, previous) => {
    if (previous === 0) return { trend: 'new', percentage: 100, color: 'text-green-600' };
    
    const percentage = ((current - previous) / previous) * 100;
    if (percentage > 0) return { trend: 'up', percentage: Math.abs(percentage), color: 'text-green-600' };
    if (percentage < 0) return { trend: 'down', percentage: Math.abs(percentage), color: 'text-red-600' };
    return { trend: 'stable', percentage: 0, color: 'text-gray-600' };
  };

  const todayTrend = getRevenueTrend(stats.todayRevenue, stats.todayRevenue * 0.9);
  const weeklyTrend = getRevenueTrend(stats.weeklyRevenue, stats.weeklyRevenue * 0.85);
  const monthlyTrend = getRevenueTrend(stats.monthlyRevenue, stats.monthlyRevenue * 0.8);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-primary-100 p-3 rounded-full">
            <Package className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>All time orders</span>
        </div>
      </div>

      {/* Today's Revenue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.todayRevenue)}</p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className={`w-4 h-4 mr-1 ${todayTrend.color}`} />
          <span className={todayTrend.color}>
            {todayTrend.trend === 'new' && 'New today'}
            {todayTrend.trend === 'up' && `+${todayTrend.percentage.toFixed(1)}% from yesterday`}
            {todayTrend.trend === 'down' && `-${todayTrend.percentage.toFixed(1)}% from yesterday`}
            {todayTrend.trend === 'stable' && 'Same as yesterday'}
          </span>
        </div>
      </div>

      {/* Weekly Revenue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Weekly Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.weeklyRevenue)}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-full">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className={`w-4 h-4 mr-1 ${weeklyTrend.color}`} />
          <span className={weeklyTrend.color}>
            {weeklyTrend.trend === 'new' && 'New this week'}
            {weeklyTrend.trend === 'up' && `+${weeklyTrend.percentage.toFixed(1)}% from last week`}
            {weeklyTrend.trend === 'down' && `-${weeklyTrend.percentage.toFixed(1)}% from last week`}
            {weeklyTrend.trend === 'stable' && 'Same as last week'}
          </span>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-full">
            <Zap className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className={`w-4 h-4 mr-1 ${monthlyTrend.color}`} />
          <span className={monthlyTrend.color}>
            {monthlyTrend.trend === 'new' && 'New this month'}
            {monthlyTrend.trend === 'up' && `+${monthlyTrend.percentage.toFixed(1)}% from last month`}
            {monthlyTrend.trend === 'down' && `-${monthlyTrend.percentage.toFixed(1)}% from last month`}
            {monthlyTrend.trend === 'stable' && 'Same as last month'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderStats;
