import React from 'react';
import { Bell, Send, CheckCircle, Clock, AlertTriangle, Users, BarChart3, TrendingUp } from 'lucide-react';

const NotificationStats = ({ notifications }) => {
  // Calculate statistics from notifications
  const totalNotifications = notifications.length;
  const sentNotifications = notifications.filter(n => n.status === 'sent').length;
  const scheduledNotifications = notifications.filter(n => n.status === 'scheduled').length;
  const draftNotifications = notifications.filter(n => n.status === 'draft').length;
  const failedNotifications = notifications.filter(n => n.status === 'failed').length;
  
  const urgentNotifications = notifications.filter(n => n.priority === 'urgent').length;
  const highPriorityNotifications = notifications.filter(n => n.priority === 'high').length;
  
  const totalRecipients = notifications.reduce((sum, n) => sum + n.totalCount, 0);
  const totalReads = notifications.reduce((sum, n) => sum + n.readCount, 0);
  const readRate = totalRecipients > 0 ? ((totalReads / totalRecipients) * 100).toFixed(1) : 0;
  
  const systemNotifications = notifications.filter(n => n.category === 'system').length;
  const promotionalNotifications = notifications.filter(n => n.category === 'promotional').length;
  const orderNotifications = notifications.filter(n => n.category === 'order').length;
  const securityNotifications = notifications.filter(n => n.category === 'security').length;

  const stats = [
    {
      title: 'Total Notifications',
      value: totalNotifications,
      icon: Bell,
      color: 'bg-blue-500',
      textColor: 'text-primary-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Sent Successfully',
      value: sentNotifications,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Scheduled',
      value: scheduledNotifications,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Draft',
      value: draftNotifications,
      icon: Send,
      color: 'bg-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      title: 'Failed',
      value: failedNotifications,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Urgent Priority',
      value: urgentNotifications,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  const categoryStats = [
    { name: 'System', count: systemNotifications, color: 'bg-blue-500' },
    { name: 'Promotional', count: promotionalNotifications, color: 'bg-purple-500' },
    { name: 'Order', count: orderNotifications, color: 'bg-green-500' },
    { name: 'Security', count: securityNotifications, color: 'bg-red-500' }
  ];

  const performanceMetrics = [
    {
      label: 'Total Recipients',
      value: totalRecipients.toLocaleString(),
      icon: Users,
      color: 'text-primary-600'
    },
    {
      label: 'Total Reads',
      value: totalReads.toLocaleString(),
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      label: 'Read Rate',
      value: `${readRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      label: 'High Priority',
      value: highPriorityNotifications,
      icon: AlertTriangle,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {performanceMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
                <div className={`${metric.color} p-2 rounded-full bg-gray-50`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            Category Distribution
          </h3>
          <div className="space-y-3">
            {categoryStats.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{category.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    notification.status === 'sent' ? 'bg-green-100 text-green-800' :
                    notification.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                    notification.status === 'scheduled' ? 'bg-blue-100 text-primary-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {notification.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Send className="h-4 w-4" />
            Send Bulk Notification
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Clock className="h-4 w-4" />
            Schedule Notification
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <BarChart3 className="h-4 w-4" />
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationStats;
