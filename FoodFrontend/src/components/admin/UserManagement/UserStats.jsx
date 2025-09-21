import React from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  TrendingUp, 
  Calendar,
  MapPin,
  Activity
} from 'lucide-react';

const UserStats = ({ stats }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'verified': return 'bg-blue-100 text-primary-800';
      case 'unverified': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <UserCheck className="w-5 h-5" />;
      case 'inactive': return <UserX className="w-5 h-5" />;
      case 'suspended': return <Shield className="w-5 h-5" />;
      case 'verified': return <Shield className="w-5 h-5" />;
      case 'unverified': return <Users className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getVerificationRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.verified / stats.total) * 100).toFixed(1);
  };

  const getActiveRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.active / stats.total) * 100).toFixed(1);
  };

  const getSuspensionRate = () => {
    if (stats.total === 0) return 0;
    return ((stats.suspended / stats.total) * 100).toFixed(1);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Users */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <Users className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>All platform users</span>
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <UserCheck className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
          <span className="text-green-600">
            {getActiveRate()}% of total users
          </span>
        </div>
      </div>

      {/* Verified Users */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Verified Users</p>
            <p className="text-3xl font-bold text-gray-900">{stats.verified}</p>
          </div>
          <div className="bg-purple-100 p-3 rounded-full">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <span>{getVerificationRate()}% verification rate</span>
        </div>
      </div>

      {/* New Registrations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">This Week</p>
            <p className="text-3xl font-bold text-gray-900">{stats.weeklyRegistered}</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-full">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
          <span className="text-green-600">
            +{stats.todayRegistered} today
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
