import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import {
    getSalesAnalytics,
    getInventoryAnalytics,
    getCustomerAnalytics,
    getProductAnalytics,
    getShopAnalytics,
    getRealTimeAnalytics,
    exportAnalyticsData
} from '../controllers/analyticsController.js';

const router = express.Router();

// ==================== USER ANALYTICS ROUTES ====================
// Users can view their own analytics

// Get user's order analytics
router.get('/user/orders', verifyJWT, getSalesAnalytics);

// Get user's product analytics
router.get('/user/products', verifyJWT, getProductAnalytics);

// ==================== SELLER ANALYTICS ROUTES ====================
// Sellers can view analytics for their shops

// Get sales analytics for seller's shops
router.get('/seller/sales', verifySellerJWT, getSalesAnalytics);

// Get inventory analytics for seller's shops
router.get('/seller/inventory', verifySellerJWT, getInventoryAnalytics);

// Get customer analytics for seller's shops
router.get('/seller/customers', verifySellerJWT, getCustomerAnalytics);

// Get product performance analytics
router.get('/seller/products', verifySellerJWT, getProductAnalytics);

// Get shop performance analytics
router.get('/seller/shops', verifySellerJWT, getShopAnalytics);

// Export seller analytics data
router.get('/seller/export', verifySellerJWT, exportAnalyticsData);

// ==================== ADMIN ANALYTICS ROUTES ====================
// Admins can view comprehensive analytics

// Get comprehensive sales analytics
router.get('/admin/sales', verifyAdminJWT, getSalesAnalytics);

// Get comprehensive inventory analytics
router.get('/admin/inventory', verifyAdminJWT, getInventoryAnalytics);

// Get comprehensive customer analytics
router.get('/admin/customers', verifyAdminJWT, getCustomerAnalytics);

// Get comprehensive product analytics
router.get('/admin/products', verifyAdminJWT, getProductAnalytics);

// Get comprehensive shop analytics
router.get('/admin/shops', verifyAdminJWT, getShopAnalytics);

// Get real-time analytics dashboard
router.get('/admin/realtime', verifyAdminJWT, getRealTimeAnalytics);

// Export comprehensive analytics data
router.get('/admin/export', verifyAdminJWT, exportAnalyticsData);

export default router;
