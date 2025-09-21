import React from 'react';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Users,
  Send
} from 'lucide-react';

const NotificationStats = ({ stats }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'read': return 'bg-blue-100 text-primary-800';
      case 'unread': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'failed': return <AlertCircle className="w-5 h-5" />;
      case 'read': return <Mail className="w-5 h-5" />;
      case 'unread': return <Bell className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getDeliveryRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.sent / stats.total) * 100).toFixed(1);
  };

  const getReadRate = () => {
    if (stats.sent === 0) return 0;
    return ((stats.read / stats.sent) * 100).toFixed(1);
  };

  const getFailureRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.failed / stats.total) * 100).toFixed(1);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Notifications</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <Bell className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>All time notifications</span>
        </div>
      </div>

      {/* Sent Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Sent Today</p>
            <p className="text-3xl font-bold text-gray-900">{stats.todaySent}</p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <Send className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
          <span className="text-green-600">
            {getDeliveryRate()}% delivery rate
          </span>
        </div>
      </div>

      {/* Read Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Read Rate</p>
            <p className="text-3xl font-bold text-gray-900">{getReadRate()}%</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-full">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>{stats.read} of {stats.sent} read</span>
        </div>
      </div>

      {/* Weekly Sent */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">This Week</p>
            <p className="text-3xl font-bold text-gray-900">{stats.weeklySent}</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-full">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
          <span className="text-green-600">
            +15% from last week
          </span>
        </div>
      </div>
    </div>
  );
};

export default NotificationStats;
