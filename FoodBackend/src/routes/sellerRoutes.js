import { Router } from 'express';
const sellerRouter = Router();
import {
     loginSeller,
     logoutSeller,
     refreshAccessToken,
     registerSeller,
     verifyEmail,
     resendVerificationCode,
     getCurrentSeller,
     updateSellerProfile,
     changeCurrentPassword,
     getSellerDashboard,
     getSellerHome,
     getSellerShops,
     getSellerProducts,
     createShop,
     updateShop,
     deleteShop,
     createProduct,
     updateProduct,
     deleteProduct,
     getSellerStats,
     getSellerOrders,
     updateOrderStatus,
     deleteSellerAccount
} from '../controllers/sellerController.js';
import  Order  from '../models/ordersModel.js';
import { Delivery } from '../models/deliveryModel.js';
import { generateQRCode } from '../utils/qrCodeGenerator.js';
import {
     getSellerOffers,
     createOffer,
     updateOffer,
     deleteOffer
} from '../controllers/offersController.js';
import { upload } from "../middlewares/multerMiddleware.js"
import { verifyJWT, verifySellerJWT, checkAlreadyAuthenticated } from '../middlewares/authMiddleware.js';
import { onlySellerAccess } from '../middlewares/sellerMiddleware.js';
import { loginRateLimiter, signupRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { accountLockoutMiddleware } from '../middlewares/accountLockoutMiddleware.js';
import { registerValidator, loginValidator } from '../utils/validator.js'

// Authentication routes - protected from already authenticated users
sellerRouter.route("/register").post(checkAlreadyAuthenticated, signupRateLimiter, registerValidator, registerSeller);
sellerRouter.route("/login").post(checkAlreadyAuthenticated, loginRateLimiter, accountLockoutMiddleware, loginValidator, loginSeller);
sellerRouter.route("/logout").post(verifySellerJWT, onlySellerAccess, logoutSeller);
sellerRouter.route("/refresh-token").post(refreshAccessToken);

// Test endpoint to verify routes are working
sellerRouter.get("/test", (req, res) => {
    res.json({ message: "Seller routes are working!", timestamp: new Date().toISOString() });
});

// Test offers endpoint
sellerRouter.post("/test-offer", verifySellerJWT, onlySellerAccess, (req, res) => {
  console.log('🔍 Test offer endpoint called with body:', req.body);
  res.json({ 
    message: "Test offer endpoint working!", 
    receivedData: req.body,
    sellerId: req.seller._id 
  });
});

// Testing endpoints for sellers to test drone bridge functionality
// These endpoints allow sellers to test delivery tracking, QR codes, and drone operations

// Test endpoint for sellers to see delivery tracking on map
sellerRouter.get('/test-delivery-map/:orderId', verifySellerJWT, onlySellerAccess, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id;
    
    // Verify seller owns this order
    const order = await Order.findById(orderId).populate('shops.shopId');
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if any shop in the order belongs to this seller
    const sellerShop = order.shops.find(shop => 
      shop.shopId && shop.shopId.sellerId && 
      shop.shopId.sellerId.toString() === sellerId.toString()
    );
    
    if (!sellerShop) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test orders from your shops' 
      });
    }
    
    // Get delivery information for map display
    const delivery = await Delivery.findOne({ 
      orderId, 
      shopId: sellerShop.shopId._id 
    });
    
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'No delivery found for this order' 
      });
    }
    
    // Return delivery data for map testing
    res.status(200).json({
      success: true,
      message: 'Seller delivery map test data retrieved',
      data: {
        orderId,
        shopId: sellerShop.shopId._id,
        shopName: sellerShop.shopId.name,
        deliveryStatus: delivery.status,
        currentLocation: delivery.currentLocation,
        route: delivery.route,
        estimatedDeliveryTime: delivery.etaMinutes,
        deliveryMode: delivery.deliveryMode,
        qrCode: delivery.qrCode,
        qrExpiry: delivery.qrExpiry,
        sellerId: sellerId
      }
    });
  } catch (error) {
    console.error('Seller delivery map test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve seller delivery map test data' 
    });
  }
});

// Test endpoint for sellers to test QR code generation
sellerRouter.post('/test-qr-generation/:orderId', verifySellerJWT, onlySellerAccess, async (req, res) => {
  try {
    const { orderId } = req.params;
    const sellerId = req.seller._id;
    
    // Verify seller owns this order
    const order = await Order.findById(orderId).populate('shops.shopId');
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if any shop in the order belongs to this seller
    const sellerShop = order.shops.find(shop => 
      shop.shopId && shop.shopId.sellerId && 
      shop.shopId.sellerId.toString() === sellerId.toString()
    );
    
    if (!sellerShop) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test orders from your shops' 
      });
    }
    
    // Generate a test QR code for the seller
    const qrCode = generateQRCode(orderId, sellerId, new Date().toISOString());
    const qrExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Find or create delivery
    let delivery = await Delivery.findOne({ 
      orderId, 
      shopId: sellerShop.shopId._id 
    });
    
    if (!delivery) {
      delivery = new Delivery({
        orderId,
        shopId: sellerShop.shopId._id,
        deliveryMode: 'drone',
        status: 'preparing',
        qrCode: qrCode,
        qrExpiry: qrExpiry,
        qrToken: qrCode
      });
    } else {
      delivery.qrCode = qrCode;
      delivery.qrExpiry = qrExpiry;
      delivery.qrToken = qrCode;
      delivery.status = 'preparing';
    }
    
    await delivery.save();
    
    res.status(200).json({
      success: true,
      message: 'Seller QR code generation test successful',
      data: {
        orderId,
        shopId: sellerShop.shopId._id,
        shopName: sellerShop.shopId.name,
        qrCode: qrCode,
        expiry: qrExpiry,
        delivery: delivery,
        sellerId: sellerId,
        message: 'QR code generated for testing purposes'
      }
    });
  } catch (error) {
    console.error('Seller QR generation test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate test QR code' 
    });
  }
});

// Test endpoint for sellers to simulate delivery updates
sellerRouter.post('/test-delivery-simulation/:orderId', verifySellerJWT, onlySellerAccess, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, etaMinutes } = req.body;
    const sellerId = req.seller._id;
    
    // Verify seller owns this order
    const order = await Order.findById(orderId).populate('shops.shopId');
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    // Check if any shop in the order belongs to this seller
    const sellerShop = order.shops.find(shop => 
      shop.shopId && shop.shopId.sellerId && 
      shop.shopId.sellerId.toString() === sellerId.toString()
    );
    
    if (!sellerShop) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test orders from your shops' 
      });
    }
    
    // Find delivery for testing
    let delivery = await Delivery.findOne({ 
      orderId, 
      shopId: sellerShop.shopId._id 
    });
    
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'No delivery found for this order' 
      });
    }
    
    // For testing purposes, create a simulation response
    // Don't actually update the database
    const simulatedDelivery = {
      ...delivery.toObject(),
      status: status || delivery.status,
      currentLocation: location || delivery.currentLocation,
      etaMinutes: etaMinutes || delivery.etaMinutes,
      simulated: true,
      simulationTimestamp: new Date()
    };
    
    res.status(200).json({
      success: true,
      message: 'Seller delivery simulation test successful',
      data: {
        orderId,
        shopId: sellerShop.shopId._id,
        shopName: sellerShop.shopId.name,
        simulatedDelivery,
        sellerId: sellerId,
        message: 'This is a simulation - no actual changes made to database',
        note: 'Use admin endpoints to make actual delivery updates'
      }
    });
  } catch (error) {
    console.error('Seller delivery simulation test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to simulate seller delivery' 
    });
  }
});

// Email verification routes
sellerRouter.route('/verify-email').post(checkAlreadyAuthenticated, verifyEmail);
sellerRouter.route('/resend-verification').post(checkAlreadyAuthenticated, resendVerificationCode);

// Profile routes
sellerRouter.get("/profile", verifySellerJWT, onlySellerAccess, getCurrentSeller);
sellerRouter.patch("/profile", verifySellerJWT, onlySellerAccess, updateSellerProfile);
sellerRouter.post("/change-password", verifySellerJWT, onlySellerAccess, changeCurrentPassword);

// Dashboard and stats
sellerRouter.get('/dashboard', verifySellerJWT, onlySellerAccess, getSellerDashboard);
sellerRouter.get('/home', verifySellerJWT, onlySellerAccess, getSellerHome);
sellerRouter.get('/stats', verifySellerJWT, onlySellerAccess, getSellerStats);

// Shop routes - Clean RESTful API
sellerRouter.get('/shops', verifySellerJWT, onlySellerAccess, getSellerShops);
sellerRouter.post('/shops', verifySellerJWT, onlySellerAccess, upload.single('image'), createShop);
sellerRouter.patch('/shops/:shopId', verifySellerJWT, onlySellerAccess, upload.single('image'), updateShop);
sellerRouter.delete('/shops/:shopId', verifySellerJWT, onlySellerAccess, deleteShop);

// Product routes
sellerRouter.get('/products', verifySellerJWT, onlySellerAccess, getSellerProducts);
sellerRouter.post('/products', verifySellerJWT, onlySellerAccess, upload.single('image'), createProduct);
sellerRouter.patch('/products/:productId', verifySellerJWT, onlySellerAccess, upload.single('image'), updateProduct);
sellerRouter.delete('/products/:productId', verifySellerJWT, onlySellerAccess, deleteProduct);

// Offer routes
sellerRouter.get('/offers', verifySellerJWT, onlySellerAccess, getSellerOffers);
sellerRouter.post('/offers', verifySellerJWT, onlySellerAccess, createOffer);
sellerRouter.patch('/offers/:offerId', verifySellerJWT, onlySellerAccess, updateOffer);
sellerRouter.delete('/offers/:offerId', verifySellerJWT, onlySellerAccess, deleteOffer);

// Order management routes
sellerRouter.get('/orders', verifySellerJWT, onlySellerAccess, getSellerOrders);
sellerRouter.patch('/orders/status', verifySellerJWT, onlySellerAccess, updateOrderStatus);

// Account management routes
sellerRouter.delete('/account', verifySellerJWT, onlySellerAccess, deleteSellerAccount);

export default sellerRouter;

