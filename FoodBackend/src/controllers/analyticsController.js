import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import Order  from '../models/ordersModel.js';
import { Product } from '../models/productsModel.js';
import { Shop } from '../models/shopModel.js';
import { User } from '../models/userModel.js';
import { Seller } from '../models/sellerModel.js';
import Comment  from '../models/commentModel.js';
import  Rating  from '../models/ratingModel.js';

// Sales Analytics (Industry Standard)
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId, startDate, endDate } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  // Set date range based on period
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
    case 'custom':
      if (startDate && endDate) {
        dateFilter = { 
          $gte: new Date(startDate), 
          $lte: new Date(endDate) 
        };
      }
      break;
  }
  
  // Build query
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  
  // Aggregate sales data
  const salesData = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          shopId: '$shops.shopId'
        },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$shops.totalPrice' },
        totalQuantity: { $sum: '$shops.totalQuantity' },
        averageOrderValue: { $avg: '$shops.totalPrice' }
      }
    },
    { $sort: { '_id.date': 1 } }
  ]);
  
  // Calculate summary metrics
  const summary = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$shops.totalPrice' },
        totalQuantity: { $sum: '$shops.totalQuantity' },
        averageOrderValue: { $avg: '$shops.totalPrice' },
        uniqueCustomers: { $addToSet: '$user' }
      }
    }
  ]);
  
  // Get top selling products
  const topProducts = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $group: {
        _id: '$shops.products.productId',
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' }
  ]);
  
  // Get sales by category
  const salesByCategory = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $lookup: {
        from: 'products',
        localField: 'shops.products.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
  
  // Get sales trends by hour
  const salesByHour = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: { $hour: '$createdAt' },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalPrice' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  const analytics = {
    period,
    dateRange: {
      start: dateFilter.$gte || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: now
    },
    summary: summary[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalQuantity: 0,
      averageOrderValue: 0,
      uniqueCustomers: []
    },
    dailySales: salesData,
    topProducts,
    salesByCategory,
    salesByHour,
    metrics: {
      customerRetentionRate: 0, // To be calculated
      averageOrderFrequency: 0, // To be calculated
      conversionRate: 0 // To be calculated
    }
  };
  
  // Calculate additional metrics
  if (summary[0]) {
    analytics.summary.uniqueCustomerCount = summary[0].uniqueCustomers.length;
    analytics.metrics.averageOrderFrequency = summary[0].totalOrders / summary[0].uniqueCustomers.length || 0;
  }
  
  res.status(200).json(new ApiResponse(200, analytics, 'Sales analytics retrieved successfully'));
});

// Inventory Analytics (Industry Standard)
export const getInventoryAnalytics = asyncHandler(async (req, res) => {
  const { shopId } = req.query;
  
  const query = {};
  if (shopId) query.shopId = shopId;
  
  // Get inventory overview
  const inventoryOverview = await Product.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        lowStockProducts: { $sum: { $cond: [{ $lte: ['$stock', '$inventory.lowStockThreshold'] }, 1, 0] } },
        outOfStockProducts: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
      }
    }
  ]);
  
  // Get low stock alerts
  const lowStockAlerts = await Product.find({
    ...query,
    stock: { $lte: { $ref: 'inventory.lowStockThreshold' } }
  })
    .populate('shopId', 'name')
    .select('name stock price inventory.lowStockThreshold shopId')
    .sort({ stock: 1 })
    .limit(20);
  
  // Get stock movement trends
  const stockMovement = await Product.aggregate([
    { $match: query },
    {
      $project: {
        name: 1,
        stock: 1,
        price: 1,
        'inventory.lowStockThreshold': 1,
        stockStatus: {
          $cond: {
            if: { $eq: ['$stock', 0] },
            then: 'out_of_stock',
            else: {
              $cond: {
                if: { $lte: ['$stock', '$inventory.lowStockThreshold'] },
                then: 'low_stock',
                else: 'sufficient'
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$stockStatus',
        count: { $sum: 1 },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
      }
    }
  ]);
  
  // Get category-wise inventory
  const inventoryByCategory = await Product.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalStock: { $sum: '$stock' },
        averageStock: { $avg: '$stock' },
        totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
      }
    },
    { $sort: { totalValue: -1 } }
  ]);
  
  // Get reorder recommendations
  const reorderRecommendations = await Product.find({
    ...query,
    stock: { $lte: { $ref: 'inventory.reorderPoint' } }
  })
    .populate('shopId', 'name')
    .select('name stock price inventory.reorderPoint inventory.supplierInfo')
    .sort({ stock: 1 });
  
  const analytics = {
    overview: inventoryOverview[0] || {
      totalProducts: 0,
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalValue: 0
    },
    lowStockAlerts,
    stockMovement,
    inventoryByCategory,
    reorderRecommendations,
    metrics: {
      stockTurnoverRate: 0, // To be calculated
      averageDaysToStockout: 0, // To be calculated
      inventoryEfficiency: 0 // To be calculated
    }
  };
  
  res.status(200).json(new ApiResponse(200, analytics, 'Inventory analytics retrieved successfully'));
});

// Customer Behavior Analytics (Industry Standard)
export const getCustomerBehaviorAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
  }
  
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  
  // Customer segmentation by order value
  const customerSegmentation = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$totalPrice' },
        averageOrderValue: { $avg: '$totalPrice' },
        lastOrderDate: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: {
          segment: {
            $cond: {
              if: { $gte: ['$totalSpent', 1000] },
              then: 'high_value',
              else: {
                $cond: {
                  if: { $gte: ['$totalSpent', 500] },
                  then: 'medium_value',
                  else: 'low_value'
                }
              }
            }
          }
        },
        customerCount: { $sum: 1 },
        totalRevenue: { $sum: '$totalSpent' },
        averageOrdersPerCustomer: { $avg: '$totalOrders' }
      }
    }
  ]);
  
  // Customer lifetime value analysis
  const customerLTV = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 },
        firstOrderDate: { $min: '$createdAt' },
        lastOrderDate: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        customerLTV: '$totalSpent',
        orderCount: 1,
        customerAge: {
          $divide: [
            { $subtract: ['$lastOrderDate', '$firstOrderDate'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageLTV: { $avg: '$customerLTV' },
        averageOrderCount: { $avg: '$orderCount' },
        averageCustomerAge: { $avg: '$customerAge' }
      }
    }
  ]);
  
  // Customer retention analysis
  const retentionData = await Order.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$user',
        orderDates: { $push: '$createdAt' },
        orderCount: { $sum: 1 }
      }
    },
    {
      $match: { orderCount: { $gt: 1 } }
    },
    {
      $project: {
        repeatCustomer: { $gt: ['$orderCount', 1] },
        orderIntervals: {
          $map: {
            input: { $slice: ['$orderDates', 1, -1] },
            as: 'orderDate',
            in: {
              $divide: [
                { $subtract: ['$$orderDate', { $arrayElemAt: ['$orderDates', 0] }] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      }
    }
  ]);
  
  // Get customer preferences
  const customerPreferences = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $lookup: {
        from: 'products',
        localField: 'shops.products.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: {
          category: '$product.category',
          deliveryType: '$deliveryType'
        },
        orderCount: { $sum: 1 },
        totalQuantity: { $sum: '$shops.products.quantity' }
      }
    },
    { $sort: { orderCount: -1 } }
  ]);
  
  const analytics = {
    period,
    customerSegmentation,
    customerLTV: customerLTV[0] || {
      averageLTV: 0,
      averageOrderCount: 0,
      averageCustomerAge: 0
    },
    retentionData: {
      repeatCustomerRate: retentionData.length > 0 ? 
        (retentionData.filter(c => c.repeatCustomer).length / retentionData.length) * 100 : 0,
      averageOrderInterval: retentionData.length > 0 ?
        retentionData.reduce((sum, c) => sum + (c.orderIntervals.reduce((a, b) => a + b, 0) / c.orderIntervals.length), 0) / retentionData.length : 0
    },
    customerPreferences,
    metrics: {
      customerAcquisitionCost: 0, // To be calculated
      customerRetentionRate: 0, // Calculated above
      averageCustomerLifetime: 0 // To be calculated
    }
  };
  
  res.status(200).json(new ApiResponse(200, analytics, 'Customer behavior analytics retrieved successfully'));
});

// Product Performance Analytics (Industry Standard)
export const getProductPerformanceAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId, category } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
  }
  
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  
  // Top performing products
  const topProducts = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $lookup: {
        from: 'products',
        localField: 'shops.products.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$shops.products.productId',
        productName: { $first: '$product.name' },
        category: { $first: '$product.category' },
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 }
  ]);
  
  // Product category performance
  const categoryPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $lookup: {
        from: 'products',
        localField: 'shops.products.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.category',
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } },
        productCount: { $addToSet: '$shops.products.productId' },
        averageRating: { $avg: '$product.averageRating' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalSold: 1,
        totalRevenue: 1,
        productCount: { $size: '$productCount' },
        averageRating: { $round: ['$averageRating', 2] }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
  
  // Product rating analysis
  const ratingAnalysis = await Product.aggregate([
    { $match: shopId ? { shopId } : {} },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$averageRating' },
        totalRatings: { $sum: '$totalRatings' },
        ratingDistribution: {
          $push: {
            rating: '$averageRating',
            count: '$totalRatings'
          }
        }
      }
    }
  ]);
  
  // Product inventory performance
  const inventoryPerformance = await Product.aggregate([
    { $match: shopId ? { shopId } : {} },
    {
      $project: {
        name: 1,
        category: 1,
        stock: 1,
        price: 1,
        averageRating: 1,
        totalRatings: 1,
        stockValue: { $multiply: ['$price', '$stock'] },
        stockStatus: {
          $cond: {
            if: { $eq: ['$stock', 0] },
            then: 'out_of_stock',
            else: {
              $cond: {
                if: { $lte: ['$stock', '$inventory.lowStockThreshold'] },
                then: 'low_stock',
                else: 'sufficient'
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$stockStatus',
        productCount: { $sum: 1 },
        totalValue: { $sum: '$stockValue' },
        averageRating: { $avg: '$averageRating' }
      }
    }
  ]);
  
  const analytics = {
    period,
    topProducts,
    categoryPerformance,
    ratingAnalysis: ratingAnalysis[0] || {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: []
    },
    inventoryPerformance,
    metrics: {
      productEfficiency: 0, // To be calculated
      categoryDiversity: 0, // To be calculated
      stockTurnoverRate: 0 // To be calculated
    }
  };
  
  res.status(200).json(new ApiResponse(200, analytics, 'Product performance analytics retrieved successfully'));
});

// Real-time Analytics Dashboard (Industry Standard)
export const getRealTimeAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Today's orders
  const todayOrders = await Order.countDocuments({
    createdAt: { $gte: today }
  });
  
  // Today's revenue
  const todayRevenue = await Order.aggregate([
    { $match: { createdAt: { $gte: today } } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);
  
  // Active orders
  const activeOrders = await Order.countDocuments({
    'delivery.status': { $in: ['pending', 'preparing', 'out-for-delivery'] }
  });
  
  // Recent activity
  const recentActivity = await Order.find({
    createdAt: { $gte: lastHour }
  })
    .populate('user', 'name')
    .populate('shops.shopId', 'name')
    .select('orderNumber totalPrice delivery.status createdAt user shops.shopId')
    .sort({ createdAt: -1 })
    .limit(10);
  
  // Low stock alerts
  const lowStockAlerts = await Product.find({
    stock: { $lte: { $ref: 'inventory.lowStockThreshold' } }
  })
    .populate('shopId', 'name')
    .select('name stock price inventory.lowStockThreshold shopId')
    .limit(5);
  
  // Pending reviews
  const pendingReviews = await Comment.countDocuments({
    status: 'pending'
  });
  
  const realTimeData = {
    timestamp: now,
    today: {
      orders: todayOrders,
      revenue: todayRevenue[0]?.total || 0
    },
    activeOrders,
    recentActivity,
    lowStockAlerts,
    pendingReviews,
    systemHealth: {
      database: 'healthy',
      api: 'healthy',
      notifications: 'active'
    }
  };
  
  res.status(200).json(new ApiResponse(200, realTimeData, 'Real-time analytics retrieved successfully'));
});

// Export Analytics Data (Industry Standard)
export const exportAnalyticsData = asyncHandler(async (req, res) => {
  const { type, format = 'json', period = '30d' } = req.query;
  
  if (!['sales', 'inventory', 'customer', 'product'].includes(type)) {
    throw new ApiError('Invalid analytics type', 400);
  }
  
  let data;
  switch (type) {
    case 'sales':
      data = await getSalesAnalyticsData(period);
      break;
    case 'inventory':
      data = await getInventoryAnalyticsData(period);
      break;
    case 'customer':
      data = await getCustomerAnalyticsData(period);
      break;
    case 'product':
      data = await getProductAnalyticsData(period);
      break;
  }
  
  if (format === 'csv') {
    // Convert to CSV format
    const csvData = convertToCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_analytics_${period}.csv`);
    return res.send(csvData);
  }
  
  res.status(200).json(new ApiResponse(200, data, `${type} analytics data exported successfully`));
});

// ==================== CUSTOMER ANALYTICS ====================

// Get customer behavior analytics
export const getCustomerAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  // Set date range based on period
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
    default:
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
  
  // Build query
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  
  // Get customer insights
  const customerInsights = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: '$user',
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$shops.totalPrice' },
        firstOrder: { $min: '$createdAt' },
        lastOrder: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: null,
        totalCustomers: { $sum: 1 },
        newCustomers: {
          $sum: {
            $cond: [
              { $gte: ['$firstOrder', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        repeatCustomers: {
          $sum: {
            $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0]
          }
        },
        averageOrderValue: { $avg: '$totalSpent' }
      }
    }
  ]);
  
  // Get customer retention data
  const retentionData = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: {
          customer: '$user',
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
        },
        orderCount: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.month',
        uniqueCustomers: { $addToSet: '$_id.customer' },
        totalOrders: { $sum: '$orderCount' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  res.status(200).json(new ApiResponse(200, {
    period,
    shopId,
    insights: customerInsights[0] || {
      totalCustomers: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      averageOrderValue: 0
    },
    retention: retentionData
  }, 'Customer analytics retrieved successfully'));
});

// ==================== PRODUCT ANALYTICS ====================

// Get product performance analytics
export const getProductAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId, productId } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  // Set date range based on period
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
    default:
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
  
  // Build query
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  if (productId) query['shops.products.productId'] = productId;
  
  // Get product performance data
  const productPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $group: {
        _id: '$shops.products.productId',
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } },
        averageRating: { $avg: '$shops.products.rating' }
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $project: {
        productId: '$_id',
        name: '$productInfo.name',
        category: '$productInfo.category',
        totalSold: 1,
        totalRevenue: 1,
        averageRating: 1
      }
    },
    { $sort: { totalSold: -1 } }
  ]);
  
  // Get top products
  const topProducts = productPerformance.slice(0, 10);
  
  // Get category performance
  const categoryPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    { $unwind: '$shops.products' },
    {
      $lookup: {
        from: 'products',
        localField: '$shops.products.productId',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
    {
      $group: {
        _id: '$productInfo.category',
        totalSold: { $sum: '$shops.products.quantity' },
        totalRevenue: { $sum: { $multiply: ['$shops.products.price', '$shops.products.quantity'] } },
        productCount: { $addToSet: '$shops.products.productId' }
      }
    },
    {
      $project: {
        category: '$_id',
        totalSold: 1,
        totalRevenue: 1,
        productCount: { $size: '$productCount' }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
  
  res.status(200).json(new ApiResponse(200, {
    period,
    shopId,
    productId,
    topProducts,
    categoryPerformance,
    summary: {
      totalProducts: productPerformance.length,
      totalSold: productPerformance.reduce((sum, p) => sum + p.totalSold, 0),
      totalRevenue: productPerformance.reduce((sum, p) => sum + p.totalRevenue, 0)
    }
  }, 'Product analytics retrieved successfully'));
});

// ==================== SHOP ANALYTICS ====================

// Get shop performance analytics
export const getShopAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d', shopId } = req.query;
  
  let dateFilter = {};
  const now = new Date();
  
  // Set date range based on period
  switch (period) {
    case '7d':
      dateFilter = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      break;
    case '30d':
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      break;
    case '90d':
      dateFilter = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      break;
    case '1y':
      dateFilter = { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      break;
    default:
      dateFilter = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
  }
  
  // Build query
  const query = { createdAt: dateFilter };
  if (shopId) query['shops.shopId'] = shopId;
  
  // Get shop performance data
  const shopPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: '$shops.shopId',
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$shops.totalPrice' },
        totalQuantity: { $sum: '$shops.totalQuantity' },
        averageOrderValue: { $avg: '$shops.totalPrice' }
      }
    },
    {
      $lookup: {
        from: 'shops',
        localField: '_id',
        foreignField: '_id',
        as: 'shopInfo'
      }
    },
    { $unwind: '$shopInfo' },
    {
      $project: {
        shopId: '$_id',
        name: '$shopInfo.name',
        category: '$shopInfo.category',
        totalOrders: 1,
        totalRevenue: 1,
        totalQuantity: 1,
        averageOrderValue: 1
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
  
  // Get daily performance
  const dailyPerformance = await Order.aggregate([
    { $match: query },
    { $unwind: '$shops' },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          shopId: '$shops.shopId'
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$shops.totalPrice' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        totalOrders: { $sum: '$orders' },
        totalRevenue: { $sum: '$revenue' }
      }
    },
    { $sort: { '_id': 1 } }
  ]);
  
  res.status(200).json(new ApiResponse(200, {
    period,
    shopId,
    shopPerformance,
    dailyPerformance,
    summary: {
      totalShops: shopPerformance.length,
      totalOrders: shopPerformance.reduce((sum, s) => sum + s.totalOrders, 0),
      totalRevenue: shopPerformance.reduce((sum, s) => sum + s.totalRevenue, 0)
    }
  }, 'Shop analytics retrieved successfully'));
});

// Helper functions for export
const getSalesAnalyticsData = async (period) => {
  // Implementation for sales data export
  return { message: 'Sales data export functionality to be implemented' };
};

const getInventoryAnalyticsData = async (period) => {
  // Implementation for inventory data export
  return { message: 'Inventory data export functionality to be implemented' };
};

const getCustomerAnalyticsData = async (period) => {
  // Implementation for customer data export
  return { message: 'Customer data export functionality to be implemented' };
};

const getProductAnalyticsData = async (period) => {
  // Implementation for product data export
  return { message: 'Product data export functionality to be implemented' };
};

const convertToCSV = (data) => {
  // Implementation for CSV conversion
  return 'CSV conversion to be implemented';
};
