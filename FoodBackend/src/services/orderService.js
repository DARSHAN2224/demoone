import { Order } from '../models/ordersModel.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { User } from '../models/userModel.js';
import { ApiError } from '../utils/ApiError.js';

class OrderService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
  }

  // Create new order
  async createOrder(orderData, userId) {
    try {
      // Validate user
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Group items by shop
      const shopOrders = this.groupItemsByShop(orderData.items);
      
      // Create orders for each shop
      const orders = [];
      for (const [shopId, items] of Object.entries(shopOrders)) {
        const order = new Order({
          userId,
          shopId,
          items,
          deliveryAddress: orderData.deliveryAddress,
          deliveryInstructions: orderData.deliveryInstructions,
          paymentMethod: orderData.paymentMethod,
          totalAmount: this.calculateOrderTotal(items),
          status: 'pending',
          orderNumber: this.generateOrderNumber()
        });

        await order.save();
        orders.push(order);
      }

      // Clear cache
      this.clearCache();
      
      return orders;
    } catch (error) {
      throw error;
    }
  }

  // Get order by ID
  async getOrderById(orderId, userId) {
    try {
      const cacheKey = `order_${orderId}_${userId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const order = await Order.findById(orderId)
        .populate('userId', 'name email mobile')
        .populate('shopId', 'name location rating')
        .populate('items.productId', 'name price image variants');

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check if user is authorized to view this order
      if (order.userId._id.toString() !== userId && !this.isAdmin(userId)) {
        throw new ApiError(403, 'Unauthorized to view this order');
      }

      // Add to cache
      this.addToCache(cacheKey, order);
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  // Get user orders with filtering and pagination
  async getUserOrders(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, status, shopId } = filters;
      const { sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      let query = { userId };
      if (status) query.status = status;
      if (shopId) query.shopId = shopId;

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const orders = await Order.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('shopId', 'name location rating')
        .populate('items.productId', 'name price image');

      const total = await Order.countDocuments(query);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get shop orders (for sellers)
  async getShopOrders(shopId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, status, dateRange } = filters;
      const { sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      let query = { shopId };
      if (status) query.status = status;
      if (dateRange) {
        query.createdAt = {
          $gte: new Date(dateRange.start),
          $lte: new Date(dateRange.end)
        };
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const orders = await Order.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('userId', 'name email mobile')
        .populate('items.productId', 'name price image');

      const total = await Order.countDocuments(query);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status, userId, role) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check authorization
      if (role === 'seller' && order.shopId.toString() !== userId) {
        throw new ApiError(403, 'Unauthorized to update this order');
      }

      // Validate status transition
      if (!this.isValidStatusTransition(order.status, status)) {
        throw new ApiError(400, 'Invalid status transition');
      }

      // Update status
      order.status = status;
      order.statusHistory.push({
        status,
        updatedBy: userId,
        updatedAt: new Date(),
        notes: `Status changed to ${status}`
      });

      // Update timestamps based on status
      if (status === 'confirmed') {
        order.confirmedAt = new Date();
      } else if (status === 'preparing') {
        order.preparingAt = new Date();
      } else if (status === 'ready') {
        order.readyAt = new Date();
      } else if (status === 'out_for_delivery') {
        order.outForDeliveryAt = new Date();
      } else if (status === 'delivered') {
        order.deliveredAt = new Date();
      } else if (status === 'cancelled') {
        order.cancelledAt = new Date();
      }

      await order.save();
      
      // Clear cache
      this.clearCache();
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId, userId, reason) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check if order can be cancelled
      if (!this.canCancelOrder(order.status)) {
        throw new ApiError(400, 'Order cannot be cancelled at this stage');
      }

      // Check authorization
      if (order.userId.toString() !== userId && !this.isAdmin(userId)) {
        throw new ApiError(403, 'Unauthorized to cancel this order');
      }

      // Update status
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.cancellationReason = reason;
      order.statusHistory.push({
        status: 'cancelled',
        updatedBy: userId,
        updatedAt: new Date(),
        notes: `Order cancelled: ${reason}`
      });

      // Restore inventory
      await this.restoreInventory(order.items);

      await order.save();
      
      // Clear cache
      this.clearCache();
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  // Add order tracking
  async addOrderTracking(orderId, trackingData, userId) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Check authorization
      if (order.shopId.toString() !== userId && !this.isAdmin(userId)) {
        throw new ApiError(403, 'Unauthorized to add tracking');
      }

      // Add tracking entry
      order.tracking.push({
        ...trackingData,
        timestamp: new Date(),
        updatedBy: userId
      });

      await order.save();
      
      // Clear cache
      this.clearCache();
      
      return order;
    } catch (error) {
      throw error;
    }
  }

  // Get order analytics
  async getOrderAnalytics(shopId, timeRange = '30d') {
    try {
      const startDate = this.getStartDate(timeRange);
      
      const analytics = await Order.aggregate([
        {
          $match: {
            shopId: shopId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            statusCounts: {
              $push: '$status'
            }
          }
        }
      ]);

      if (analytics.length === 0) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          statusBreakdown: {}
        };
      }

      const data = analytics[0];
      const statusBreakdown = this.countStatuses(data.statusCounts);

      return {
        totalOrders: data.totalOrders,
        totalRevenue: data.totalRevenue,
        averageOrderValue: data.averageOrderValue,
        statusBreakdown
      };
    } catch (error) {
      throw error;
    }
  }

  // Helper methods
  groupItemsByShop(items) {
    const shopOrders = {};
    
    for (const item of items) {
      const shopId = item.shopId;
      if (!shopOrders[shopId]) {
        shopOrders[shopId] = [];
      }
      shopOrders[shopId].push(item);
    }
    
    return shopOrders;
  }

  calculateOrderTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  generateOrderNumber() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }

  isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['out_for_delivery', 'cancelled'],
      'out_for_delivery': ['delivered', 'cancelled'],
      'delivered': [],
      'cancelled': []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  canCancelOrder(status) {
    const cancellableStatuses = ['pending', 'confirmed', 'preparing'];
    return cancellableStatuses.includes(status);
  }

  async restoreInventory(items) {
    for (const item of items) {
      try {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { inventory: item.quantity }
        });
      } catch (error) {
        console.error('Error restoring inventory:', error);
      }
    }
  }

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

  countStatuses(statuses) {
    return statuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  isAdmin(userId) {
    // This would check if user has admin role
    // For now, return false
    return false;
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

export const orderService = new OrderService();
export default orderService;
