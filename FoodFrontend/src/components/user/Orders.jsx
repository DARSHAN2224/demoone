import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Store,
  Phone,
  XCircle,
  Drone
} from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import OrderTrackMap from '../common/OrderTrackMap';
import { api } from '../../stores/api.js';

const Orders = () => {
  const { user } = useAuthStore();
  const { userOrders, isLoading, error, getUserOrders } = useAppStore();
  const [activeTab, setActiveTab] = useState('active');

  // Helper function to safely render values
  const safeRender = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  useEffect(() => {
    console.log('🔄 Orders component: Calling getUserOrders...');
    const loadOrders = async () => {
      try {
        await getUserOrders();
      } catch (error) {
        console.error('Error loading orders:', error);
      }
    };
    loadOrders();
  }, [getUserOrders]);

  const tabs = [
    { id: 'active', name: 'Active Orders', icon: Clock },
    { id: 'completed', name: 'Completed', icon: CheckCircle },
    { id: 'drone', name: 'Drone Orders', icon: Drone },
  ];

  // Simple delivery tracking component
  const DeliveryMap = ({ deliveries, orderId }) => {
    if (!deliveries || deliveries.length === 0) return null;
    const d = deliveries[0];

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
          <Truck className="w-4 h-4 text-primary-500" />
          <span>Delivery Status</span>
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium capitalize">{d.status || 'Pending'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium">{d.eta || 'Calculating...'}</span>
              </div>
          {d.location && (
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{d.location}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderOrderCard = (order) => (
    <div key={order._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      {/* Order Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Order #{order.orderNumber || order._id.slice(-8)}
          </h3>
          <p className="text-sm text-gray-600">
            {(() => {
              // Try multiple ways to get shop name
              if (order.shops && order.shops.length > 0) {
                const shop = order.shops[0];
                // Check if shopId is an object with name property
                if (shop.shopId && typeof shop.shopId === 'object' && shop.shopId.name) {
                  return shop.shopId.name;
                }
                // Check other possible shop name fields
                return shop.shopName || shop.name || 'Shop';
              }
              if (order.shopName) {
                return order.shopName;
              }
              if (order.shop && order.shop.name) {
                return order.shop.name;
              }
              return 'Shop';
            })()}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (() => {
              let status = 'unknown';
              if (typeof order.status === 'object' && order.status?.current) {
                status = order.status.current;
              } else if (typeof order.status === 'string') {
                status = order.status;
              } else if (order.deliveryStatus) {
                status = order.deliveryStatus;
              }
              
              switch (status) {
                case 'pending': return 'bg-yellow-100 text-yellow-800';
                case 'confirmed': return 'bg-primary-100 text-primary-800';
                case 'preparing': return 'bg-orange-100 text-orange-800';
                case 'ready': return 'bg-purple-100 text-purple-800';
                case 'outForDelivery': return 'bg-green-100 text-green-800';
                case 'delivered': return 'bg-green-100 text-green-800';
                default: return 'bg-gray-100 text-gray-800';
              }
            })()
        }`}>
          {(() => {
            let status = 'unknown';
            if (typeof order.status === 'object' && order.status?.current) {
              status = order.status.current;
            } else if (typeof order.status === 'string') {
              status = order.status;
            } else if (order.deliveryStatus) {
              status = order.deliveryStatus;
            }
            return status.charAt(0).toUpperCase() + status.slice(1);
          })()}
        </span>
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Order Details</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-mono">{order._id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className="font-medium">₹{order.totalPrice || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span>{order.totalQuantity || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Type:</span>
              <span className="capitalize">{String(order.deliveryType || 'regular')}</span>
          </div>
        </div>
      </div>

                        <div>
          <h4 className="font-medium text-gray-900 mb-2">Delivery Information</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="capitalize">{String(order.deliveryStatus || 'pending')}</span>
                        </div>
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
            {order.deliveryLocation && (
              <div className="flex justify-between">
                <span>Delivery Address:</span>
                <span className="text-right max-w-32 truncate">{String(order.deliveryLocation.address || 'N/A')}</span>
              </div>
          )}
          </div>
        </div>

        {/* Items List */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Items</h4>
          {(Array.isArray(order.shops) && order.shops.length > 0) ? (
            <div className="space-y-3">
              {order.shops.map((shop, sIdx) => (
                <div key={sIdx} className="border border-gray-200 rounded-md">
                  <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <Store className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">
                        {shop?.shopId?.name || shop?.shopName || 'Shop'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 capitalize">{shop?.status || 'arrived'}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(shop?.products || []).map((p, pIdx) => {
                      const product = (typeof p.productId === 'object' && p.productId) ? p.productId : {};
                      const name = product.name || p.name || `Item ${pIdx+1}`;
                      const image = product.image;
                      const quantity = p.quantity || 1;
                      const price = p.price || product.price || 0;
                      const total = p.totalPrice || (price * quantity);
                      const variantText = p?.variant?.name ? `${p.variant.name}: ${p.variant.value}` : null;
                      return (
                        <div key={pIdx} className="flex items-center p-3">
                          {image ? (
                            <img src={image} alt={name} className="w-10 h-10 rounded object-cover mr-3" />
                          ) : (
                            <div className="w-10 h-10 mr-3 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{name}</div>
                            <div className="text-xs text-gray-500">
                              Qty: {quantity} • ₹{price}{variantText ? ` • ${variantText}` : ''}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">₹{total}</div>
                        </div>
                      );
                    })}
                    {(!shop?.products || shop.products.length === 0) && (
                      <div className="p-3 text-sm text-gray-500">No items available for this shop</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No items to display</div>
          )}
        </div>
      </div>


      {/* Order Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('📞 Contacting shop for order:', order._id);
              // Implement contact shop functionality
            }}
            className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
          >
            <Phone className="w-4 h-4 inline mr-2" />
            Contact Shop
          </button>
          {order.status === 'pending' && (
            <button
              onClick={() => {
                console.log('❌ Cancelling order:', order._id);
                // Implement cancel order functionality
              }}
              className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
            >
              <XCircle className="w-4 h-4 inline mr-2" />
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveOrders = () => {
    console.log('🔍 renderActiveOrders: userOrders:', userOrders);
    console.log('🔍 renderActiveOrders: userOrders type:', typeof userOrders);
    console.log('🔍 renderActiveOrders: userOrders isArray:', Array.isArray(userOrders));
    
    if (!Array.isArray(userOrders)) {
      return (
        <div className="text-center py-12">
          <Clock className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Orders...</h2>
          <p className="text-gray-600">Please wait while we fetch your orders.</p>
        </div>
      );
    }

    const activeOrders = userOrders.filter(order => {
      // Exclude drone orders from active orders (they have their own tab)
      if (order.orderType === 'drone' || order.deliveryType === 'drone') {
        return false;
      }
      
      // Handle nested status object structure
      let status = 'pending';
      if (typeof order.status === 'object' && order.status?.current) {
        status = order.status.current;
      } else if (typeof order.status === 'string') {
        status = order.status;
      } else if (order.deliveryStatus) {
        status = order.deliveryStatus;
      }
      
      const isActive = ['pending', 'confirmed', 'preparing', 'ready', 'outForDelivery'].includes(status);
      console.log('🔍 Order filtering:', {
        orderId: order._id,
        orderType: order.orderType,
        deliveryType: order.deliveryType,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        finalStatus: status,
        isActive
      });
      return isActive;
    });
    
    console.log('🔍 renderActiveOrders: activeOrders:', activeOrders);
    console.log('🔍 renderActiveOrders: activeOrders length:', activeOrders.length);

    if (activeOrders.length === 0) {
    return (
          <div className="text-center py-12">
            <Package className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Orders</h2>
            <p className="text-gray-600">You don't have any active orders at the moment.</p>
          </div>
      );
    }

    return (
      <div className="space-y-6">
        {activeOrders.map(renderOrderCard)}
      </div>
    );
  };

  const renderCompletedOrders = () => {
    if (!Array.isArray(userOrders)) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Orders...</h2>
          <p className="text-gray-600">Please wait while we fetch your orders.</p>
        </div>
      );
    }

    const completedOrders = userOrders.filter(order => {
      // Exclude drone orders from completed orders (they have their own tab)
      if (order.orderType === 'drone' || order.deliveryType === 'drone') {
        return false;
      }
      
      // Handle nested status object structure
      let status = 'pending';
      if (typeof order.status === 'object' && order.status?.current) {
        status = order.status.current;
      } else if (typeof order.status === 'string') {
        status = order.status;
      } else if (order.deliveryStatus) {
        status = order.deliveryStatus;
      }
      
      const isCompleted = ['delivered', 'cancelled'].includes(status);
      console.log('🔍 Completed order filtering:', {
        orderId: order._id,
        orderType: order.orderType,
        deliveryType: order.deliveryType,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        finalStatus: status,
        isCompleted
      });
      return isCompleted;
    });
    
    console.log('🔍 renderCompletedOrders: completedOrders:', completedOrders);
    console.log('🔍 renderCompletedOrders: completedOrders length:', completedOrders.length);

    if (completedOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Completed Orders</h2>
          <p className="text-gray-600">You don't have any completed orders yet.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {completedOrders.map(renderOrderCard)}
      </div>
    );
  };

  const renderDroneOrders = () => {
    if (!Array.isArray(userOrders)) {
      return (
        <div className="text-center py-12">
          <Drone className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Orders...</h2>
          <p className="text-gray-600">Please wait while we fetch your orders.</p>
        </div>
      );
    }

    const droneOrders = userOrders.filter(order => {
      // Check for new orderType field first, then fallback to deliveryType
      const isDrone = order.orderType === 'drone' || order.deliveryType === 'drone';
      console.log('🔍 Drone order filtering:', {
        orderId: order._id,
        orderType: order.orderType,
        deliveryType: order.deliveryType,
        isDrone
      });
      return isDrone;
    });
    
    console.log('🔍 renderDroneOrders: droneOrders:', droneOrders);
    console.log('🔍 renderDroneOrders: droneOrders length:', droneOrders.length);
    
    if (droneOrders.length === 0) {
      return (
        <div className="text-center py-12">
          <Drone className="w-24 h-24 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Drone Orders</h2>
          <p className="text-gray-600">You don't have any drone delivery orders at the moment.</p>
          <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg max-w-md mx-auto">
            <h3 className="font-medium text-primary-900 mb-2">Drone Delivery Features:</h3>
            <ul className="text-sm text-primary-700 space-y-1">
              <li>• Fast delivery service</li>
              <li>• Weather-safe operations</li>
              <li>• Real-time updates</li>
              <li>• Secure delivery</li>
            </ul>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {droneOrders.map(renderOrderCard)}
      </div>
    );
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600 p-8">{error}</div>;

  console.log('🔍 Orders component render: userOrders:', userOrders);
  console.log('🔍 Orders component render: isLoading:', isLoading);
  console.log('🔍 Orders component render: error:', error);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Debug Info */}
      <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <h4 className="font-medium text-primary-900 mb-2">Debug Info:</h4>
        <p className="text-sm text-primary-700">
          userOrders length: {userOrders?.length || 0} | 
          isLoading: {isLoading.toString()} | 
          Error: {error || 'None'}
        </p>
        {userOrders && userOrders.length > 0 && (
          <div className="mt-2 text-xs text-primary-600">
            <p>First order ID: {safeRender(userOrders[0]?._id)}</p>
            <p>First order status: {safeRender(userOrders[0]?.status)}</p>
            <p>First order status.current: {safeRender(userOrders[0]?.status?.current)}</p>
            <p>First order deliveryStatus: {safeRender(userOrders[0]?.deliveryStatus)}</p>
            <p>First order deliveryType: {safeRender(userOrders[0]?.deliveryType)}</p>
            <p>First order totalPrice: {safeRender(userOrders[0]?.totalPrice)}</p>
            <p>First order totalQuantity: {safeRender(userOrders[0]?.totalQuantity)}</p>
            <p>First order shops: {safeRender(userOrders[0]?.shops)}</p>
            <p>First order shopName: {safeRender(userOrders[0]?.shopName)}</p>
            <p>First order shop: {safeRender(userOrders[0]?.shop)}</p>
            <p>First order shops[0].shopId.name: {safeRender(userOrders[0]?.shops?.[0]?.shopId?.name)}</p>
            <details className="mt-2">
              <summary className="cursor-pointer text-primary-800 font-medium">Full Order Data (Click to expand)</summary>
              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(userOrders[0], null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
        <p className="text-gray-600">Track your current orders and view order history</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

      {/* Content */}
        <div className="p-6">
          {activeTab === 'active' && renderActiveOrders()}
          {activeTab === 'completed' && renderCompletedOrders()}
          {activeTab === 'drone' && renderDroneOrders()}
      </div>
    </div>
  );
};

export default Orders;