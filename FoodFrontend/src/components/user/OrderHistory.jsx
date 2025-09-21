import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

const OrderHistory = () => {
  const { getOrderHistory, orderHistory, isLoading, error } = useAppStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    console.log('🔄 OrderHistory component: Calling getOrderHistory...');
    getOrderHistory();
  }, [getOrderHistory]);

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'completed':
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter orders based on selected filter
  const filteredOrders = Array.isArray(orderHistory) ? orderHistory.filter(order => {
    if (filter === 'all') return true;
    const status = order.status || order.deliveryStatus || 'pending';
    return status.toLowerCase() === filter.toLowerCase();
  }) : [];

  console.log('🔍 OrderHistory component: orderHistory changed:', orderHistory);
  console.log('🔍 OrderHistory component: filteredOrders:', filteredOrders);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Debug Info */}
          <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <h4 className="font-medium text-primary-900 mb-2">Debug Info:</h4>
            <p className="text-sm text-primary-700">
              orderHistory length: {orderHistory?.length || 0} | 
              filteredOrders length: {filteredOrders?.length || 0} | 
              isLoading: {isLoading.toString()} | 
              Error: {error || 'None'}
            </p>
            <p className="text-xs text-primary-600 mt-2">
              <strong>Note:</strong> This page shows only OrderHistory model data (completed/archived orders)
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? "You haven't completed any orders yet. Complete some orders to see them here." 
                  : `No ${filter} orders found.`
                }
              </p>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto">
                <p className="text-sm text-yellow-700">
                  <strong>Tip:</strong> Order History shows completed, delivered, or cancelled orders. 
                  Active orders are shown in the "My Orders" page.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status || order.deliveryStatus)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Order #{order.orderNumber || order._id.slice(-8)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status || order.deliveryStatus)}`}>
                      {order.status || order.deliveryStatus || 'pending'}
                    </span>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3">
                    {/* Shop Information */}
                    {order.shops && order.shops.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Shop Details:</h4>
                        {order.shops.map((shop, shopIndex) => (
                          <div key={shopIndex} className="mb-2 last:mb-0">
                            <p className="text-sm text-gray-600">
                              <strong>Shop:</strong> {shop.shopName || 'Unknown Shop'}
                              {shop.status && (
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusColor(shop.status)}`}>
                                  {shop.status}
                                </span>
                              )}
                            </p>
                            
                            {/* Products in this shop */}
                            {shop.products && shop.products.length > 0 && (
                              <div className="ml-4 mt-1 space-y-1">
                                {shop.products.map((product, productIndex) => (
                                  <div key={productIndex} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">
                                      Product: {product.productName || 'Unknown Product'} (Qty: {product.quantity})
                                    </span>
                                    <span className="text-gray-600">₹{product.price}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Order Summary */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <div className="text-sm text-gray-600">
                        <span>Total Items: {order.totalQuantity || 0}</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        ₹{order.totalPrice || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;