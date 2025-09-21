import React, { useState } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  AlertCircle,
  Eye,
  Phone,
  Mail,
  MapPin,
  Zap,
  Calendar,
  DollarSign
} from 'lucide-react';
import LoadingSpinner from '../../common/LoadingSpinner';

const OrderList = ({ orders, onOrderSelect, onOrderAction, isLoading }) => {
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
        <p className="text-gray-600">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed': return 'bg-primary-100 text-primary-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'outForDelivery': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <Package className="w-4 h-4" />;
      case 'ready': return <AlertCircle className="w-4 h-4" />;
      case 'outForDelivery': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getStatusActions = (order) => {
    switch (order.status) {
      case 'pending':
        return [
          { label: 'Confirm', action: 'confirmed', color: 'bg-primary-600 hover:bg-primary-700' },
          { label: 'Cancel', action: 'cancelled', color: 'bg-red-600 hover:bg-red-700' }
        ];
      case 'confirmed':
        return [
          { label: 'Start Preparing', action: 'preparing', color: 'bg-orange-600 hover:bg-orange-700' }
        ];
      case 'preparing':
        return [
          { label: 'Mark Ready', action: 'ready', color: 'bg-purple-600 hover:bg-purple-700' }
        ];
      case 'ready':
        return [
          { label: 'Start Delivery', action: 'outForDelivery', color: 'bg-indigo-600 hover:bg-indigo-700' }
        ];
      case 'outForDelivery':
        return [
          { label: 'Mark Delivered', action: 'delivered', color: 'bg-green-600 hover:bg-green-700' }
        ];
      default:
        return [];
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffInMinutes = Math.floor((now - orderDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'total':
        aValue = a.total;
        bValue = b.total;
        break;
      case 'customerName':
        aValue = a.customerName.toLowerCase();
        bValue = b.customerName.toLowerCase();
        break;
      default:
        aValue = a[sortBy];
        bValue = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Orders ({orders.length})
          </h2>
          
          {/* Sort Options */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-600">Sort by:</span>
            <button
              onClick={() => handleSort('createdAt')}
              className={`px-2 py-1 rounded ${
                sortBy === 'createdAt' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => handleSort('total')}
              className={`px-2 py-1 rounded ${
                sortBy === 'total' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Amount
            </button>
            <button
              onClick={() => handleSort('customerName')}
              className={`px-2 py-1 rounded ${
                sortBy === 'customerName' 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Customer
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="divide-y divide-gray-200">
        {sortedOrders.map((order) => (
          <div
            key={order._id}
            className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onOrderSelect(order)}
          >
            <div className="flex items-start justify-between">
              {/* Order Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <span className="font-mono text-sm text-gray-500">
                    #{order.orderId}
                  </span>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="ml-1 capitalize">{order.status}</span>
                  </span>
                  
                  {order.deliveryType === 'drone' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-blue-200">
                      <Zap className="w-3 h-3 mr-1" />
                      Drone
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      {order.customerName}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{order.customerPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{order.customerEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate max-w-32">
                          {order.deliveryAddress || order.deliveryLocation}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="mt-3">
                  <div className="text-sm text-gray-600">
                    {order.items.slice(0, 2).map((item, index) => (
                      <span key={index}>
                        {item.quantity}x {item.name}
                        {index < Math.min(2, order.items.length - 1) && ', '}
                      </span>
                    ))}
                    {order.items.length > 2 && (
                      <span className="text-gray-500">
                        ... and {order.items.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="ml-6 flex flex-col items-end space-y-2">
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(order.createdAt)}
                </span>
                
                <div className="flex flex-col space-y-2">
                  {getStatusActions(order).map((action) => (
                    <button
                      key={action.action}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOrderAction(order._id, action.action);
                      }}
                      className={`px-3 py-1 text-xs text-white rounded-md transition-colors ${action.color}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderList;
