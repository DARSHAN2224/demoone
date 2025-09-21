import { Notification } from '../models/notificationModel.js';
import { User } from '../models/userModel.js';
import { Shop } from '../models/shopModel.js';
import { ApiError } from '../utils/ApiError.js';

class NotificationService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 2 * 60 * 1000; // 2 minutes
  }

  // Create notification
  async createNotification(notificationData) {
    try {
      const notification = new Notification({
        ...notificationData,
        createdAt: new Date(),
        read: false
      });

      await notification.save();
      
      // Clear cache
      this.clearCache();
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Create user notification
  async createUserNotification(userId, type, title, message, data = {}) {
    try {
      const notification = await this.createNotification({
        recipientId: userId,
        recipientType: 'user',
        type,
        title,
        message,
        data
      });

      // Emit real-time notification
      await this.emitRealTimeNotification(userId, notification);
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Create shop notification
  async createShopNotification(shopId, type, title, message, data = {}) {
    try {
      const notification = await this.createNotification({
        recipientId: shopId,
        recipientType: 'shop',
        type,
        title,
        message,
        data
      });

      // Emit real-time notification to shop owner
      const shop = await Shop.findById(shopId);
      if (shop && shop.sellerId) {
        await this.emitRealTimeNotification(shop.sellerId, notification);
      }
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Create system-wide notification
  async createSystemNotification(type, title, message, data = {}) {
    try {
      const notification = await this.createNotification({
        recipientId: null,
        recipientType: 'system',
        type,
        title,
        message,
        data
      });

      // Emit to all connected users
      await this.emitSystemNotification(notification);
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = filters;
      const { sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      let query = {
        $or: [
          { recipientId: userId, recipientType: 'user' },
          { recipientType: 'system' }
        ]
      };

      if (unreadOnly) query.read = false;
      if (type) query.type = type;

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const notifications = await Notification.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
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

  // Get shop notifications
  async getShopNotifications(shopId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = filters;
      const { sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

      let query = {
        $or: [
          { recipientId: shopId, recipientType: 'shop' },
          { recipientType: 'system' }
        ]
      };

      if (unreadOnly) query.read = false;
      if (type) query.type = type;

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const notifications = await Notification.find(query)
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
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

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      // Check if user can read this notification
      if (notification.recipientType === 'user' && notification.recipientId.toString() !== userId) {
        throw new ApiError(403, 'Unauthorized to read this notification');
      }

      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
      
      // Clear cache
      this.clearCache();
      
      return notification;
    } catch (error) {
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId, recipientType = 'user') {
    try {
      const query = {
        $or: [
          { recipientId: userId, recipientType },
          { recipientType: 'system' }
        ],
        read: false
      };

      await Notification.updateMany(query, {
        read: true,
        readAt: new Date()
      });
      
      // Clear cache
      this.clearCache();
      
      return { success: true, message: 'All notifications marked as read' };
    } catch (error) {
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      // Check if user can delete this notification
      if (notification.recipientType === 'user' && notification.recipientId.toString() !== userId) {
        throw new ApiError(403, 'Unauthorized to delete this notification');
      }

      await Notification.findByIdAndDelete(notificationId);
      
      // Clear cache
      this.clearCache();
      
      return { success: true, message: 'Notification deleted successfully' };
    } catch (error) {
      throw error;
    }
  }

  // Get notification count
  async getNotificationCount(userId, recipientType = 'user') {
    try {
      const cacheKey = `notification_count_${userId}_${recipientType}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const query = {
        $or: [
          { recipientId: userId, recipientType },
          { recipientType: 'system' }
        ],
        read: false
      };

      const count = await Notification.countDocuments(query);
      
      // Add to cache
      this.addToCache(cacheKey, count);
      
      return count;
    } catch (error) {
      throw error;
    }
  }

  // Send order status notification
  async sendOrderStatusNotification(orderId, status, userId, shopId) {
    try {
      const statusMessages = {
        'confirmed': 'Your order has been confirmed and is being prepared',
        'preparing': 'Your order is being prepared in the kitchen',
        'ready': 'Your order is ready for pickup/delivery',
        'out_for_delivery': 'Your order is out for delivery',
        'delivered': 'Your order has been delivered successfully',
        'cancelled': 'Your order has been cancelled'
      };

      const message = statusMessages[status] || `Order status updated to ${status}`;
      
      // Create user notification
      await this.createUserNotification(
        userId,
        'order_status',
        'Order Status Update',
        message,
        { orderId, status, shopId }
      );

      // Create shop notification for order updates
      await this.createShopNotification(
        shopId,
        'order_update',
        'Order Status Changed',
        `Order ${orderId} status changed to ${status}`,
        { orderId, status, userId }
      );
    } catch (error) {
      console.error('Order status notification error:', error);
    }
  }

  // Send delivery notification
  async sendDeliveryNotification(orderId, deliveryData, userId) {
    try {
      const message = `Your order is being delivered by ${deliveryData.driverName || 'our delivery partner'}. Estimated arrival: ${deliveryData.estimatedTime}`;
      
      await this.createUserNotification(
        userId,
        'delivery_update',
        'Delivery Update',
        message,
        { orderId, deliveryData }
      );
    } catch (error) {
      console.error('Delivery notification error:', error);
    }
  }

  // Send drone delivery notification
  async sendDroneDeliveryNotification(orderId, droneData, userId) {
    try {
      const message = `Your order is being delivered by drone ${droneData.droneId}. Current location: ${droneData.currentLocation}`;
      
      await this.createUserNotification(
        userId,
        'drone_delivery',
        'Drone Delivery Update',
        message,
        { orderId, droneData }
      );
    } catch (error) {
      console.error('Drone delivery notification error:', error);
    }
  }

  // Send payment notification
  async sendPaymentNotification(orderId, paymentData, userId) {
    try {
      const message = `Payment ${paymentData.status} for order ${orderId}. Amount: $${paymentData.amount}`;
      
      await this.createUserNotification(
        userId,
        'payment_update',
        'Payment Update',
        message,
        { orderId, paymentData }
      );
    } catch (error) {
      console.error('Payment notification error:', error);
    }
  }

  // Send promotional notification
  async sendPromotionalNotification(userIds, title, message, data = {}) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await this.createUserNotification(
          userId,
          'promotional',
          title,
          message,
          data
        );
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error('Promotional notification error:', error);
      throw error;
    }
  }

  // Emit real-time notification
  async emitRealTimeNotification(userId, notification) {
    try {
      // This would integrate with Socket.IO or WebSocket service
      // For now, just log the emission
      console.log(`📢 Real-time notification emitted to user ${userId}:`, notification.title);
      
      // You would implement the actual emission here:
      // const io = getIo();
      // io.to(`user_${userId}`).emit('notification', notification);
    } catch (error) {
      console.error('Real-time notification emission error:', error);
    }
  }

  // Emit system notification
  async emitSystemNotification(notification) {
    try {
      // This would emit to all connected users
      console.log(`📢 System notification emitted:`, notification.title);
      
      // You would implement the actual emission here:
      // const io = getIo();
      // io.emit('system_notification', notification);
    } catch (error) {
      console.error('System notification emission error:', error);
    }
  }

  // Get notification templates
  getNotificationTemplates() {
    return {
      order_status: {
        title: 'Order Status Update',
        message: 'Your order status has been updated'
      },
      delivery_update: {
        title: 'Delivery Update',
        message: 'Your delivery status has been updated'
      },
      drone_delivery: {
        title: 'Drone Delivery Update',
        message: 'Your drone delivery status has been updated'
      },
      payment_update: {
        title: 'Payment Update',
        message: 'Your payment status has been updated'
      },
      promotional: {
        title: 'Special Offer',
        message: 'Check out our latest offers!'
      }
    };
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

export const notificationService = new NotificationService();
export default notificationService;
