import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Check, Trash2, Filter, X, RefreshCw, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationCenter = ({ isOpen, onClose, userId, userRole = 'user' }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [isOpen, activeTab, filterType]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const endpoint = userRole === 'seller' ? 'shop' : 'user';
      const response = await fetch(`/api/v1/notifications/${endpoint}?type=${filterType}`);
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const endpoint = userRole === 'seller' ? 'shop' : 'user';
      const response = await fetch(`/api/v1/notifications/${endpoint}/count`);
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, read: true, readAt: new Date() }
              : notif
          )
        );
        fetchUnreadCount();
        toast.success('Notification marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const endpoint = userRole === 'seller' ? 'shop' : 'user';
      const response = await fetch(`/api/v1/notifications/${endpoint}/mark-all-read`, {
        method: 'PATCH'
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true, readAt: new Date() }))
        );
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark all notifications as read');
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`/api/v1/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
        toast.success('Notification deleted');
      }
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      order_status: '🛍️',
      delivery_update: '🚚',
      drone_delivery: '🚁',
      payment_update: '💳',
      promotional: '🎉',
      order_update: '📋',
      system: '🔔'
    };
    return icons[type] || '📢';
  };

  const getNotificationColor = (type) => {
    const colors = {
      order_status: 'bg-blue-100 text-primary-800',
      delivery_update: 'bg-green-100 text-green-800',
      drone_delivery: 'bg-purple-100 text-purple-800',
      payment_update: 'bg-yellow-100 text-yellow-800',
      promotional: 'bg-pink-100 text-pink-800',
      order_update: 'bg-orange-100 text-orange-800',
      system: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'read') return notification.read;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold">Notifications</h2>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <Check className="w-4 h-4 mr-1" />
              Mark All Read
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotifications}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm text-gray-600">Filter by type:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="order_status">Order Status</SelectItem>
                <SelectItem value="delivery_update">Delivery Updates</SelectItem>
                <SelectItem value="drone_delivery">Drone Delivery</SelectItem>
                <SelectItem value="payment_update">Payment Updates</SelectItem>
                <SelectItem value="promotional">Promotional</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      getNotificationIcon={getNotificationIcon}
                      getNotificationColor={getNotificationColor}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  getNotificationIcon, 
  getNotificationColor, 
  formatTimestamp 
}) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <Card className={`transition-all duration-200 ${!notification.read ? 'border-blue-200 bg-blue-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">
            {getNotificationIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {notification.title}
                  </h4>
                  <Badge className={`text-xs ${getNotificationColor(notification.type)}`}>
                    {notification.type.replace('_', ' ')}
                  </Badge>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {notification.message}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(notification.createdAt)}
                  </span>
                  
                  <div className="flex items-center space-x-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkAsRead(notification._id)}
                        className="h-6 px-2 text-xs"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark Read
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(notification._id)}
                      className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {notification.data && Object.keys(notification.data).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Additional Data:</div>
            <div className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify(notification.data, null, 2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationCenter;
