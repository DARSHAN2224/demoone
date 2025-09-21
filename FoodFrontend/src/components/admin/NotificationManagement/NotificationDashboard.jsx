import React, { useState, useEffect } from 'react';
import { Bell, Plus, Filter, Search, Send, Archive, Trash2, Eye, Edit, Settings, BarChart3, Users, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../../common/LoadingSpinner';
import NotificationStats from './NotificationStats';

const NotificationDashboard = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Notification categories
  const categories = [
    'system', 'promotional', 'order', 'delivery', 'payment', 'security', 'maintenance', 'update'
  ];

  // Priority levels
  const priorities = ['low', 'normal', 'high', 'urgent'];

  // Status options
  const statuses = ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'];

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with actual API call
      const mockNotifications = [
        {
          _id: '1',
          title: 'System Maintenance',
          message: 'Scheduled maintenance on January 15th from 2-4 AM',
          category: 'maintenance',
          priority: 'high',
          status: 'scheduled',
          scheduledFor: '2024-01-15T02:00:00Z',
          targetUsers: ['all'],
          sentVia: ['email', 'push'],
          readCount: 0,
          totalCount: 1500,
          createdAt: '2024-01-10T10:00:00Z',
          createdBy: 'admin@foodapp.com'
        },
        {
          _id: '2',
          title: 'New Feature Available',
          message: 'Drone delivery is now available in your area!',
          category: 'update',
          priority: 'normal',
          status: 'sent',
          scheduledFor: null,
          targetUsers: ['users'],
          sentVia: ['email', 'push', 'sms'],
          readCount: 450,
          totalCount: 1200,
          createdAt: '2024-01-09T15:30:00Z',
          createdBy: 'admin@foodapp.com'
        },
        {
          _id: '3',
          title: 'Security Alert',
          message: 'Please update your password for security',
          category: 'security',
          priority: 'urgent',
          status: 'sending',
          scheduledFor: null,
          targetUsers: ['users', 'sellers'],
          sentVia: ['email'],
          readCount: 200,
          totalCount: 800,
          createdAt: '2024-01-08T09:15:00Z',
          createdBy: 'admin@foodapp.com'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotification = async (notificationData) => {
    try {
      // Create notification logic
      const newNotification = {
        _id: Date.now().toString(),
        ...notificationData,
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: 'admin@foodapp.com',
        readCount: 0,
        totalCount: 0
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      setShowCreateModal(false);
      toast.success('Notification created successfully!');
    } catch (error) {
      toast.error('Failed to create notification');
    }
  };

  const handleBulkAction = async () => {
    if (selectedNotifications.length === 0) {
      toast.error('Please select notifications for bulk action');
      return;
    }

    try {
      switch (bulkAction) {
        case 'send':
          // Send selected notifications
          toast.success(`${selectedNotifications.length} notifications sent successfully!`);
          break;
        case 'archive':
          // Archive selected notifications
          setNotifications(prev => 
            prev.filter(n => !selectedNotifications.includes(n._id))
          );
          toast.success(`${selectedNotifications.length} notifications archived!`);
          break;
        case 'delete':
          // Delete selected notifications
          setNotifications(prev => 
            prev.filter(n => !selectedNotifications.includes(n._id))
          );
          toast.success(`${selectedNotifications.length} notifications deleted!`);
          break;
        default:
          break;
      }
      
      setSelectedNotifications([]);
      setBulkAction('');
    } catch (error) {
      toast.error('Bulk action failed');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notification.message.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== 'all' && notification.category !== selectedCategory) {
      return false;
    }
    if (selectedPriority !== 'all' && notification.priority !== selectedPriority) {
      return false;
    }
    if (selectedStatus !== 'all' && notification.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Notifications</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={loadNotifications}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="h-8 w-8 text-primary-600" />
                Notification Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage system notifications, promotional messages, and user communications
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </button>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Edit className="h-4 w-4" />
                Templates
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Create Notification
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Section */}
        <NotificationStats notifications={notifications} />

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              
              {showFilters && (
                <div className="flex items-center gap-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Priorities</option>
                    {priorities.map(priority => (
                      <option key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    {statuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Bulk Actions */}
              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Bulk Actions...</option>
                    <option value="send">Send</option>
                    <option value="archive">Archive</option>
                    <option value="delete">Delete</option>
                  </select>
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Notifications ({filteredNotifications.length})
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className={`p-6 hover:bg-gray-50 ${
                  selectedNotifications.includes(notification._id) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedNotifications(prev => [...prev, notification._id]);
                        } else {
                          setSelectedNotifications(prev => prev.filter(id => id !== notification._id));
                        }
                      }}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        
                        {/* Priority Badge */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          notification.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          notification.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          notification.priority === 'normal' ? 'bg-blue-100 text-primary-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.priority}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                          notification.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                          notification.status === 'scheduled' ? 'bg-blue-100 text-primary-800' :
                          notification.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {notification.status}
                        </span>
                        
                        {/* Category Badge */}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {notification.category}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{notification.message}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>Target: {notification.targetUsers.join(', ')}</span>
                        <span>Channels: {notification.sentVia.join(', ')}</span>
                        {notification.scheduledFor && (
                          <span>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</span>
                        )}
                        <span>Created: {new Date(notification.createdAt).toLocaleString()}</span>
                        <span>Read: {notification.readCount}/{notification.totalCount}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // View notification details
                        console.log('View notification:', notification);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        // Edit notification
                        console.log('Edit notification:', notification);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        // Archive notification
                        setNotifications(prev => 
                          prev.filter(n => n._id !== notification._id)
                        );
                        toast.success('Notification archived!');
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        // Delete notification
                        if (window.confirm('Are you sure you want to delete this notification?')) {
                          setNotifications(prev => 
                            prev.filter(n => n._id !== notification._id)
                          );
                          toast.success('Notification deleted!');
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedStatus !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Create your first notification to get started'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Notification</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                handleCreateNotification({
                  title: formData.get('title'),
                  message: formData.get('message'),
                  category: formData.get('category'),
                  priority: formData.get('priority'),
                  targetUsers: [formData.get('targetUsers')],
                  sentVia: [formData.get('sentVia')],
                  scheduledFor: formData.get('scheduledFor') || null
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <textarea
                      name="message"
                      required
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <select
                        name="category"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        name="priority"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {priorities.map(priority => (
                          <option key={priority} value={priority}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Users</label>
                      <select
                        name="targetUsers"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Users</option>
                        <option value="users">Regular Users</option>
                        <option value="sellers">Sellers</option>
                        <option value="admins">Admins</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Send Via</label>
                      <select
                        name="sentVia"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="email">Email</option>
                        <option value="push">Push Notification</option>
                        <option value="sms">SMS</option>
                        <option value="in-app">In-App</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schedule (Optional)</label>
                    <input
                      type="datetime-local"
                      name="scheduledFor"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDashboard;
