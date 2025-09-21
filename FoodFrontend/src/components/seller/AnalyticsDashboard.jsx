import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar, Download } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

const AnalyticsDashboard = () => {
    const { accessToken } = useAuthStore();
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState('30d');
    const [selectedShop, setSelectedShop] = useState('all');

    // Fetch analytics data
    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/v1/analytics/seller/sales?period=${period}&shopId=${selectedShop}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch analytics');

            const data = await response.json();
            setAnalytics(data.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    // Export analytics data
    const exportAnalytics = async () => {
        try {
            const response = await fetch(`/api/v1/analytics/seller/export?period=${period}&shopId=${selectedShop}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to export analytics');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Analytics exported successfully');
        } catch (error) {
            console.error('Error exporting analytics:', error);
            toast.error('Failed to export analytics');
        }
    };

    // Load analytics on mount and when period/shop changes
    useEffect(() => {
        fetchAnalytics();
    }, [period, selectedShop]);

    if (loading && !analytics) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600">Track your business performance and insights</p>
                </div>
                
                <div className="flex items-center space-x-4">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="1y">Last year</option>
                    </select>

                    <button
                        onClick={exportAnalytics}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                        <Download className="w-5 h-5" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            {analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="Total Revenue"
                        value={`$${analytics.summary?.totalRevenue?.toFixed(2) || '0.00'}`}
                        change={analytics.summary?.revenueChange || 0}
                        icon={DollarSign}
                        color="green"
                    />
                    
                    <MetricCard
                        title="Total Orders"
                        value={analytics.summary?.totalOrders || 0}
                        change={analytics.summary?.ordersChange || 0}
                        icon={ShoppingCart}
                        color="blue"
                    />
                    
                    <MetricCard
                        title="Total Customers"
                        value={analytics.summary?.totalCustomers || 0}
                        change={analytics.summary?.customersChange || 0}
                        icon={Users}
                        color="purple"
                    />
                    
                    <MetricCard
                        title="Total Products"
                        value={analytics.summary?.totalProducts || 0}
                        change={analytics.summary?.productsChange || 0}
                        icon={Package}
                        color="orange"
                    />
                </div>
            )}

            {/* Charts Section */}
            {analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Revenue Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Chart visualization would go here</p>
                                <p className="text-sm">Using a charting library like Chart.js or Recharts</p>
                            </div>
                        </div>
                    </div>

                    {/* Orders Chart */}
                    <div className="bg-white rounded-lg p-6 shadow-sm border">
                        <h3 className="text-lg font-semibold mb-4">Orders Trend</h3>
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>Chart visualization would go here</p>
                                <p className="text-sm">Using a charting library like Chart.js or Recharts</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Detailed Analytics */}
            {analytics && (
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold">Detailed Analytics</h3>
                    </div>
                    
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Top Products */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Top Products</h4>
                                <div className="space-y-2">
                                    {analytics.topProducts?.slice(0, 5).map((product, index) => (
                                        <div key={product._id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">{index + 1}. {product.name}</span>
                                            <span className="font-medium">${product.revenue?.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Categories */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Top Categories</h4>
                                <div className="space-y-2">
                                    {analytics.topCategories?.slice(0, 5).map((category, index) => (
                                        <div key={category._id} className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">{index + 1}. {category.name}</span>
                                            <span className="font-medium">{category.orders} orders</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer Insights */}
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Customer Insights</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">New Customers:</span>
                                        <span className="font-medium">{analytics.customerInsights?.newCustomers || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Repeat Customers:</span>
                                        <span className="font-medium">{analytics.customerInsights?.repeatCustomers || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Avg Order Value:</span>
                                        <span className="font-medium">${analytics.customerInsights?.averageOrderValue?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No Data State */}
            {!loading && !analytics && (
                <div className="bg-white rounded-lg p-12 text-center">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
                    <p className="text-gray-600">Start making sales to see your analytics data here.</p>
                </div>
            )}
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ title, value, change, icon: Icon, color }) => {
    const getColorClasses = (color) => {
        switch (color) {
            case 'green':
                return 'text-green-600 bg-green-100';
            case 'blue':
                return 'text-primary-600 bg-blue-100';
            case 'purple':
                return 'text-purple-600 bg-purple-100';
            case 'orange':
                return 'text-orange-600 bg-orange-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${getColorClasses(color)}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            
            {change !== undefined && (
                <div className="mt-4 flex items-center">
                    {change >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                    </span>
                    <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
