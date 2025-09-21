import React, { useState } from 'react';
import { Filter, Search, X, Calendar, DollarSign, Truck, CreditCard } from 'lucide-react';

const OrderFilters = ({ filters, setFilters, onApplyFilters }) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      dateRange: 'today',
      searchQuery: '',
      minAmount: '',
      maxAmount: '',
      deliveryType: 'all',
      paymentStatus: 'all'
    });
  };

  const hasActiveFilters = () => {
    return filters.status !== 'all' ||
           filters.dateRange !== 'today' ||
           filters.searchQuery !== '' ||
           filters.minAmount !== '' ||
           filters.maxAmount !== '' ||
           filters.deliveryType !== 'all' ||
           filters.paymentStatus !== 'all';
  };

  const getStatusCount = (status) => {
    // This would come from the parent component's stats
    const mockCounts = {
      pending: 5,
      confirmed: 3,
      preparing: 2,
      ready: 1,
      outForDelivery: 2,
      delivered: 15,
      cancelled: 1
    };
    return mockCounts[status] || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Basic Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search orders by ID, customer name, or phone..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:w-48">
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending ({getStatusCount('pending')})</option>
            <option value="confirmed">Confirmed ({getStatusCount('confirmed')})</option>
            <option value="preparing">Preparing ({getStatusCount('preparing')})</option>
            <option value="ready">Ready ({getStatusCount('ready')})</option>
            <option value="outForDelivery">Out for Delivery ({getStatusCount('outForDelivery')})</option>
            <option value="delivered">Delivered ({getStatusCount('delivered')})</option>
            <option value="cancelled">Cancelled ({getStatusCount('cancelled')})</option>
          </select>
        </div>

        {/* Date Range */}
        <div className="lg:w-48">
          <select
            value={filters.dateRange}
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="lg:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
        >
          <Filter className="w-4 h-4" />
          <span>Advanced</span>
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Amount Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={filters.minAmount}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  placeholder="999.99"
                  value={filters.maxAmount}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Delivery Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Type
              </label>
              <select
                value={filters.deliveryType}
                onChange={(e) => handleFilterChange('deliveryType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="regular">Regular Delivery</option>
                <option value="drone">Drone Delivery</option>
                <option value="pickup">Pickup</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Filter Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-800 flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            {filters.searchQuery && `Search: "${filters.searchQuery}"`}
            {filters.status !== 'all' && ` • Status: ${filters.status}`}
            {filters.dateRange !== 'today' && ` • Date: ${filters.dateRange}`}
            {filters.deliveryType !== 'all' && ` • Delivery: ${filters.deliveryType}`}
            {filters.paymentStatus !== 'all' && ` • Payment: ${filters.paymentStatus}`}
          </span>
          
          <button
            onClick={onApplyFilters}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderFilters;
