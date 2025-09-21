import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import  Comment  from '../models/commentModel.js';
import  Rating  from '../models/ratingModel.js';
import  Order  from '../models/ordersModel.js';

// ==================== PRODUCT CRUD OPERATIONS ====================

// Create a new product with variants
export const createProduct = asyncHandler(async (req, res) => {
    const {
        name, description, category, subcategory, price, discount,
        shopId, available, stock, image, variants, inventory,
        nutritionalInfo, specifications, tags, seo
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !price || !shopId) {
        throw new ApiError(400, "Name, description, category, price, and shop ID are required");
    }

    // Validate shop ownership
    const shop = await Shop.findById(shopId);
    if (!shop) {
        throw new ApiError(404, "Shop not found");
    }

    if (shop.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only create products for your own shop");
    }

    // Calculate discounted price
    const discountedPrice = discount > 0 ? price * (1 - discount / 100) : price;

    // Create product
    const product = await Product.create({
        name, description, category, subcategory, price, discount, discountedPrice,
        shopId, available, stock, image, variants, inventory,
        nutritionalInfo, specifications, tags, seo,
        sellerId: req.seller._id
    });

    // Populate shop info
    await product.populate('shopId', 'name location');

    res.status(201).json(new ApiResponse(201, { product }, 'Product created successfully'));
});

// Get all products with advanced filtering and pagination
export const getProducts = asyncHandler(async (req, res) => {
    const {
        page = 1, limit = 20, sort = 'newest', category, subcategory,
        minPrice, maxPrice, rating, available, shopId, search,
        tags, variants, inStock, featured
    } = req.query;

    // Build query
    const query = {};

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (shopId) query.shopId = shopId;
    if (available !== undefined) query.available = available === 'true';
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (featured === 'true') query.featured = true;

    // Price range filter
    if (minPrice || maxPrice) {
        query.discountedPrice = {};
        if (minPrice) query.discountedPrice.$gte = parseFloat(minPrice);
        if (maxPrice) query.discountedPrice.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
        query.rating = { $gte: parseFloat(rating) };
    }

    // Tags filter
    if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
    }

    // Variants filter
    if (variants) {
        const variantFilters = JSON.parse(variants);
        Object.keys(variantFilters).forEach(variantName => {
            query[`variants.options.value`] = variantFilters[variantName];
        });
    }

    // Search functionality
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { tags: { $in: [new RegExp(search, 'i')] } }
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
            sortOptions = { discountedPrice: 1 };
            break;
        case 'price_high':
            sortOptions = { discountedPrice: -1 };
            break;
        case 'rating':
            sortOptions = { rating: -1 };
            break;
        case 'popular':
            sortOptions = { salesCount: -1 };
            break;
        case 'name':
            sortOptions = { name: 1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
        .populate('shopId', 'name location rating')
        .populate('sellerId', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

    // Get total count
    const total = await Product.countDocuments(query);

    // Calculate aggregated data
    const aggregatedData = await Product.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                avgPrice: { $avg: '$discountedPrice' },
                minPrice: { $min: '$discountedPrice' },
                maxPrice: { $max: '$discountedPrice' },
                totalProducts: { $sum: 1 },
                totalInStock: { $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] } }
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        },
        filters: {
            category,
            subcategory,
            minPrice,
            maxPrice,
            rating,
            available,
            shopId,
            search,
            tags,
            variants,
            inStock,
            featured
        },
        aggregatedData: aggregatedData[0] || {
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            totalProducts: 0,
            totalInStock: 0
        }
    }, 'Products retrieved successfully'));
});

// Get product by ID with detailed information
export const getProductById = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const product = await Product.findById(productId)
        .populate('shopId', 'name location rating description')
        .populate('sellerId', 'name rating')
        .populate('category', 'name description');

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    if (!product.available) {
        throw new ApiError(404, "Product not available");
    }

    // Get related products
    const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: productId },
        available: true
    })
    .limit(6)
    .populate('shopId', 'name location');

    // Get product analytics
    const analytics = await getProductAnalytics(productId);

    res.status(200).json(new ApiResponse(200, {
        product,
        relatedProducts,
        analytics
    }, 'Product retrieved successfully'));
});

// Update product
export const updateProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const updateData = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only update your own products");
    }

    // Recalculate discounted price if price or discount changed
    if (updateData.price || updateData.discount !== undefined) {
        const newPrice = updateData.price || product.price;
        const newDiscount = updateData.discount !== undefined ? updateData.discount : product.discount;
        updateData.discountedPrice = newDiscount > 0 ? newPrice * (1 - newDiscount / 100) : newPrice;
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
    ).populate('shopId', 'name location');

    res.status(200).json(new ApiResponse(200, { product: updatedProduct }, 'Product updated successfully'));
});

// Delete product
export const deleteProduct = asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only delete your own products");
    }

    // Soft delete - mark as unavailable
    product.available = false;
    product.deletedAt = new Date();
    await product.save();

    res.status(200).json(new ApiResponse(200, {}, 'Product deleted successfully'));
});

// ==================== PRODUCT VARIANTS MANAGEMENT ====================

// Add variant to product
export const addVariant = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { name, options } = req.body;

    if (!name || !options || !Array.isArray(options)) {
        throw new ApiError(400, "Variant name and options array are required");
    }

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only modify your own products");
    }

    // Check if variant name already exists
    const existingVariant = product.variants.find(v => v.name === name);
    if (existingVariant) {
        throw new ApiError(400, "Variant name already exists");
    }

    // Add variant
    product.variants.push({ name, options });
    await product.save();

    res.status(200).json(new ApiResponse(200, { product }, 'Variant added successfully'));
});

// Update variant
export const updateVariant = asyncHandler(async (req, res) => {
    const { productId, variantId } = req.params;
    const { name, options } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only modify your own products");
    }

    // Find and update variant
    const variantIndex = product.variants.findIndex(v => v._id.toString() === variantId);
    if (variantIndex === -1) {
        throw new ApiError(404, "Variant not found");
    }

    if (name) product.variants[variantIndex].name = name;
    if (options) product.variants[variantIndex].options = options;

    await product.save();

    res.status(200).json(new ApiResponse(200, { product }, 'Variant updated successfully'));
});

// Remove variant
export const removeVariant = asyncHandler(async (req, res) => {
    const { productId, variantId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only modify your own products");
    }

    // Remove variant
    product.variants = product.variants.filter(v => v._id.toString() !== variantId);
    await product.save();

    res.status(200).json(new ApiResponse(200, { product }, 'Variant removed successfully'));
});

// ==================== INVENTORY MANAGEMENT ====================

// Update product stock
export const updateStock = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { stock, variantOptions } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check ownership
    if (product.sellerId.toString() !== req.seller._id.toString()) {
        throw new ApiError(403, "You can only modify your own products");
    }

    if (variantOptions) {
        // Update specific variant stock
        variantOptions.forEach(({ variantName, optionValue, stock: variantStock }) => {
            const variant = product.variants.find(v => v.name === variantName);
            if (variant) {
                const option = variant.options.find(o => o.value === optionValue);
                if (option) {
                    option.stock = variantStock;
                    option.available = variantStock > 0;
                }
            }
        });
    } else {
        // Update main product stock
        product.stock = stock;
        product.available = stock > 0;
        product.inventory.outOfStock = stock === 0;
    }

    await product.save();

    res.status(200).json(new ApiResponse(200, { product }, 'Stock updated successfully'));
});

// Bulk stock update
export const bulkStockUpdate = asyncHandler(async (req, res) => {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
        throw new ApiError(400, "Updates array is required");
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
        try {
            const { productId, stock, variantOptions } = update;
            
            const product = await Product.findById(productId);
            if (!product) {
                errors.push({ productId, error: "Product not found" });
                continue;
            }

            // Check ownership
            if (product.sellerId.toString() !== req.seller._id.toString()) {
                errors.push({ productId, error: "Access denied" });
                continue;
            }

            if (variantOptions) {
                variantOptions.forEach(({ variantName, optionValue, stock: variantStock }) => {
                    const variant = product.variants.find(v => v.name === variantName);
                    if (variant) {
                        const option = variant.options.find(o => o.value === optionValue);
                        if (option) {
                            option.stock = variantStock;
                            option.available = variantStock > 0;
                        }
                    }
                });
            } else {
                product.stock = stock;
                product.available = stock > 0;
                product.inventory.outOfStock = stock === 0;
            }

            await product.save();
            results.push({ productId, success: true });
        } catch (error) {
            errors.push({ productId: update.productId, error: error.message });
        }
    }

    res.status(200).json(new ApiResponse(200, {
        results,
        errors,
        summary: {
            successful: results.length,
            failed: errors.length,
            total: updates.length
        }
    }, 'Bulk stock update completed'));
});

// Get low stock products
export const getLowStockProducts = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const sellerId = req.seller._id;

    const query = {
        sellerId,
        $or: [
            { stock: { $lte: '$inventory.lowStockThreshold' } },
            { 'variants.options.stock': { $lte: '$inventory.lowStockThreshold' } }
        ]
    };

    const skip = (page - 1) * limit;
    const products = await Product.find(query)
        .populate('shopId', 'name')
        .sort({ stock: 1 })
        .skip(skip)
        .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json(new ApiResponse(200, {
        products,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }, 'Low stock products retrieved successfully'));
});

// ==================== PRODUCT ANALYTICS ====================

// Get product analytics
export const getProductAnalytics = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const { period = '30d' } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check access permissions
    if (product.sellerId.toString() !== req.seller._id.toString() && req.user?.role !== 'admin') {
        throw new ApiError(403, "Access denied");
    }

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

    // Get order analytics
    const orderAnalytics = await Order.aggregate([
        {
            $match: {
                'items.productId': productId,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    status: '$status'
                },
                count: { $sum: 1 },
                totalQuantity: { $sum: { $sum: '$items.quantity' } },
                totalRevenue: { $sum: '$totalAmount' }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                orders: {
                    $push: {
                        status: '$_id.status',
                        count: '$count',
                        quantity: '$totalQuantity',
                        revenue: '$totalRevenue'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    // Get rating analytics
    const ratingAnalytics = await Rating.aggregate([
        {
            $match: {
                productId,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    rating: '$rating'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                ratings: {
                    $push: {
                        rating: '$_id.rating',
                        count: '$count'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    // Get comment analytics
    const commentAnalytics = await Comment.aggregate([
        {
            $match: {
                'target.type': 'product',
                'target.id': productId,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    status: '$status'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.date',
                comments: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    res.status(200).json(new ApiResponse(200, {
        period,
        productId,
        analytics: {
            orders: orderAnalytics,
            ratings: ratingAnalytics,
            comments: commentAnalytics
        },
        summary: {
            totalOrders: orderAnalytics.reduce((sum, day) => 
                sum + day.orders.reduce((daySum, order) => daySum + order.count, 0), 0
            ),
            totalRevenue: orderAnalytics.reduce((sum, day) => 
                sum + day.orders.reduce((daySum, order) => daySum + order.revenue, 0), 0
            ),
            totalRatings: ratingAnalytics.reduce((sum, day) => 
                sum + day.ratings.reduce((daySum, rating) => daySum + rating.count, 0), 0
            ),
            totalComments: commentAnalytics.reduce((sum, day) => 
                sum + day.comments.reduce((daySum, comment) => daySum + comment.count, 0), 0
            )
        }
    }, 'Product analytics retrieved successfully'));
});

// ==================== BULK OPERATIONS ====================

// Bulk product operations
export const bulkProductOperations = asyncHandler(async (req, res) => {
    const { operation, productIds, data } = req.body;

    if (!operation || !Array.isArray(productIds) || !data) {
        throw new ApiError(400, "Operation, product IDs array, and data are required");
    }

    const results = [];
    const errors = [];

    for (const productId of productIds) {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                errors.push({ productId, error: "Product not found" });
                continue;
            }

            // Check ownership
            if (product.sellerId.toString() !== req.seller._id.toString()) {
                errors.push({ productId, error: "Access denied" });
                continue;
            }

            switch (operation) {
                case 'update_status':
                    product.available = data.available;
                    break;
                case 'update_category':
                    product.category = data.category;
                    if (data.subcategory) product.subcategory = data.subcategory;
                    break;
                case 'update_pricing':
                    if (data.price !== undefined) product.price = data.price;
                    if (data.discount !== undefined) product.discount = data.discount;
                    if (data.price || data.discount !== undefined) {
                        product.discountedPrice = data.discount > 0 ? 
                            (data.price || product.price) * (1 - data.discount / 100) : 
                            (data.price || product.price);
                    }
                    break;
                case 'add_tags':
                    if (!product.tags) product.tags = [];
                    product.tags = [...new Set([...product.tags, ...data.tags])];
                    break;
                case 'remove_tags':
                    if (product.tags) {
                        product.tags = product.tags.filter(tag => !data.tags.includes(tag));
                    }
                    break;
                default:
                    errors.push({ productId, error: "Invalid operation" });
                    continue;
            }

            await product.save();
            results.push({ productId, success: true });
        } catch (error) {
            errors.push({ productId, error: error.message });
        }
    }

    res.status(200).json(new ApiResponse(200, {
        operation,
        results,
        errors,
        summary: {
            successful: results.length,
            failed: errors.length,
            total: productIds.length
        }
    }, 'Bulk operation completed'));
});


