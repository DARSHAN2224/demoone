import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import  Cart  from '../models/cartModel.js';
import { User } from '../models/userModel.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { Offer } from '../models/offersModel.js';

// ==================== CART CRUD OPERATIONS ====================

// Get user's cart
export const getCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId })
        .populate('items.shopId', 'name location rating')
        .populate('items.productId', 'name image price stock available variants')
        .populate('savedForLater.productId', 'name image price stock available');

    if (!cart) {
        cart = await Cart.create({
            user: userId,
            items: [],
            savedForLater: [],
            totals: { subtotal: 0, tax: 0, deliveryFee: 0, discount: 0, total: 0 },
            totalQty: 0,
            totalCost: 0
        });
    }

    await validateCartItems(cart);
    await calculateCartTotals(cart);

    res.status(200).json(new ApiResponse(200, { cart }, 'Cart retrieved successfully'));
});

// Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { shopId, productId, quantity, variant, notes } = req.body;

    if (!shopId || !productId || !quantity) {
        throw new ApiError(400, "Shop ID, product ID, and quantity are required");
    }

    const product = await Product.findById(productId);
    if (!product || !product.available || product.stock < quantity) {
        throw new ApiError(400, "Product not available or insufficient stock");
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
        cart = await Cart.create({
            user: userId,
            items: [],
            savedForLater: [],
            totals: { subtotal: 0, tax: 0, deliveryFee: 0, discount: 0, total: 0 },
            totalQty: 0,
            totalCost: 0
        });
    }

    const existingItemIndex = cart.items.findIndex(item => 
        item.productId.toString() === productId &&
        item.shopId.toString() === shopId &&
        JSON.stringify(item.variant) === JSON.stringify(variant || {})
    );

    if (existingItemIndex !== -1) {
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].price * cart.items[existingItemIndex].quantity;
    } else {
        const itemPrice = (product.discountedPrice || product.price) + (variant?.priceAdjustment || 0);
        cart.items.push({
            shopId,
            productId,
            quantity,
            price: itemPrice,
            variant,
            totalPrice: itemPrice * quantity,
            notes,
            addedAt: new Date(),
            lastUpdated: new Date(),
            isAvailable: true
        });
    }

    await calculateCartTotals(cart);
    await cart.save();
    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Item added to cart successfully'));
});

// Update cart item
export const updateCartItem = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity, variant, notes } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) throw new ApiError(404, "Item not found in cart");

    if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
    } else {
        const item = cart.items[itemIndex];
        item.quantity = quantity;
        item.totalPrice = item.price * quantity;
        if (variant) item.variant = variant;
        if (notes !== undefined) item.notes = notes;
        item.lastUpdated = new Date();
    }

    await calculateCartTotals(cart);
    await cart.save();
    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Cart item updated successfully'));
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) throw new ApiError(404, "Item not found in cart");

    cart.items.splice(itemIndex, 1);
    await calculateCartTotals(cart);
    await cart.save();

    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Item removed from cart successfully'));
});

// Clear cart
export const clearCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    cart.items = [];
    cart.totals = { subtotal: 0, tax: 0, deliveryFee: 0, discount: 0, total: 0 };
    cart.totalQty = 0;
    cart.totalCost = 0;
    cart.appliedOffers = [];

    await cart.save();
    res.status(200).json(new ApiResponse(200, { cart }, 'Cart cleared successfully'));
});

// ==================== SAVED FOR LATER ====================

// Add item to saved for later
export const addToSavedForLater = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) throw new ApiError(404, "Item not found in cart");

    const item = cart.items[itemIndex];
    cart.savedForLater.push({
        shopId: item.shopId,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant,
        notes: item.notes,
        addedAt: new Date()
    });

    cart.items.splice(itemIndex, 1);
    await calculateCartTotals(cart);
    await cart.save();

    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' },
        { path: 'savedForLater.shopId', select: 'name location rating' },
        { path: 'savedForLater.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Item moved to saved for later successfully'));
});

// Move item from saved for later to cart
export const moveToCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { savedItemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    const savedIndex = cart.savedForLater.findIndex(item => item._id.toString() === savedItemId);
    if (savedIndex === -1) throw new ApiError(404, "Saved item not found");

    const savedItem = cart.savedForLater[savedIndex];
    const existingCartIndex = cart.items.findIndex(item => 
        item.productId.toString() === savedItem.productId.toString() &&
        item.shopId.toString() === savedItem.shopId.toString() &&
        JSON.stringify(item.variant) === JSON.stringify(savedItem.variant || {})
    );

    if (existingCartIndex !== -1) {
        cart.items[existingCartIndex].quantity += savedItem.quantity;
        cart.items[existingCartIndex].totalPrice = cart.items[existingCartIndex].price * cart.items[existingCartIndex].quantity;
    } else {
        cart.items.push({
            shopId: savedItem.shopId,
            productId: savedItem.productId,
            quantity: savedItem.quantity,
            price: savedItem.price,
            variant: savedItem.variant,
            notes: savedItem.notes,
            addedAt: new Date(),
            lastUpdated: new Date(),
            isAvailable: true
        });
    }

    cart.savedForLater.splice(savedIndex, 1);
    await calculateCartTotals(cart);
    await cart.save();

    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' },
        { path: 'savedForLater.shopId', select: 'name location rating' },
        { path: 'savedForLater.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Item moved to cart successfully'));
});

// Remove item from saved for later
export const removeFromSavedForLater = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { savedItemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    // Find and remove item
    const savedIndex = cart.savedForLater.findIndex(item => item._id.toString() === savedItemId);
    if (savedIndex === -1) {
        throw new ApiError(404, "Saved item not found");
    }

    cart.savedForLater.splice(savedIndex, 1);

    // Save cart
    await cart.save();

    // Populate cart for response
    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' },
        { path: 'savedForLater.shopId', select: 'name location rating' },
        { path: 'savedForLater.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Item removed from saved for later successfully'));
});

// ==================== CART OFFERS & DISCOUNTS ====================

// Apply offer to cart
export const applyOffer = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { offerCode } = req.body;

    if (!offerCode) throw new ApiError(400, "Offer code is required");

    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new ApiError(404, "Cart not found");

    if (cart.items.length === 0) throw new ApiError(400, "Cannot apply offer to empty cart");

    const offer = await Offer.findOne({ 
        code: offerCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
    });

    if (!offer) throw new ApiError(404, "Invalid or expired offer code");

    if (cart.appliedOffers.some(applied => applied.offerId.toString() === offer._id.toString())) {
        throw new ApiError(400, "Offer already applied");
    }

    let discountAmount = 0;
    if (offer.discountType === 'percentage') {
        discountAmount = (cart.totals.subtotal * offer.discountValue) / 100;
    } else {
        discountAmount = offer.discountValue;
    }

    if (offer.maximumDiscount && discountAmount > offer.maximumDiscount) {
        discountAmount = offer.maximumDiscount;
    }

    cart.appliedOffers.push({
        offerId: offer._id,
        code: offer.code,
        discountAmount,
        appliedAt: new Date()
    });

    await calculateCartTotals(cart);
    await cart.save();

    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' },
        { path: 'appliedOffers.offerId', select: 'title description discountType discountValue' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Offer applied successfully'));
});

// Remove offer from cart
export const removeOffer = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { offerId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    // Find and remove offer
    const offerIndex = cart.appliedOffers.findIndex(offer => offer.offerId.toString() === offerId);
    if (offerIndex === -1) {
        throw new ApiError(404, "Offer not found in cart");
    }

    cart.appliedOffers.splice(offerIndex, 1);

    // Calculate totals
    await calculateCartTotals(cart);

    // Save cart
    await cart.save();

    // Populate cart for response
    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' },
        { path: 'appliedOffers.offerId', select: 'title description discountType discountValue' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Offer removed successfully'));
});

// ==================== CART SHARING ====================

// Share cart
export const shareCart = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { shareType, recipientEmail, message } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
        throw new ApiError(404, "Cart not found");
    }

    if (cart.items.length === 0) {
        throw new ApiError(400, "Cannot share empty cart");
    }

    // Generate share token
    const shareToken = Math.random().toString(36).substr(2, 15);
    const shareExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    cart.isShared = true;
    cart.shareToken = shareToken;
    cart.shareExpiry = shareExpiry;
    cart.shareHistory.push({
        sharedAt: new Date(),
        shareType,
        recipientEmail,
        message,
        shareToken
    });

    await cart.save();

    // TODO: Send email/SMS to recipient with share link
    // This would integrate with your notification system

    res.status(200).json(new ApiResponse(200, {
        shareToken,
        shareExpiry,
        shareLink: `${process.env.FRONTEND_URL}/cart/shared/${shareToken}`
    }, 'Cart shared successfully'));
});

// Get shared cart
export const getSharedCart = asyncHandler(async (req, res) => {
    const { shareToken } = req.params;

    const cart = await Cart.findOne({ 
        shareToken,
        isShared: true,
        shareExpiry: { $gt: new Date() }
    }).populate('user', 'name');

    if (!cart) {
        throw new ApiError(404, "Shared cart not found or expired");
    }

    // Populate cart items
    await cart.populate([
        { path: 'items.shopId', select: 'name location rating' },
        { path: 'items.productId', select: 'name image price stock available variants' }
    ]);

    res.status(200).json(new ApiResponse(200, { cart }, 'Shared cart retrieved successfully'));
});

// ==================== CART ANALYTICS ====================

// Get cart analytics
export const getCartAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '90d':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get cart analytics
    const analytics = await Cart.aggregate([
        { $match: { user: userId, updatedAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }
                },
                cartValue: { $avg: '$totalCost' },
                itemCount: { $avg: '$totalQty' },
                discountAmount: { $avg: '$totals.discount' }
            }
        },
        { $sort: { '_id.date': 1 } }
    ]);

    // Get summary statistics
    const summary = await Cart.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: null,
                totalCarts: { $sum: 1 },
                avgCartValue: { $avg: '$totalCost' },
                maxCartValue: { $max: '$totalCost' },
                totalItems: { $sum: '$totalQty' },
                totalDiscount: { $sum: '$totals.discount' }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        period,
        analytics,
        summary: summary[0] || {
            totalCarts: 0,
            avgCartValue: 0,
            maxCartValue: 0,
            totalItems: 0,
            totalDiscount: 0
        }
    }, 'Cart analytics retrieved successfully'));
});

// ==================== HELPER FUNCTIONS ====================

// Validate cart items and update availability
const validateCartItems = async (cart) => {
    for (let i = cart.items.length - 1; i >= 0; i--) {
        const item = cart.items[i];
        const product = await Product.findById(item.productId);
        
        if (!product || !product.available) {
            item.isAvailable = false;
            item.availabilityMessage = 'Product no longer available';
            continue;
        }

        if (product.stock < item.quantity) {
            if (product.stock === 0) {
                item.isAvailable = false;
                item.availabilityMessage = 'Out of stock';
            } else {
                item.quantity = product.stock;
                item.totalPrice = item.price * product.stock;
                item.availabilityMessage = `Only ${product.stock} available`;
            }
        } else {
            item.isAvailable = true;
            item.availabilityMessage = null;
        }
    }
};

// Calculate cart totals
const calculateCartTotals = async (cart) => {
    let subtotal = 0;
    let totalQty = 0;

    for (const item of cart.items) {
        if (item.isAvailable) {
            subtotal += item.totalPrice;
            totalQty += item.quantity;
        }
    }

    let discount = 0;
    for (const appliedOffer of cart.appliedOffers) {
        discount += appliedOffer.discountAmount;
    }

    const taxRate = 0.10;
    const tax = subtotal * taxRate;
    const deliveryFee = subtotal > 50 ? 0 : 5;
    const total = subtotal + tax + deliveryFee - discount;

    cart.totals = {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        deliveryFee: Math.round(deliveryFee * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        total: Math.round(total * 100) / 100
    };

    cart.totalQty = totalQty;
    cart.totalCost = total;
};
