import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    addVariant,
    updateVariant,
    removeVariant,
    updateStock,
    bulkStockUpdate,
    getLowStockProducts,
    getProductAnalytics,
    bulkProductOperations
} from '../controllers/productController.js';

const router = express.Router();

// ==================== PUBLIC PRODUCT ROUTES ====================
// These routes can be accessed by all users

// Get all products with advanced filtering
router.get('/', getProducts);

// Get product by ID with detailed information
router.get('/:productId', getProductById);

// ==================== SELLER PRODUCT ROUTES ====================
// All seller routes require seller JWT authentication

// Create a new product
router.post('/', verifySellerJWT, createProduct);

// Update product
router.patch('/:productId', verifySellerJWT, updateProduct);

// Delete product (soft delete)
router.delete('/:productId', verifySellerJWT, deleteProduct);

// ==================== PRODUCT VARIANTS MANAGEMENT ====================

// Add variant to product
router.post('/:productId/variants', verifySellerJWT, addVariant);

// Update variant
router.patch('/:productId/variants/:variantId', verifySellerJWT, updateVariant);

// Remove variant
router.delete('/:productId/variants/:variantId', verifySellerJWT, removeVariant);

// ==================== INVENTORY MANAGEMENT ====================

// Update product stock
router.patch('/:productId/stock', verifySellerJWT, updateStock);

// Bulk stock update
router.post('/stock/bulk', verifySellerJWT, bulkStockUpdate);

// Get low stock products
router.get('/inventory/low-stock', verifySellerJWT, getLowStockProducts);

// ==================== PRODUCT ANALYTICS ====================

// Get product analytics
router.get('/:productId/analytics', verifySellerJWT, getProductAnalytics);

// ==================== BULK OPERATIONS ====================

// Bulk product operations
router.post('/bulk/operations', verifySellerJWT, bulkProductOperations);

export default router;
