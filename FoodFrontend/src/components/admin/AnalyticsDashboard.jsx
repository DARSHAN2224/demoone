import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, Truck, Activity } from 'lucide-react';

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/analytics/admin?timeRange=${timeRange}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-red-500">Failed to load analytics</div>
      </div>
    );
  }

  const { userStats, shopStats, orderStats, revenueStats, productStats, droneStats } = analytics;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={userStats.totalUsers}
              change={userStats.newUsers}
              changeType="positive"
              icon={Users}
              color="blue"
            />
            <MetricCard
              title="Total Orders"
              value={orderStats.totalOrders}
              change={orderStats.newOrders}
              changeType="positive"
              icon={ShoppingCart}
              color="green"
            />
            <MetricCard
              title="Total Revenue"
              value={`$${revenueStats.totalRevenue.toLocaleString()}`}
              change={`$${revenueStats.averageOrderValue.toFixed(2)} avg`}
              changeType="neutral"
              icon={DollarSign}
              color="purple"
            />
            <MetricCard
              title="Active Shops"
              value={shopStats.activeShops}
              change={shopStats.newShops}
              changeType="positive"
              icon={Package}
              color="orange"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart placeholder - User growth over time
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart placeholder - Order volume over time
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Product Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Products:</span>
                    <span className="font-medium">{productStats.totalProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New Products:</span>
                    <span className="font-medium">{productStats.newProducts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Approved:</span>
                    <span className="font-medium">{productStats.approvedProducts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Drone Fleet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Drones:</span>
                    <span className="font-medium">{droneStats.totalDrones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active:</span>
                    <span className="font-medium">{droneStats.activeDrones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Available:</span>
                    <span className="font-medium">{droneStats.availableDrones}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Shop Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Shops:</span>
                    <span className="font-medium">{shopStats.totalShops}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New Shops:</span>
                    <span className="font-medium">{shopStats.newShops}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active:</span>
                    <span className="font-medium">{shopStats.activeShops}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{userStats.totalUsers}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{userStats.newUsers}</div>
                  <div className="text-sm text-gray-600">New Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{userStats.verifiedUsers}</div>
                  <div className="text-sm text-gray-600">Verified Users</div>
                </div>
              </div>
              
              <div className="mt-6 h-64 flex items-center justify-center text-gray-500">
                Chart placeholder - User demographics and behavior
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{orderStats.totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{orderStats.newOrders}</div>
                  <div className="text-sm text-gray-600">New Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{orderStats.completedOrders}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
              
              <div className="mt-6 h-64 flex items-center justify-center text-gray-500">
                Chart placeholder - Order status distribution and trends
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    ${revenueStats.totalRevenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Revenue</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">
                    ${revenueStats.averageOrderValue.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Average Order Value</div>
                </div>
              </div>
              
              <div className="mt-6 h-64 flex items-center justify-center text-gray-500">
                Chart placeholder - Revenue trends and breakdown
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MetricCard = ({ title, value, change, changeType, icon: Icon, color }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-primary-50 text-primary-600 border-primary-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  const getChangeIcon = (changeType) => {
    if (changeType === 'positive') return <TrendingUp className="w-4 h-4" />;
    if (changeType === 'negative') return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getChangeColor = (changeType) => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full border ${getColorClasses(color)}`}>
          <Icon className="w-4 h-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`flex items-center text-xs ${getChangeColor(changeType)}`}>
          {getChangeIcon(changeType)}
          <span className="ml-1">{change}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDashboard;
