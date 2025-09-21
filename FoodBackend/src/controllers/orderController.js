import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import  Order  from '../models/ordersModel.js';
import { User } from '../models/userModel.js';
import { Shop } from '../models/shopModel.js';
import { Product } from '../models/productsModel.js';
import { Notification } from '../models/notificationModel.js';
import  Comment  from '../models/commentModel.js';

// ==================== ORDER CRUD OPERATIONS ====================

// Create a new order
export const createOrder = asyncHandler(async (req, res) => {
    const {
        shops, deliveryAddress, deliveryInstructions, deliveryType,
        paymentMethod, specialRequests, estimatedDeliveryTime
    } = req.body;

    const userId = req.user._id;

    // Validate required fields
    if (!shops || !Array.isArray(shops) || shops.length === 0) {
        throw new ApiError(400, "Shops array is required");
    }

    if (!deliveryAddress) {
        throw new ApiError(400, "Delivery address is required");
    }

    // Validate shops and products
    let totalOrderQuantity = 0;
    let totalOrderPrice = 0;
    const validatedShops = [];

    for (const shopData of shops) {
        const { shopId, products } = shopData;

        // Validate shop
        const shop = await Shop.findById(shopId);
        if (!shop) {
            throw new ApiError(404, `Shop ${shopId} not found`);
        }

        if (!shop.is_filled) {
            throw new ApiError(400, `Shop ${shop.name} is not operational`);
        }

        // Validate products
        let shopTotalQuantity = 0;
        let shopTotalPrice = 0;
        const validatedProducts = [];

        for (const productData of products) {
            const { productId, quantity, variant } = productData;

            const product = await Product.findById(productId);
            if (!product) {
                throw new ApiError(404, `Product ${productId} not found`);
            }

            if (!product.available) {
                throw new ApiError(400, `Product ${product.name} is not available`);
            }

            if (product.stock < quantity) {
                throw new ApiError(400, `Insufficient stock for product ${product.name}`);
            }

            // Calculate price with variant adjustments
            let productPrice = product.discountedPrice || product.price;
            if (variant && variant.priceAdjustment) {
                productPrice += variant.priceAdjustment;
            }

            const totalPrice = productPrice * quantity;
            shopTotalQuantity += quantity;
            shopTotalPrice += totalPrice;

            validatedProducts.push({
                productId,
                quantity,
                price: productPrice,
                variant,
                totalPrice
            });

            // Update product stock
            await Product.findByIdAndUpdate(productId, {
                $inc: { stock: -quantity }
            });
        }

        totalOrderQuantity += shopTotalQuantity;
        totalOrderPrice += shopTotalPrice;

        validatedShops.push({
            shopId,
            products: validatedProducts,
            totalQuantity: shopTotalQuantity,
            totalPrice: shopTotalPrice,
            status: 'arrived',
            estimatedReadyTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes default
        });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const orderToken = Math.random().toString(36).substr(2, 15);

    // Create order
    const order = await Order.create({
        orderToken,
        orderNumber,
        user: userId,
        shops: validatedShops,
        totalQuantity: totalOrderQuantity,
        totalPrice: totalOrderPrice,
        deliveryAddress,
        deliveryInstructions,
        deliveryType: deliveryType || 'regular',
        payment: {
            method: paymentMethod || 'pending',
            status: 'pending'
        },
        specialRequests,
        estimatedDeliveryTime: estimatedDeliveryTime || new Date(Date.now() + 60 * 60 * 1000), // 1 hour default
        status: 'pending',
        statusHistory: [{
            status: 'pending',
            timestamp: new Date(),
            description: 'Order created successfully'
        }]
    });

    // Populate order details
    await order.populate([
        { path: 'user', select: 'name email phone' },
        { path: 'shops.shopId', select: 'name location rating' },
        { path: 'shops.products.productId', select: 'name image price' }
    ]);

    // Create notifications for shops
    for (const shopData of validatedShops) {
        try {
            const shop = await Shop.findById(shopData.shopId).populate('sellerId');
            if (shop && shop.sellerId) {
                await Notification.create({
                    userId: shop.sellerId._id,
                    type: 'new_order',
                    title: 'New Order Received',
                    message: `New order #${orderNumber} received with ${shopData.totalQuantity} items`,
                    data: {
                        orderId: order._id,
                        orderNumber,
                        shopId: shopData.shopId,
                        totalItems: shopData.totalQuantity,
                        totalPrice: shopData.totalPrice
                    },
                    priority: 'high'
                });
            }
        } catch (error) {
            console.error('Failed to create shop notification:', error);
        }
    }

    // Create notification for user
    try {
        await Notification.create({
            userId,
            type: 'order_confirmation',
            title: 'Order Confirmed',
            message: `Your order #${orderNumber} has been confirmed and is being processed`,
            data: {
                orderId: order._id,
                orderNumber,
                estimatedDeliveryTime: order.estimatedDeliveryTime
            },
            priority: 'medium'
        });
    } catch (error) {
        console.error('Failed to create user notification:', error);
    }

    res.status(201).json(new ApiResponse(201, { order }, 'Order created successfully'));
});

// Get user orders with advanced filtering
export const getUserOrders = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
        page = 1, limit = 20, status, shopId, dateRange,
        sort = 'newest', search
    } = req.query;

    // Build query
    const query = { user: userId };

    if (status) {
        if (Array.isArray(status)) {
            query.status = { $in: status };
        } else {
            query.status = status;
        }
    }

    if (shopId) {
        query['shops.shopId'] = shopId;
    }

    if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
        query.$or = [
            { orderNumber: { $regex: search, $options: 'i' } },
            { 'shops.shopId.name': { $regex: search, $options: 'i' } }
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
        case 'price_low':
            sortOptions = { totalPrice: 1 };
            break;
        case 'price_high':
            sortOptions = { totalPrice: -1 };
            break;
        case 'status':
            sortOptions = { status: 1, createdAt: -1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
        .populate('shops.shopId', 'name location rating')
        .populate('shops.products.productId', 'name image price')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

    // Get total count
    const total = await Order.countDocuments(query);

    // Calculate order statistics
    const orderStats = await Order.aggregate([
        { $match: { user: userId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalPrice' }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        orders,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        },
        statistics: orderStats,
        filters: {
            status,
            shopId,
            dateRange,
            search
        }
    }, 'Orders retrieved successfully'));
});

// Get order by ID with detailed information
export const getOrderById = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(orderId)
        .populate('user', 'name email phone')
        .populate('shops.shopId', 'name location rating description')
        .populate('shops.products.productId', 'name image price description variants')
        .populate('delivery.driverId', 'name phone vehicleNumber');

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Check access permissions
    if (order.user.toString() !== userId.toString() && req.user?.role !== 'admin' && req.user?.role !== 'seller') {
        throw new ApiError(403, "Access denied");
    }

    // Get order timeline
    const timeline = order.statusHistory || [];

    // Get related orders
    const relatedOrders = await Order.find({
        user: userId,
        _id: { $ne: orderId }
    })
    .limit(5)
    .populate('shops.shopId', 'name location')
    .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, {
        order,
        timeline,
        relatedOrders
    }, 'Order retrieved successfully'));
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { status, shopId, description, estimatedTime } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Check permissions
    let canUpdate = false;
    if (req.user.role === 'admin') {
        canUpdate = true;
    } else if (req.user.role === 'seller') {
        // Check if seller owns any shop in the order
        canUpdate = order.shops.some(shop => shop.shopId.toString() === shopId);
    } else if (order.user.toString() === userId.toString()) {
        // Users can only update certain statuses
        canUpdate = ['cancelled', 'delivery_instructions'].includes(status);
    }

    if (!canUpdate) {
        throw new ApiError(403, "Insufficient permissions to update order status");
    }

    // Validate status transition
    const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['out_for_delivery', 'picked_up'],
        'out_for_delivery': ['picked_up', 'delivered'],
        'picked_up': ['in_transit', 'delivered'],
        'in_transit': ['delivered', 'failed'],
        'delivered': ['completed'],
        'failed': ['refunded'],
        'cancelled': ['refunded']
    };

    const currentStatus = shopId ? 
        order.shops.find(s => s.shopId.toString() === shopId)?.status : 
        order.status;

    if (!validTransitions[currentStatus]?.includes(status)) {
        throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${status}`);
    }

    // Update order status
    if (shopId) {
        // Update shop-specific status
        const shopIndex = order.shops.findIndex(s => s.shopId.toString() === shopId);
        if (shopIndex !== -1) {
            order.shops[shopIndex].status = status;
            if (estimatedTime) {
                order.shops[shopIndex].estimatedReadyTime = new Date(estimatedTime);
            }
        }

        // Update overall order status based on shop statuses
        const allShopsReady = order.shops.every(shop => 
            ['ready', 'delivered', 'cancelled'].includes(shop.status)
        );
        const anyShopCancelled = order.shops.some(shop => shop.status === 'cancelled');
        const anyShopDelivered = order.shops.some(shop => shop.status === 'delivered');

        if (anyShopCancelled) {
            order.status = 'cancelled';
        } else if (allShopsReady && !anyShopDelivered) {
            order.status = 'ready';
        } else if (anyShopDelivered) {
            order.status = 'delivered';
        }
    } else {
        // Update overall order status
        order.status = status;
    }

    // Add to status history
    order.statusHistory.push({
        status,
        timestamp: new Date(),
        description: description || `Order status updated to ${status}`,
        updatedBy: userId,
        shopId: shopId || null
    });

    await order.save();

    // Create notifications
    try {
        if (status === 'ready') {
            await Notification.create({
                userId: order.user,
                type: 'order_ready',
                title: 'Order Ready for Pickup',
                message: `Your order #${order.orderNumber} is ready for pickup`,
                data: { orderId: order._id, orderNumber: order.orderNumber },
                priority: 'high'
            });
        } else if (status === 'out_for_delivery') {
            await Notification.create({
                userId: order.user,
                type: 'order_delivery',
                title: 'Order Out for Delivery',
                message: `Your order #${order.orderNumber} is out for delivery`,
                data: { orderId: order._id, orderNumber: order.orderNumber },
                priority: 'medium'
            });
        }
    } catch (error) {
        console.error('Failed to create notification:', error);
    }

    // Populate order for response
    await order.populate([
        { path: 'user', select: 'name email phone' },
        { path: 'shops.shopId', select: 'name location rating' },
        { path: 'shops.products.productId', select: 'name image price' }
    ]);

    res.status(200).json(new ApiResponse(200, { order }, 'Order status updated successfully'));
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { reason, shopId } = req.body;
    const userId = req.user._id;

    const order = await Order.findById(orderId);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Check permissions
    let canCancel = false;
    if (req.user.role === 'admin') {
        canCancel = true;
    } else if (req.user.role === 'seller') {
        canCancel = shopId && order.shops.some(shop => shop.shopId.toString() === shopId);
    } else if (order.user.toString() === userId.toString()) {
        // Users can only cancel orders that haven't started preparation
        canCancel = ['pending', 'confirmed'].includes(order.status);
    }

    if (!canCancel) {
        throw new ApiError(403, "Cannot cancel this order");
    }

    // Update order status
    if (shopId) {
        // Cancel specific shop
        const shopIndex = order.shops.findIndex(s => s.shopId.toString() === shopId);
        if (shopIndex !== -1) {
            order.shops[shopIndex].status = 'cancelled';
            order.shops[shopIndex].cancelReason = reason;
        }
    } else {
        // Cancel entire order
        order.status = 'cancelled';
        order.shops.forEach(shop => {
            if (['pending', 'confirmed'].includes(shop.status)) {
                shop.status = 'cancelled';
                shop.cancelReason = reason;
            }
        });
    }

    // Add to status history
    order.statusHistory.push({
        status: 'cancelled',
        timestamp: new Date(),
        description: `Order cancelled: ${reason}`,
        updatedBy: userId,
        shopId: shopId || null
    });

    // Restore product stock
    if (!shopId) {
        for (const shop of order.shops) {
            for (const product of shop.products) {
                await Product.findByIdAndUpdate(product.productId, {
                    $inc: { stock: product.quantity }
                });
            }
        }
    }

    await order.save();

    // Create notifications
    try {
        await Notification.create({
            userId: order.user,
            type: 'order_cancelled',
            title: 'Order Cancelled',
            message: `Your order #${order.orderNumber} has been cancelled`,
            data: { 
                orderId: order._id, 
                orderNumber: order.orderNumber,
                reason 
            },
            priority: 'medium'
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
    }

    res.status(200).json(new ApiResponse(200, { order }, 'Order cancelled successfully'));
});

// ==================== ORDER TRACKING ====================

// Get order tracking information
export const getOrderTracking = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(orderId)
        .populate('shops.shopId', 'name location')
        .populate('delivery.driverId', 'name phone vehicleNumber');

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Check access permissions
    if (order.user.toString() !== userId.toString() && req.user?.role !== 'admin' && req.user?.role !== 'seller') {
        throw new ApiError(403, "Access denied");
    }

    // Calculate delivery progress
    const deliveryProgress = calculateDeliveryProgress(order);

    // Get estimated times
    const estimatedTimes = {
        ready: order.shops.map(shop => ({
            shopId: shop.shopId._id,
            shopName: shop.shopId.name,
            estimatedReadyTime: shop.estimatedReadyTime
        })),
        delivery: order.estimatedDeliveryTime
    };

    res.status(200).json(new ApiResponse(200, {
        order,
        tracking: {
            currentStatus: order.status,
            deliveryProgress,
            estimatedTimes,
            timeline: order.statusHistory || []
        }
    }, 'Order tracking information retrieved successfully'));
});

// ==================== ORDER ANALYTICS ====================

// Get order analytics for sellers
export const getOrderAnalytics = asyncHandler(async (req, res) => {
    const { period = '30d', shopId } = req.query;
    const sellerId = req.seller._id;

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

    // Build query
    const query = {
        'shops.shopId': shopId || { $in: await getSellerShopIds(sellerId) },
        createdAt: { $gte: startDate }
    };

    // Get order analytics
    const orderAnalytics = await Order.aggregate([
        { $match: query },
        {
            $unwind: '$shops'
        },
        {
            $match: {
                'shops.shopId': shopId || { $in: await getSellerShopIds(sellerId) }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    status: '$shops.status'
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$shops.totalPrice' },
                totalQuantity: { $sum: '$shops.totalQuantity' }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count',
                        amount: '$totalAmount',
                        quantity: '$totalQuantity'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    // Get summary statistics
    const summary = await Order.aggregate([
        { $match: query },
        {
            $unwind: '$shops'
        },
        {
            $match: {
                'shops.shopId': shopId || { $in: await getSellerShopIds(sellerId) }
            }
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$shops.totalPrice' },
                totalItems: { $sum: '$shops.totalQuantity' },
                avgOrderValue: { $avg: '$shops.totalPrice' }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        period,
        shopId,
        analytics: orderAnalytics,
        summary: summary[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            totalItems: 0,
            avgOrderValue: 0
        }
    }, 'Order analytics retrieved successfully'));
});

// ==================== HELPER FUNCTIONS ====================

// Calculate delivery progress
const calculateDeliveryProgress = (order) => {
    const statusProgress = {
        'pending': 0,
        'confirmed': 10,
        'preparing': 30,
        'ready': 50,
        'out_for_delivery': 70,
        'picked_up': 80,
        'in_transit': 90,
        'delivered': 100,
        'completed': 100,
        'cancelled': 0,
        'failed': 0
    };

    return statusProgress[order.status] || 0;
};

// Get seller shop IDs
const getSellerShopIds = async (sellerId) => {
    const shops = await Shop.find({ sellerId }).select('_id');
    return shops.map(shop => shop._id);
};
