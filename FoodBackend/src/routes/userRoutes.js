import { Router } from 'express';
const userRouter =  Router();
import { loginUser, logoutUser, refreshAccessToken, registerUser,verifyEmail,forgotPassword,resetPassword,getDeviceDetails,viewProfile,loadEditProfile,updateEditProfile,getTopProducts ,loadHome, listShops, getShopById, getProductsByShop, listUserOrders, listUserOrderHistory, createOrder, resendVerificationCode, archiveCompletedOrders} from '../controllers/userController.js';
import { getPageBySlug } from '../controllers/staticPageController.js';
import  Order  from '../models/ordersModel.js';
import { Delivery } from '../models/deliveryModel.js';
import {upload} from "../middlewares/multerMiddleware.js"
import {verifyJWT, checkAlreadyAuthenticated} from '../middlewares/authMiddleware.js';
import { registerValidator,loginValidator,resetPasswordValidator ,forgetPasswordValidator,updateUserValidator, orderCreateValidator} from '../utils/validator.js'
import { markDeprecated } from '../middlewares/deprecationMiddleware.js';
import { loginRateLimiter, signupRateLimiter, passwordResetRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import { accountLockoutMiddleware } from '../middlewares/accountLockoutMiddleware.js';

// Authentication routes - protected from already authenticated users
userRouter.route("/register").post(checkAlreadyAuthenticated, signupRateLimiter, registerValidator, registerUser);
userRouter.route("/login").post(checkAlreadyAuthenticated, loginRateLimiter, accountLockoutMiddleware, loginValidator, loginUser);
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshAccessToken);
userRouter.route('/device-info').get(getDeviceDetails);
userRouter.route('/verify-email').post(checkAlreadyAuthenticated, verifyEmail);
userRouter.route('/resend-verification').post(checkAlreadyAuthenticated, resendVerificationCode);
userRouter.route('/forgot-password').post(checkAlreadyAuthenticated, passwordResetRateLimiter, forgetPasswordValidator, forgotPassword);
userRouter.route('/reset-password/:token').post(checkAlreadyAuthenticated, resetPasswordValidator, resetPassword);


userRouter.get("/profile",verifyJWT,viewProfile)
userRouter.get("/viewProfile",verifyJWT,viewProfile) // Keep for backward compatibility
userRouter.get("/edit-profile",verifyJWT,loadEditProfile)
userRouter.post("/update-profile",verifyJWT, upload.single('image'),updateUserValidator,updateEditProfile)

userRouter.get('/home', verifyJWT,loadHome);




userRouter.get('/topproduct', verifyJWT,getTopProducts);

// Dev-only middleware removed - Only real functionality is supported

// Test endpoint removed - Only real functionality is supported

// Testing endpoints for users to test drone bridge functionality
// These endpoints allow users to test map display, QR codes, and delivery simulation

// Test endpoint for users to see delivery tracking on map
userRouter.get('/test-delivery-map/:orderId', verifyJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    
    // Verify user owns this order
    const order = await Order.findById(orderId);
    if (!order || order.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test your own orders' 
      });
    }
    
    // Get delivery information for map display
    const delivery = await Delivery.findOne({ orderId });
    
    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'No delivery found for this order' 
      });
    }
    
    // Return delivery data for map testing
    res.status(200).json({
      success: true,
      message: 'Delivery map test data retrieved',
      data: {
        orderId,
        deliveryStatus: delivery.status,
        currentLocation: delivery.currentLocation,
        route: delivery.route,
        estimatedDeliveryTime: delivery.etaMinutes,
        deliveryMode: delivery.deliveryMode,
        qrCode: delivery.qrCode,
        qrExpiry: delivery.qrExpiry
      }
    });
  } catch (error) {
    console.error('Delivery map test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve delivery map test data' 
    });
  }
});

// Test endpoint for users to test QR code verification
userRouter.post('/test-qr-verification', verifyJWT, async (req, res) => {
  try {
    const { qrCode, orderId } = req.body;
    const userId = req.user._id;
    
    if (!qrCode || !orderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR code and order ID are required' 
      });
    }
    
    // Verify user owns this order
    const order = await Order.findById(orderId);
    if (!order || order.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test your own orders' 
      });
    }
    
    // Find delivery
    const delivery = await Delivery.findOne({ 
      orderId, 
      qrCode,
      deliveryMode: 'drone'
    });
    
    if (!delivery) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid QR code for this order' 
      });
    }
    
    // Check if QR code is expired
    if (delivery.qrExpiry && new Date() > delivery.qrExpiry) {
      return res.status(400).json({ 
        success: false, 
        message: 'QR code has expired' 
      });
    }
    
    // Check if already delivered
    if (delivery.status === 'delivered') {
      return res.status(400).json({ 
        success: false, 
        message: 'This delivery has already been completed' 
      });
    }
    
    // For testing purposes, don't actually mark as delivered
    // Just return success response
    res.status(200).json({
      success: true,
      message: 'QR code verification test successful',
      data: {
        orderId,
        deliveryId: delivery._id,
        qrCode,
        status: delivery.status,
        deliveryMode: delivery.deliveryMode,
        message: 'This is a test verification - delivery not actually completed'
      }
    });
  } catch (error) {
    console.error('QR verification test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test QR verification' 
    });
  }
});

// Test endpoint for users to simulate delivery updates
userRouter.post('/test-delivery-simulation/:orderId', verifyJWT, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, location, etaMinutes } = req.body;
    const userId = req.user._id;
    
    // Verify user owns this order
    const order = await Order.findById(orderId);
    if (!order || order.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only test your own orders' 
      });
    }
    
    // Find or create delivery for testing
    let delivery = await Delivery.findOne({ orderId });
    
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
      message: 'Delivery simulation test successful',
      data: {
        orderId,
        simulatedDelivery,
        message: 'This is a simulation - no actual changes made to database',
        note: 'Use admin endpoints to make actual delivery updates'
      }
    });
  } catch (error) {
    console.error('Delivery simulation test error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to simulate delivery' 
    });
  }
});

// Public static pages (no auth needed)
userRouter.get('/pages/:slug', getPageBySlug);

// User shop endpoints
userRouter.get('/shops', verifyJWT, listShops);
userRouter.get('/shops/:shopId', verifyJWT, getShopById);
userRouter.get('/shops/:shopId/products', verifyJWT, getProductsByShop);

// User orders endpoints (REST primary)
import { getUserOrderById, cancelUserOrder, deleteSelfAccount } from '../controllers/userController.js';
userRouter.get('/orders', verifyJWT, listUserOrders);
userRouter.get('/orders/:id', verifyJWT, getUserOrderById);
userRouter.post('/orders', verifyJWT, orderCreateValidator, createOrder);
userRouter.patch('/orders/:id/cancel', verifyJWT, cancelUserOrder);
userRouter.post('/orders/archive-completed', verifyJWT, archiveCompletedOrders);
// Test endpoint removed - Only real functionality is supported
// Legacy
userRouter.get('/order-history', markDeprecated('Use GET /orders for active and history consolidated'), verifyJWT, listUserOrderHistory);

// Self delete
userRouter.delete('/delete-account', verifyJWT, deleteSelfAccount);

// Offers routes
import { getActiveOffers, getShopOffers } from '../controllers/offersController.js';
userRouter.get('/offers', verifyJWT, getActiveOffers);
userRouter.get('/shops/:shopId/offers', verifyJWT, getShopOffers);

export default userRouter;

