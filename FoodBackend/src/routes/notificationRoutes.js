import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import {
    createNotification,
    getUserNotifications,
    markNotificationAsRead,
    markMultipleNotificationsAsRead,
    archiveNotification,
    deleteNotification,
    createBulkNotifications,
    getNotificationTemplates,
    updateNotificationPreferences,
    getNotificationPreferences
} from '../controllers/notificationController.js';

const router = express.Router();

// ==================== USER NOTIFICATION ROUTES ====================
// All user routes require JWT authentication

// Get user notifications with advanced filtering
router.get('/', verifyJWT, getUserNotifications);

// Mark notification as read
router.patch('/:notificationId/read', verifyJWT, markNotificationAsRead);

// Mark multiple notifications as read
router.patch('/bulk/read', verifyJWT, markMultipleNotificationsAsRead);

// Archive notification
router.patch('/:notificationId/archive', verifyJWT, archiveNotification);

// Delete notification
router.delete('/:notificationId', verifyJWT, deleteNotification);

// Get notification templates
router.get('/templates', verifyJWT, getNotificationTemplates);

// Update notification preferences
router.patch('/preferences', verifyJWT, updateNotificationPreferences);

// Get notification preferences
router.get('/preferences', verifyJWT, getNotificationPreferences);

// ==================== SELLER NOTIFICATION ROUTES ====================
// Sellers can create notifications for their customers

// Create notification for customer
router.post('/customer', verifySellerJWT, createNotification);

// Create bulk notifications for customers
router.post('/bulk/customers', verifySellerJWT, createBulkNotifications);

// ==================== ADMIN NOTIFICATION ROUTES ====================
// Admins can create system-wide notifications

// Create system notification
router.post('/system', verifyAdminJWT, createNotification);

// Create bulk system notifications
router.post('/bulk/system', verifyAdminJWT, createBulkNotifications);

// Create promotional notification
router.post('/promotional', verifyAdminJWT, createNotification);

export default router;
