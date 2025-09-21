import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import NotificationStats from './NotificationStats';
import NotificationFilters from './NotificationFilters';
import NotificationList from './NotificationList';
import NotificationDetails from './NotificationDetails';
import CreateNotificationModal from './CreateNotificationModal';

const NotificationDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
    read: 0,
    unread: 0,
    todaySent: 0,
    weeklySent: 0
  });

  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    dateRange: 'all',
    searchQuery: '',
    recipientType: 'all'
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [notifications, filters]);

  const loadNotifications = async () => {
    setIsLoading(true);
    
    try {
      // This would call the backend API
      const mockNotifications = generateMockNotifications();
      setNotifications(mockNotifications);
      
      toast.success('Notifications loaded successfully');
    } catch (error) {
      toast.error('Failed to load notifications');
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(notification => notification.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(notification => notification.type === filters.type);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(notification => notification.priority === filters.priority);
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
      
      filtered = filtered.filter(notification => new Date(notification.createdAt) >= startDate);
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(notification => 
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query) ||
        notification.recipients.some(recipient => 
          recipient.name.toLowerCase().includes(query) ||
          recipient.email.toLowerCase().includes(query)
        )
      );
    }

    // Recipient type filter
    if (filters.recipientType !== 'all') {
      filtered = filtered.filter(notification => 
        notification.recipients.some(recipient => recipient.type === filters.recipientType)
      );
    }

    setFilteredNotifications(filtered);
    updateStats(filtered);
  };

  const updateStats = (notificationList) => {
    const newStats = {
      total: notificationList.length,
      sent: notificationList.filter(n => n.status === 'sent').length,
      pending: notificationList.filter(n => n.status === 'pending').length,
      failed: notificationList.filter(n => n.status === 'failed').length,
      read: notificationList.filter(n => n.readCount > 0).length,
      unread: notificationList.filter(n => n.readCount === 0).length,
      todaySent: calculateTodaySent(notificationList),
      weeklySent: calculateWeeklySent(notificationList)
    };
    
    setStats(newStats);
  };

  const calculateTodaySent = (notificationList) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return notificationList
      .filter(notification => new Date(notification.createdAt) >= today && notification.status === 'sent')
      .length;
  };

  const calculateWeeklySent = (notificationList) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return notificationList
      .filter(notification => new Date(notification.createdAt) >= weekAgo && notification.status === 'sent')
      .length;
  };

  const handleNotificationAction = async (notificationId, action, data = {}) => {
    try {
      // This would call the backend API
      const updatedNotifications = notifications.map(notification => {
        if (notification._id === notificationId) {
          return { ...notification, ...data };
        }
        return notification;
      });
      
      setNotifications(updatedNotifications);
      toast.success(`Notification ${action} successfully`);
      
      // Update selected notification if it's the one being modified
      if (selectedNotification && selectedNotification._id === notificationId) {
        setSelectedNotification(updatedNotifications.find(n => n._id === notificationId));
      }
    } catch (error) {
      toast.error(`Failed to ${action} notification`);
      console.error(`Error ${action} notification:`, error);
    }
  };

  const createNotification = async (notificationData) => {
    try {
      // This would call the backend API
      const newNotification = {
        _id: Date.now().toString(),
        ...notificationData,
        status: 'pending',
        createdAt: new Date(),
        readCount: 0,
        totalRecipients: notificationData.recipients.length
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setShowCreateModal(false);
      toast.success('Notification created successfully');
    } catch (error) {
      toast.error('Failed to create notification');
      console.error('Error creating notification:', error);
    }
  };

  const exportNotifications = () => {
    // This would generate and download a CSV/Excel file
    toast.success('Notifications exported successfully');
  };

  const generateMockNotifications = () => {
    return [
      {
        _id: '1',
        title: 'New Order Received',
        message: 'You have received a new order #ORD001 from John Doe',
        type: 'order',
        priority: 'high',
        status: 'sent',
        channel: 'email',
        recipients: [
          { name: 'John Doe', email: 'john@example.com', type: 'customer' }
        ],
        readCount: 1,
        totalRecipients: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        scheduledFor: null,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        template: 'order_confirmation',
        metadata: {
          orderId: 'ORD001',
          orderTotal: 45.99
        }
      },
      {
        _id: '2',
        title: 'Delivery Update',
        message: 'Your order #ORD002 is out for delivery and will arrive within 30 minutes',
        type: 'delivery',
        priority: 'medium',
        status: 'sent',
        channel: 'sms',
        recipients: [
          { name: 'Jane Smith', email: 'jane@example.com', type: 'customer' }
        ],
        readCount: 0,
        totalRecipients: 1,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        scheduledFor: null,
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        template: 'delivery_update',
        metadata: {
          orderId: 'ORD002',
          estimatedDelivery: new Date(Date.now() + 30 * 60 * 1000)
        }
      },
      {
        _id: '3',
        title: 'Promotional Offer',
        message: 'Get 20% off on your next order! Use code SAVE20 at checkout',
        type: 'promotional',
        priority: 'low',
        status: 'pending',
        channel: 'email',
        recipients: [
          { name: 'Alice Johnson', email: 'alice@example.com', type: 'customer' },
          { name: 'Bob Wilson', email: 'bob@example.com', type: 'customer' }
        ],
        readCount: 0,
        totalRecipients: 2,
        createdAt: new Date(),
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        sentAt: null,
        template: 'promotional_offer',
        metadata: {
          offerCode: 'SAVE20',
          discountPercentage: 20,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }
    ];
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600">Manage and track all customer notifications</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Notification</span>
          </button>
          
          <button
            onClick={exportNotifications}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <NotificationStats stats={stats} />

      {/* Filters */}
      <NotificationFilters 
        filters={filters} 
        setFilters={setFilters} 
        onApplyFilters={applyFilters}
      />

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <NotificationList
            notifications={filteredNotifications}
            onNotificationSelect={setSelectedNotification}
            onNotificationAction={handleNotificationAction}
            isLoading={isLoading}
          />
        </div>

        {/* Notification Details */}
        <div className="lg:col-span-1">
          {selectedNotification ? (
            <NotificationDetails
              notification={selectedNotification}
              onNotificationAction={handleNotificationAction}
              onClose={() => setSelectedNotification(null)}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a notification to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      <CreateNotificationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateNotification={createNotification}
      />
    </div>
  );
};

export default NotificationDashboard;
