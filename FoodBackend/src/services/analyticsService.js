import { Order } from '../models/ordersModel.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { User } from '../models/userModel.js';
import { Drone } from '../models/droneModel.js';
import { ApiError } from '../utils/ApiError.js';

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
  }

  // Get dashboard analytics for admin
  async getAdminDashboardAnalytics(timeRange = '30d') {
    try {
      const cacheKey = `admin_dashboard_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const [
        userStats,
        shopStats,
        orderStats,
        revenueStats,
        productStats,
        droneStats
      ] = await Promise.all([
        this.getUserStatistics(startDate),
        this.getShopStatistics(startDate),
        this.getOrderStatistics(startDate),
        this.getRevenueStatistics(startDate),
        this.getProductStatistics(startDate),
        this.getDroneStatistics(startDate)
      ]);

      const analytics = {
        timeRange,
        userStats,
        shopStats,
        orderStats,
        revenueStats,
        productStats,
        droneStats,
        generatedAt: new Date()
      };

      // Add to cache
      this.addToCache(cacheKey, analytics);
      
      return analytics;
    } catch (error) {
      throw error;
    }
  }

  // Get seller dashboard analytics
  async getSellerDashboardAnalytics(sellerId, timeRange = '30d') {
    try {
      const cacheKey = `seller_dashboard_${sellerId}_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      // Get shop for seller
      const shop = await Shop.findOne({ sellerId });
      if (!shop) {
        throw new ApiError(404, 'Shop not found');
      }

      const [
        orderStats,
        revenueStats,
        productStats,
        customerStats
      ] = await Promise.all([
        this.getShopOrderStatistics(shop._id, startDate),
        this.getShopRevenueStatistics(shop._id, startDate),
        this.getShopProductStatistics(shop._id, startDate),
        this.getShopCustomerStatistics(shop._id, startDate)
      ]);

      const analytics = {
        timeRange,
        shopId: shop._id,
        shopName: shop.name,
        orderStats,
        revenueStats,
        productStats,
        customerStats,
        generatedAt: new Date()
      };

      // Add to cache
      this.addToCache(cacheKey, analytics);
      
      return analytics;
    } catch (error) {
      throw error;
    }
  }

  // Get user dashboard analytics
  async getUserDashboardAnalytics(userId, timeRange = '30d') {
    try {
      const cacheKey = `user_dashboard_${userId}_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const [
        orderStats,
        spendingStats,
        favoriteStats,
        deliveryStats
      ] = await Promise.all([
        this.getUserOrderStatistics(userId, startDate),
        this.getUserSpendingStatistics(userId, startDate),
        this.getUserFavoriteStatistics(userId, startDate),
        this.getUserDeliveryStatistics(userId, startDate)
      ]);

      const analytics = {
        timeRange,
        userId,
        orderStats,
        spendingStats,
        favoriteStats,
        deliveryStats,
        generatedAt: new Date()
      };

      // Add to cache
      this.addToCache(cacheKey, analytics);
      
      return analytics;
    } catch (error) {
      throw error;
    }
  }

  // Get sales analytics
  async getSalesAnalytics(shopId, timeRange = '30d', groupBy = 'day') {
    try {
      const cacheKey = `sales_analytics_${shopId}_${timeRange}_${groupBy}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            shopId: shopId,
            createdAt: { $gte: startDate },
            status: { $in: ['delivered', 'out_for_delivery'] }
          }
        },
        {
          $group: {
            _id: this.getGroupByExpression(groupBy),
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const salesData = await Order.aggregate(pipeline);

      // Add to cache
      this.addToCache(cacheKey, salesData);
      
      return salesData;
    } catch (error) {
      throw error;
    }
  }

  // Get product performance analytics
  async getProductPerformanceAnalytics(shopId, timeRange = '30d') {
    try {
      const cacheKey = `product_performance_${shopId}_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            shopId: shopId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: '$items.productId',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orderCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $project: {
            productName: '$product.name',
            category: '$product.category',
            totalSold: 1,
            totalRevenue: 1,
            orderCount: 1,
            averagePrice: { $divide: ['$totalRevenue', '$totalSold'] }
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ];

      const productData = await Order.aggregate(pipeline);

      // Add to cache
      this.addToCache(cacheKey, productData);
      
      return productData;
    } catch (error) {
      throw error;
    }
  }

  // Get customer analytics
  async getCustomerAnalytics(shopId, timeRange = '30d') {
    try {
      const cacheKey = `customer_analytics_${shopId}_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            shopId: shopId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$userId',
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            firstOrder: { $min: '$createdAt' },
            lastOrder: { $max: '$createdAt' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            customerName: '$user.name',
            email: '$user.email',
            totalOrders: 1,
            totalSpent: 1,
            firstOrder: 1,
            lastOrder: 1,
            averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] }
          }
        },
        {
          $sort: { totalSpent: -1 }
        }
      ];

      const customerData = await Order.aggregate(pipeline);

      // Add to cache
      this.addToCache(cacheKey, customerData);
      
      return customerData;
    } catch (error) {
      throw error;
    }
  }

  // Get drone delivery analytics
  async getDroneDeliveryAnalytics(timeRange = '30d') {
    try {
      const cacheKey = `drone_delivery_${timeRange}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const startDate = this.getStartDate(timeRange);
      
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate },
            deliveryMethod: 'drone'
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 },
            totalDistance: { $sum: '$deliveryDistance' },
            totalTime: { $sum: '$deliveryTime' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            statuses: {
              $push: {
                status: '$_id.status',
                count: '$count',
                totalDistance: '$totalDistance',
                totalTime: '$totalTime'
              }
            },
            totalOrders: { $sum: '$count' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const droneData = await Order.aggregate(pipeline);

      // Add to cache
      this.addToCache(cacheKey, droneData);
      
      return droneData;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for statistics
  async getUserStatistics(startDate) {
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const verifiedUsers = await User.countDocuments({ is_verified: 1 });

    return { totalUsers, newUsers, verifiedUsers };
  }

  async getShopStatistics(startDate) {
    const totalShops = await Shop.countDocuments();
    const newShops = await Shop.countDocuments({ createdAt: { $gte: startDate } });
    const activeShops = await Shop.countDocuments({ status: 'active' });

    return { totalShops, newShops, activeShops };
  }

  async getOrderStatistics(startDate) {
    const totalOrders = await Order.countDocuments();
    const newOrders = await Order.countDocuments({ createdAt: { $gte: startDate } });
    const completedOrders = await Order.countDocuments({ status: 'delivered' });

    return { totalOrders, newOrders, completedOrders };
  }

  async getRevenueStatistics(startDate) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'out_for_delivery'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const data = result[0] || { totalRevenue: 0, averageOrderValue: 0 };

    return {
      totalRevenue: data.totalRevenue,
      averageOrderValue: data.averageOrderValue
    };
  }

  async getProductStatistics(startDate) {
    const totalProducts = await Product.countDocuments();
    const newProducts = await Product.countDocuments({ createdAt: { $gte: startDate } });
    const approvedProducts = await Product.countDocuments({ status: 'approved' });

    return { totalProducts, newProducts, approvedProducts };
  }

  async getDroneStatistics(startDate) {
    const totalDrones = await Drone.countDocuments();
    const activeDrones = await Drone.countDocuments({ status: 'active' });
    const availableDrones = await Drone.countDocuments({ status: 'available' });

    return { totalDrones, activeDrones, availableDrones };
  }

  // Shop-specific statistics
  async getShopOrderStatistics(shopId, startDate) {
    const totalOrders = await Order.countDocuments({ shopId });
    const newOrders = await Order.countDocuments({ 
      shopId, 
      createdAt: { $gte: startDate } 
    });
    const completedOrders = await Order.countDocuments({ 
      shopId, 
      status: 'delivered' 
    });

    return { totalOrders, newOrders, completedOrders };
  }

  async getShopRevenueStatistics(shopId, startDate) {
    const pipeline = [
      {
        $match: {
          shopId: shopId,
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'out_for_delivery'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const data = result[0] || { totalRevenue: 0, averageOrderValue: 0 };

    return {
      totalRevenue: data.totalRevenue,
      averageOrderValue: data.averageOrderValue
    };
  }

  async getShopProductStatistics(shopId, startDate) {
    const totalProducts = await Product.countDocuments({ shopId });
    const newProducts = await Product.countDocuments({ 
      shopId, 
      createdAt: { $gte: startDate } 
    });
    const approvedProducts = await Product.countDocuments({ 
      shopId, 
      status: 'approved' 
    });

    return { totalProducts, newProducts, approvedProducts };
  }

  async getShopCustomerStatistics(shopId, startDate) {
    const uniqueCustomers = await Order.distinct('userId', { shopId });
    const newCustomers = await Order.distinct('userId', { 
      shopId, 
      createdAt: { $gte: startDate } 
    });

    return {
      totalCustomers: uniqueCustomers.length,
      newCustomers: newCustomers.length
    };
  }

  // User-specific statistics
  async getUserOrderStatistics(userId, startDate) {
    const totalOrders = await Order.countDocuments({ userId });
    const newOrders = await Order.countDocuments({ 
      userId, 
      createdAt: { $gte: startDate } 
    });
    const completedOrders = await Order.countDocuments({ 
      userId, 
      status: 'delivered' 
    });

    return { totalOrders, newOrders, completedOrders };
  }

  async getUserSpendingStatistics(userId, startDate) {
    const pipeline = [
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate },
          status: { $in: ['delivered', 'out_for_delivery'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ];

    const result = await Order.aggregate(pipeline);
    const data = result[0] || { totalSpent: 0, averageOrderValue: 0 };

    return {
      totalSpent: data.totalSpent,
      averageOrderValue: data.averageOrderValue
    };
  }

  async getUserFavoriteStatistics(userId, startDate) {
    // This would integrate with favorites service
    return { totalFavorites: 0, newFavorites: 0 };
  }

  async getUserDeliveryStatistics(userId, startDate) {
    const totalDeliveries = await Order.countDocuments({ 
      userId, 
      status: 'delivered' 
    });
    const newDeliveries = await Order.countDocuments({ 
      userId, 
      status: 'delivered',
      deliveredAt: { $gte: startDate } 
    });

    return { totalDeliveries, newDeliveries };
  }

  // Utility methods
  getStartDate(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  getGroupByExpression(groupBy) {
    switch (groupBy) {
      case 'hour':
        return { $dateToString: { format: '%Y-%m-%d-%H', date: '$createdAt' } };
      case 'day':
        return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
      case 'week':
        return { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
      case 'month':
        return { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      default:
        return { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }
  }

  // Cache management
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  addToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
