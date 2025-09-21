import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Notification } from '../models/notificationModel.js';
import { User } from '../models/userModel.js';
import { Seller } from '../models/sellerModel.js';
import { Admin } from '../models/adminModel.js';
import { getIo } from '../services/socket.js';

// ==================== NOTIFICATION CRUD OPERATIONS ====================

// Create notification
export const createNotification = asyncHandler(async (req, res) => {
    const {
        userId, userModel, type, category, priority, title, message, shortMessage,
        icon, image, actions, metadata, expiresAt, scheduledFor, deliveryPreferences,
        tags, relatedEntities
    } = req.body;

    // Validate required fields
    if (!userId || !userModel || !type || !category || !title || !message) {
        throw new ApiError(400, "Missing required notification fields");
    }

    // Validate user model
    const validUserModels = ['User', 'Seller', 'Admin'];
    if (!validUserModels.includes(userModel)) {
        throw new ApiError(400, "Invalid user model");
    }

    // Check if user exists
    let user;
    switch (userModel) {
        case 'User':
            user = await User.findById(userId);
            break;
        case 'Seller':
            user = await Seller.findById(userId);
            break;
        case 'Admin':
            user = await Admin.findById(userId);
            break;
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Create notification
    const notification = await Notification.create({
        userId,
        userModel,
        type,
        category,
        priority,
        title,
        message,
        shortMessage: shortMessage || message.substring(0, 100),
        icon,
        image,
        actions,
        metadata,
        expiresAt,
        scheduledFor,
        deliveryPreferences: deliveryPreferences || {
            inApp: true,
            email: false,
            sms: false,
            push: false
        },
        tags,
        relatedEntities
    });

    // Send real-time notification via Socket.IO
    try {
        const io = getIo();
        io.to(`user_${userId}`).emit('new_notification', {
            notification: {
                _id: notification._id,
                type: notification.type,
                category: notification.category,
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                shortMessage: notification.shortMessage,
                icon: notification.icon,
                createdAt: notification.createdAt
            }
        });
  } catch (error) {
        console.error('Failed to send real-time notification:', error);
    }

    // Send via other channels if configured
    if (notification.deliveryPreferences.email) {
        await sendEmailNotification(notification, user);
    }

    if (notification.deliveryPreferences.sms) {
        await sendSMSNotification(notification, user);
    }

    if (notification.deliveryPreferences.push) {
        await sendPushNotification(notification, user);
    }

    res.status(201).json(new ApiResponse(201, { notification }, 'Notification created successfully'));
});

// Get user notifications with advanced filtering
export const getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
        page = 1, limit = 20, type, category, priority, read, archived,
        sort = 'newest', search, tags
    } = req.query;

  // Build query
    const query = { userId };

    if (type) query.type = type;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (read !== undefined) query.read = read === 'true';
    if (archived !== undefined) query.archived = archived === 'true';

    if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
    }

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } },
            { shortMessage: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
        case 'newest':
            sortOptions = { createdAt: -1 };
            break;
        case 'oldest':
            sortOptions = { createdAt: 1 };
            break;
        case 'priority':
            sortOptions = { priority: -1, createdAt: -1 };
            break;
        case 'unread':
            sortOptions = { read: 1, createdAt: -1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
  const notifications = await Notification.find(query)
        .sort(sortOptions)
    .skip(skip)
        .limit(parseInt(limit));

    // Get total count
  const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
        userId,
        read: false,
        archived: false
    });

    // Get notification statistics
    const stats = await Notification.aggregate([
        { $match: { userId } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                unread: { $sum: { $cond: ['$read', 0, 1] } }
            }
        }
    ]);

  res.status(200).json(new ApiResponse(200, {
    notifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
        stats: {
            unreadCount,
            typeBreakdown: stats
        }
    }, 'Notifications retrieved successfully'));
});

// Mark notification as read
export const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
        _id: notificationId,
        userId
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    notification.read = true;
    notification.readAt = new Date();
  await notification.save();

    res.status(200).json(new ApiResponse(200, { notification }, 'Notification marked as read'));
});

// Mark multiple notifications as read
export const markMultipleNotificationsAsRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw new ApiError(400, "Notification IDs array is required");
  }

  const result = await Notification.updateMany(
        {
            _id: { $in: notificationIds },
            userId
        },
        {
            $set: {
                read: true,
                readAt: new Date()
            }
        }
  );

  res.status(200).json(new ApiResponse(200, {
        updatedCount: result.modifiedCount
    }, 'Notifications marked as read'));
});

// Archive notification
export const archiveNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
        _id: notificationId,
        userId
    });

  if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    notification.archived = true;
    notification.archivedAt = new Date();
    await notification.save();

    res.status(200).json(new ApiResponse(200, { notification }, 'Notification archived'));
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId
    });

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    res.status(200).json(new ApiResponse(200, {}, 'Notification deleted successfully'));
});

// ==================== BULK NOTIFICATION OPERATIONS ====================

// Create bulk notifications
export const createBulkNotifications = asyncHandler(async (req, res) => {
    const { notifications, targetUsers } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
        throw new ApiError(400, "Notifications array is required");
    }

    if (!Array.isArray(targetUsers) || targetUsers.length === 0) {
        throw new ApiError(400, "Target users array is required");
    }

    const createdNotifications = [];
    const errors = [];

    for (const targetUser of targetUsers) {
        for (const notificationData of notifications) {
            try {
                const notification = await Notification.create({
                    ...notificationData,
                    userId: targetUser.userId,
                    userModel: targetUser.userModel
                });

                createdNotifications.push(notification);

                // Send real-time notification
                try {
                    const io = getIo();
                    io.to(`user_${targetUser.userId}`).emit('new_notification', {
                        notification: {
                            _id: notification._id,
                            type: notification.type,
                            category: notification.category,
                            priority: notification.priority,
                            title: notification.title,
                            message: notification.message,
                            shortMessage: notification.shortMessage,
                            icon: notification.icon,
                            createdAt: notification.createdAt
                        }
                    });
                } catch (error) {
                    console.error('Failed to send real-time notification:', error);
                }

            } catch (error) {
                errors.push({
                    userId: targetUser.userId,
                    error: error.message
                });
            }
        }
    }

    res.status(201).json(new ApiResponse(201, {
        created: createdNotifications.length,
        errors,
        summary: {
            successful: createdNotifications.length,
            failed: errors.length,
            total: targetUsers.length * notifications.length
        }
    }, 'Bulk notifications created'));
});

// ==================== NOTIFICATION TEMPLATES ====================

// Get notification templates
export const getNotificationTemplates = asyncHandler(async (req, res) => {
    const templates = {
        order_confirmation: {
            title: "Order Confirmed",
            message: "Your order #{orderNumber} has been confirmed and is being processed.",
            category: "order_update",
            priority: "medium",
            icon: "check-circle",
            actions: [
                {
                    label: "View Order",
                    action: "/orders/{orderId}",
                    type: "link",
                    style: "primary"
                }
            ]
        },
        order_ready: {
            title: "Order Ready for Pickup",
            message: "Your order #{orderNumber} is ready for pickup!",
            category: "delivery_status",
            priority: "high",
            icon: "package",
            actions: [
                {
                    label: "Track Order",
                    action: "/orders/{orderId}/tracking",
                    type: "link",
                    style: "success"
                }
            ]
        },
        delivery_update: {
            title: "Delivery Update",
            message: "Your order #{orderNumber} is {status}.",
            category: "delivery_status",
            priority: "medium",
            icon: "truck",
            actions: [
                {
                    label: "Track Delivery",
                    action: "/orders/{orderId}/tracking",
                    type: "link",
                    style: "info"
                }
            ]
        },
        payment_success: {
            title: "Payment Successful",
            message: "Payment of ${amount} for order #{orderNumber} has been processed successfully.",
            category: "payment_confirmation",
            priority: "medium",
            icon: "credit-card",
            actions: [
                {
                    label: "View Receipt",
                    action: "/orders/{orderId}/receipt",
                    type: "link",
                    style: "success"
                }
            ]
        },
        security_alert: {
            title: "Security Alert",
            message: "We detected a login attempt from a new device. If this wasn't you, please secure your account.",
            category: "security",
            priority: "high",
            icon: "shield-alert",
            actions: [
                {
                    label: "Secure Account",
                    action: "/security/settings",
                    type: "link",
                    style: "danger"
                },
                {
                    label: "Dismiss",
                    action: "dismiss",
                    type: "function",
                    style: "secondary"
                }
            ]
        }
    };

    res.status(200).json(new ApiResponse(200, { templates }, 'Notification templates retrieved'));
});

// ==================== NOTIFICATION PREFERENCES ====================

// Update notification preferences
export const updateNotificationPreferences = asyncHandler(async (req, res) => {
  const userId = req.user._id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
        throw new ApiError(400, "Preferences object is required");
    }

    // Update user's notification preferences
    const user = await User.findByIdAndUpdate(
        userId,
        { notificationPreferences: preferences },
        { new: true }
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(new ApiResponse(200, {
        preferences: user.notificationPreferences
    }, 'Notification preferences updated'));
});

// Get notification preferences
export const getNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select('notificationPreferences');
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    res.status(200).json(new ApiResponse(200, {
        preferences: user.notificationPreferences || {
            inApp: true,
            email: false,
            sms: false,
            push: false,
            orderUpdates: true,
            deliveryUpdates: true,
            promotional: false,
            security: true
        }
    }, 'Notification preferences retrieved'));
});

// ==================== HELPER FUNCTIONS ====================

// Send email notification
const sendEmailNotification = async (notification, user) => {
    try {
        // TODO: Integrate with your email service (Nodemailer, SendGrid, etc.)
        console.log(`Sending email notification to ${user.email}: ${notification.title}`);
        
        // Update notification status
        notification.sentVia.push({
            channel: 'email',
            sentAt: new Date(),
            status: 'sent'
        });
        await notification.save();
    } catch (error) {
        console.error('Failed to send email notification:', error);
        notification.sentVia.push({
            channel: 'email',
            sentAt: new Date(),
            status: 'failed',
            errorMessage: error.message
        });
        await notification.save();
    }
};

// Send SMS notification
const sendSMSNotification = async (notification, user) => {
    try {
        // TODO: Integrate with your SMS service (Twilio, AWS SNS, etc.)
        console.log(`Sending SMS notification to ${user.phone}: ${notification.shortMessage}`);
        
        notification.sentVia.push({
            channel: 'sms',
            sentAt: new Date(),
            status: 'sent'
        });
        await notification.save();
  } catch (error) {
        console.error('Failed to send SMS notification:', error);
        notification.sentVia.push({
            channel: 'sms',
            sentAt: new Date(),
            status: 'failed',
            errorMessage: error.message
        });
        await notification.save();
    }
};

// Send push notification
const sendPushNotification = async (notification, user) => {
    try {
        // TODO: Integrate with your push notification service (Firebase, OneSignal, etc.)
        console.log(`Sending push notification to user ${user._id}: ${notification.title}`);
        
        notification.sentVia.push({
            channel: 'push',
            sentAt: new Date(),
            status: 'sent'
        });
        await notification.save();
    } catch (error) {
        console.error('Failed to send push notification:', error);
        notification.sentVia.push({
            channel: 'push',
            sentAt: new Date(),
            status: 'failed',
            errorMessage: error.message
        });
        await notification.save();
    }
};
