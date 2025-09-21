import express from 'express';
import { verifyJWT } from '../middlewares/authMiddleware.js';
import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    addToSavedForLater,
    moveToCart,
    applyOffer
} from '../controllers/cartController.js';

const router = express.Router();

// ==================== CART ROUTES ====================
// All cart routes require JWT authentication

// Get user's cart
router.get('/', verifyJWT, getCart);

// Add item to cart
router.post('/add', verifyJWT, addToCart);

// Update cart item
router.patch('/items/:itemId', verifyJWT, updateCartItem);

// Remove item from cart
router.delete('/items/:itemId', verifyJWT, removeFromCart);

// Clear cart
router.delete('/clear', verifyJWT, clearCart);

// ==================== SAVED FOR LATER ROUTES ====================

// Add item to saved for later
router.post('/items/:itemId/save', verifyJWT, addToSavedForLater);

// Move item from saved for later to cart
router.post('/saved/:savedItemId/move', verifyJWT, moveToCart);

// ==================== CART OFFERS & DISCOUNTS ====================

// Apply offer to cart
router.post('/offers/apply', verifyJWT, applyOffer);

export default router;
