import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { User } from '../models/userModel.js';
import Order  from '../models/ordersModel.js';

// ==================== ADVANCED SEARCH ====================

// Comprehensive search across multiple entities
export const comprehensiveSearch = asyncHandler(async (req, res) => {
    const {
        query, entityType, page = 1, limit = 20, sort = 'relevance',
        filters, location, radius, priceRange, rating, category,
        availability, shopStatus
    } = req.query;

    if (!query || query.trim().length < 2) {
        throw new ApiError(400, "Search query must be at least 2 characters long");
    }

    const searchQuery = query.trim();
    const skip = (page - 1) * limit;

    // Build search query based on entity type
    let searchResults = {};
    let totalCount = 0;

    switch (entityType) {
        case 'products':
            const singleProductResults = await searchProducts(searchQuery, {
                page, limit, skip, sort, filters, location, radius,
                priceRange, rating, category, availability
            });
            searchResults.products = singleProductResults.results;
            totalCount = singleProductResults.total;
            break;

        case 'shops':
            const singleShopResults = await searchShops(searchQuery, {
                page, limit, skip, sort, filters, location, radius,
                rating, shopStatus
            });
            searchResults.shops = singleShopResults.results;
            totalCount = singleShopResults.total;
            break;

        case 'all':
        default:
            // Search across all entities
            const [allProductResults, allShopResults] = await Promise.all([
                searchProducts(searchQuery, {
                    page, limit: Math.ceil(limit / 2), skip: 0, sort, filters,
                    location, radius, priceRange, rating, category, availability
                }),
                searchShops(searchQuery, {
                    page, limit: Math.ceil(limit / 2), skip: 0, sort, filters,
                    location, radius, rating, shopStatus
                })
            ]);

            searchResults.products = allProductResults.results;
            searchResults.shops = allShopResults.results;
            totalCount = allProductResults.total + allShopResults.total;
            break;
    }

    // Get search suggestions
    const suggestions = await getSearchSuggestions(searchQuery);

    // Get search analytics
    await recordSearchAnalytics(searchQuery, entityType, req.user?._id);

    res.status(200).json(new ApiResponse(200, {
        query: searchQuery,
        entityType,
        results: searchResults,
        suggestions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
        },
        filters: {
            location,
            radius,
            priceRange,
            rating,
            category,
            availability,
            shopStatus
        }
    }, 'Search completed successfully'));
});

// ==================== PRODUCT SEARCH ====================

// Search products with advanced filtering
const searchProducts = async (query, options) => {
    const {
        page, limit, skip, sort, filters, location, radius,
        priceRange, rating, category, availability
    } = options;

    // Build search query
    const searchQuery = {
        $and: [
            {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } },
                    { category: { $regex: query, $options: 'i' } },
                    { subcategory: { $regex: query, $options: 'i' } }
                ]
            },
            { available: true }
        ]
    };

    // Apply filters
    if (category) searchQuery.$and.push({ category });
    if (rating) searchQuery.$and.push({ rating: { $gte: parseFloat(rating) } });
    if (availability === 'in_stock') searchQuery.$and.push({ stock: { $gt: 0 } });
    if (priceRange) {
        const [minPrice, maxPrice] = priceRange.split(',').map(Number);
        if (minPrice !== undefined) searchQuery.$and.push({ discountedPrice: { $gte: minPrice } });
        if (maxPrice !== undefined) searchQuery.$and.push({ discountedPrice: { $lte: maxPrice } });
    }

    // Apply location filter if specified
    if (location && radius) {
        // TODO: Implement geospatial search with MongoDB geospatial indexes
        // This would require adding location coordinates to products/shops
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
        case 'relevance':
            // Custom relevance scoring based on multiple factors
            sortOptions = { score: -1, rating: -1, createdAt: -1 };
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
        case 'newest':
            sortOptions = { createdAt: -1 };
            break;
        case 'popular':
            sortOptions = { salesCount: -1 };
            break;
        default:
            sortOptions = { score: -1, rating: -1, createdAt: -1 };
    }

    // Execute search with relevance scoring
    let products;
    if (sort === 'relevance') {
        // Use aggregation pipeline for relevance scoring
        products = await Product.aggregate([
            { $match: searchQuery },
            {
                $addFields: {
                    score: {
                        $add: [
                            { $multiply: [{ $indexOfCP: [{ $toLower: '$name' }, query.toLowerCase()] }, -1] },
                            { $multiply: ['$rating', 10] },
                            { $multiply: [{ $size: '$tags' }, 2] },
                            { $cond: [{ $gt: ['$stock', 0] }, 5, 0] }
                        ]
                    }
                }
            },
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: limit }
        ]);
    } else {
        products = await Product.find(searchQuery)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);
    }

    // Populate shop information
    await Product.populate(products, {
        path: 'shopId',
        select: 'name location rating'
    });

    // Get total count
    const total = await Product.countDocuments(searchQuery);

    return { results: products, total };
};

// ==================== SHOP SEARCH ====================

// Search shops with advanced filtering
const searchShops = async (query, options) => {
    const {
        page, limit, skip, sort, filters, location, radius,
        rating, shopStatus
    } = options;

    // Build search query
    const searchQuery = {
        $and: [
            {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { category: { $regex: query, $options: 'i' } },
                    { location: { $regex: query, $options: 'i' } }
                ]
            },
            { is_filled: true }
        ]
    };

    // Apply filters
    if (rating) searchQuery.$and.push({ rating: { $gte: parseFloat(rating) } });
    if (shopStatus === 'open') {
        const now = new Date();
        const currentHour = now.getHours();
        searchQuery.$and.push({
            $expr: {
                $and: [
                    { $lte: ['$openingHours', currentHour] },
                    { $gte: ['$closingHours', currentHour] }
                ]
            }
        });
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
        case 'relevance':
            sortOptions = { rating: -1, createdAt: -1 };
            break;
        case 'rating':
            sortOptions = { rating: -1 };
            break;
        case 'distance':
            // TODO: Implement distance-based sorting
            sortOptions = { rating: -1 };
            break;
        case 'newest':
            sortOptions = { createdAt: -1 };
            break;
        default:
            sortOptions = { rating: -1, createdAt: -1 };
    }

    // Execute search
    const shops = await Shop.find(searchQuery)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'name rating');

    // Get total count
    const total = await Shop.countDocuments(searchQuery);

    return { results: shops, total };
};

// ==================== SEARCH SUGGESTIONS ====================

// Get search suggestions and autocomplete
export const getSearchSuggestions = async (query) => {
    if (!query || query.trim().length < 2) {
        return { suggestions: [], popular: [], recent: [] };
    }

    const searchTerm = query.trim();

    // Get product suggestions
    const productSuggestions = await Product.aggregate([
        {
            $match: {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { category: { $regex: searchTerm, $options: 'i' } },
                    { tags: { $in: [new RegExp(searchTerm, 'i')] } }
                ],
                available: true
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                sample: { $first: '$name' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    // Get shop suggestions
    const shopSuggestions = await Shop.aggregate([
        {
            $match: {
                $or: [
                    { name: { $regex: searchTerm, $options: 'i' } },
                    { category: { $regex: searchTerm, $options: 'i' } }
                ],
                is_filled: true
            }
        },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                sample: { $first: '$name' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 3 }
    ]);

    // Get popular searches (mock data - in production, this would come from analytics)
    const popularSearches = [
        'pizza', 'burger', 'chinese', 'indian', 'dessert',
        'breakfast', 'lunch', 'dinner', 'snacks', 'beverages'
    ].filter(term => term.includes(searchTerm.toLowerCase()));

    // Get recent searches (mock data - in production, this would come from user search history)
    const recentSearches = [
        'pizza near me', 'fast food', 'healthy options',
        'vegetarian', 'gluten free'
    ].filter(term => term.includes(searchTerm.toLowerCase()));

    return {
        suggestions: [
            ...productSuggestions.map(s => ({ type: 'category', value: s._id, count: s.count })),
            ...shopSuggestions.map(s => ({ type: 'shop_category', value: s._id, count: s.count }))
        ],
        popular: popularSearches.slice(0, 5),
        recent: recentSearches.slice(0, 5)
    };
};

// ==================== FACETED SEARCH ====================

// Get search facets for filtering
export const getSearchFacets = async (req, res) => {
    const { query, entityType } = req.query;

    if (!query) {
        throw new ApiError(400, "Search query is required");
    }

    let facets = {};

    if (entityType === 'products' || entityType === 'all') {
        // Get product facets
        const productFacets = await Product.aggregate([
            {
                $match: {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } },
                        { tags: { $in: [new RegExp(query, 'i')] } }
                    ],
                    available: true
                }
            },
            {
                $facet: {
                    categories: [
                        { $group: { _id: '$category', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    priceRanges: [
                        {
                            $bucket: {
                                groupBy: '$discountedPrice',
                                boundaries: [0, 10, 25, 50, 100, 200, 500],
                                default: '500+',
                                output: { count: { $sum: 1 } }
                            }
                        }
                    ],
                    ratings: [
                        {
                            $bucket: {
                                groupBy: '$rating',
                                boundaries: [0, 1, 2, 3, 4, 5],
                                default: 'unrated',
                                output: { count: { $sum: 1 } }
                            }
                        }
                    ],
                    availability: [
                        {
                            $group: {
                                _id: { $cond: [{ $gt: ['$stock', 0] }, 'in_stock', 'out_of_stock'] },
                                count: { $sum: 1 }
                            }
                        }
                    ]
                }
            }
        ]);

        facets.products = productFacets[0];
    }

    if (entityType === 'shops' || entityType === 'all') {
        // Get shop facets
        const shopFacets = await Shop.aggregate([
            {
                $match: {
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } },
                        { category: { $regex: query, $options: 'i' } }
                    ],
                    is_filled: true
                }
            },
            {
                $facet: {
                    categories: [
                        { $group: { _id: '$category', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    ratings: [
                        {
                            $bucket: {
                                groupBy: '$rating',
                                boundaries: [0, 1, 2, 3, 4, 5],
                                default: 'unrated',
                                output: { count: { $sum: 1 } }
                            }
                        }
                    ],
                    locations: [
                        { $group: { _id: '$city', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ]
                }
            }
        ]);

        facets.shops = shopFacets[0];
    }

    res.status(200).json(new ApiResponse(200, { facets }, 'Search facets retrieved successfully'));
};

// ==================== SEARCH ANALYTICS ====================

// Record search analytics
const recordSearchAnalytics = async (query, entityType, userId) => {
    try {
        // TODO: Implement search analytics tracking
        // This would store search queries, results, user interactions, etc.
        // for improving search relevance and understanding user behavior
        
        console.log(`Search analytics: Query="${query}", EntityType="${entityType}", UserId="${userId}"`);
    } catch (error) {
        console.error('Failed to record search analytics:', error);
    }
};

// ==================== TRENDING SEARCHES ====================

// Get trending searches
export const getTrendingSearches = async (req, res) => {
    const { period = '7d', limit = 10 } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
        case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
        case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // TODO: Implement trending searches based on actual search analytics
    // For now, return mock trending data
    const trendingSearches = [
        { query: 'pizza', count: 1250, trend: 'up' },
        { query: 'burger', count: 980, trend: 'up' },
        { query: 'chinese food', count: 750, trend: 'stable' },
        { query: 'indian cuisine', count: 650, trend: 'up' },
        { query: 'dessert', count: 520, trend: 'down' },
        { query: 'breakfast', count: 480, trend: 'stable' },
        { query: 'healthy food', count: 420, trend: 'up' },
        { query: 'vegetarian', count: 380, trend: 'up' },
        { query: 'gluten free', count: 320, trend: 'stable' },
        { query: 'organic food', count: 280, trend: 'up' }
    ].slice(0, parseInt(limit));

    res.status(200).json(new ApiResponse(200, {
        period,
        trending: trendingSearches
    }, 'Trending searches retrieved successfully'));
};
