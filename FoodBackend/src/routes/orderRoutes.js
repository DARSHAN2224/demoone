import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import {
    createOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    getOrderTracking,
    getOrderAnalytics
} from '../controllers/orderController.js';

const router = express.Router();

// ==================== USER ORDER ROUTES ====================
// All user routes require JWT authentication

// Create a new order
router.post('/', verifyJWT, createOrder);

// Get user orders with advanced filtering
router.get('/user', verifyJWT, getUserOrders);

// Get order by ID with detailed information
router.get('/:orderId', verifyJWT, getOrderById);

// Update order status (limited user permissions)
router.patch('/:orderId/status', verifyJWT, updateOrderStatus);

// Cancel order
router.post('/:orderId/cancel', verifyJWT, cancelOrder);

// Get order tracking information
router.get('/:orderId/tracking', verifyJWT, getOrderTracking);

// ==================== SELLER ORDER ROUTES ====================
// Seller routes for managing their shop orders

// Update order status (seller permissions)
router.patch('/:orderId/status/seller', verifySellerJWT, updateOrderStatus);

// Cancel shop-specific order
router.post('/:orderId/cancel/shop', verifySellerJWT, cancelOrder);

// Get order analytics for seller's shops
router.get('/analytics/seller', verifySellerJWT, getOrderAnalytics);

// ==================== ADMIN ORDER ROUTES ====================
// Admin routes for managing all orders

// Update any order status
router.patch('/:orderId/status/admin', verifyAdminJWT, updateOrderStatus);

// Cancel any order
router.post('/:orderId/cancel/admin', verifyAdminJWT, cancelOrder);

// Get comprehensive order analytics
router.get('/analytics/admin', verifyAdminJWT, getOrderAnalytics);

export default router;
