import React, { useState } from 'react';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Package, 
  Truck, 
  Zap,
  Edit,
  MessageSquare,
  Printer,
  Share2
} from 'lucide-react';

const OrderDetails = ({ order, onOrderAction, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(order.deliveryInstructions || '');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  const getStatusActions = (order) => {
    switch (order.status) {
      case 'pending':
        return [
          { label: 'Confirm Order', action: 'confirmed', color: 'bg-primary-600 hover:bg-primary-700' },
          { label: 'Cancel Order', action: 'cancelled', color: 'bg-red-600 hover:bg-red-700' }
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

  const handleSaveNotes = () => {
    // This would call the backend API to update delivery instructions
    onOrderAction(order._id, order.status, { deliveryInstructions: editedNotes });
    setIsEditing(false);
  };

  const handleCallCustomer = () => {
    window.open(`tel:${order.customerPhone}`, '_self');
  };

  const handleEmailCustomer = () => {
    window.open(`mailto:${order.customerEmail}`, '_self');
  };

  const handlePrintOrder = () => {
    window.print();
  };

  const handleShareOrder = () => {
    // This would implement sharing functionality
    navigator.share?.({
      title: `Order ${order.orderId}`,
      text: `Order details for ${order.customerName}`,
      url: window.location.href
    }).catch(() => {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Order ID and Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-lg text-gray-600">
            #{order.orderId}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        <div className="text-sm text-gray-600">
          <div className="flex items-center space-x-2 mb-1">
            <Calendar className="w-4 h-4" />
            <span>Ordered: {formatDate(order.createdAt)}</span>
          </div>
          {order.estimatedDelivery && (
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Estimated Delivery: {formatDate(order.estimatedDelivery)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Customer Information</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-600 font-medium text-sm">
                {order.customerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{order.customerName}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <button
                  onClick={handleCallCustomer}
                  className="flex items-center space-x-1 hover:text-primary-600"
                >
                  <Phone className="w-4 h-4" />
                  <span>{order.customerPhone}</span>
                </button>
                <button
                  onClick={handleEmailCustomer}
                  className="flex items-center space-x-1 hover:text-primary-600"
                >
                  <Mail className="w-4 h-4" />
                  <span>{order.customerEmail}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Information */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Delivery Information</h3>
        <div className="space-y-3">
          {order.deliveryType === 'drone' ? (
            <>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-primary-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Pickup Location</p>
                  <p className="text-sm text-gray-600">{order.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Truck className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Delivery Location</p>
                  <p className="text-sm text-gray-600">{order.deliveryLocation}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-600 font-medium">Drone Delivery</span>
              </div>
            </>
          ) : (
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">Delivery Address</p>
                <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
              </div>
            </div>
          )}
          
          {order.deliveryInstructions && (
            <div className="flex items-start space-x-2">
              <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Delivery Instructions</p>
                {isEditing ? (
                  <div className="mt-2">
                    <textarea
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                      rows="3"
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditedNotes(order.deliveryInstructions || '');
                        }}
                        className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{order.deliveryInstructions}</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-primary-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(item.price)}</p>
                <p className="text-sm text-gray-600">Total: {formatCurrency(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatCurrency(order.total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Delivery Fee:</span>
            <span className="font-medium">
              {order.deliveryType === 'drone' ? formatCurrency(50) : formatCurrency(0)}
            </span>
          </div>
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="text-lg">
                {formatCurrency(order.total + (order.deliveryType === 'drone' ? 50 : 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {getStatusActions(order).map((action) => (
          <button
            key={action.action}
            onClick={() => onOrderAction(order._id, action.action)}
            className={`w-full py-2 px-4 text-white rounded-lg transition-colors ${action.color}`}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Utility Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={handlePrintOrder}
            className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            onClick={handleShareOrder}
            className="flex-1 py-2 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
