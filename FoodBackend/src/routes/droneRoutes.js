import express from 'express';
import multer from 'multer';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import { 
    createDroneOrder,
    getDroneOrderStatus,
    updateDroneOrderStatus,
    verifyQRCodeDelivery,
    getAllDroneOrders,
    cancelDroneDelivery,
    assignDrone,
    launchDrone,
    landDrone,
    returnDrone,
    emergencyStop,
    getDroneStatus,
    getDroneStatusByOrder,
    getAllDrones,
    callDroneToShop,
    checkDroneAvailability,
    fixDroneStatus,
    getFleetOverviewEnhanced,
    assignDroneIntelligent,
    webhookDroneLanded
} from '../controllers/droneController.js';
// Enhanced controller functions are now in the main droneController.js
import { DroneOrder } from '../models/droneOrderModel.js';
import DroneLog from '../models/droneLogModel.js';
import ulogProcessingService from '../services/ulogProcessingService.js';
import { getIo } from '../services/socket.js';
import { Drone } from '../models/droneModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const router = express.Router();

// Configure multer for log file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/logs/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.ulg');
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/octet-stream' || file.originalname.endsWith('.ulg')) {
            cb(null, true);
        } else {
            cb(new Error('Only .ulg files are allowed'), false);
        }
    }
});

// TEST ENDPOINTS - For testing real drone bridge functionality (not mock data)
// These endpoints use actual drone bridge commands for testing and simulation
if (process.env.NODE_ENV === 'development') {
  // Test endpoint for drone launch using real drone bridge
  router.post('/test/launch/:orderId', async (req, res) => {
    try {
      console.log('🧪 Testing real drone bridge: launch drone');
      const { orderId } = req.params;
      const { droneId, useRealOrder = false } = req.body;
      
      // Import required services for real drone bridge
      const { takeoff } = await import('../services/droneCommandService.js');
      const { DroneOrder } = await import('../models/droneOrderModel.js');
      const { Drone } = await import('../models/droneModel.js');
      
      let actualDroneId = droneId || 'DRONE-001';
      let actualOrderId = orderId;
      
      // If useRealOrder is true, try to find real order and drone
      if (useRealOrder) {
        console.log('🔍 Looking for real drone order:', orderId);
        
        // Find the drone order
        const droneOrder = await DroneOrder.findOne({ orderId });
        if (!droneOrder) {
          return res.status(404).json({
            success: false,
            message: 'Drone order not found',
            data: { orderId }
          });
        }
        
        if (!droneOrder.droneId) {
          return res.status(400).json({
            success: false,
            message: 'Order not assigned to a drone',
            data: { orderId, status: droneOrder.status }
          });
        }
        
        actualDroneId = droneOrder.droneId;
        actualOrderId = droneOrder.orderId;
        
        console.log('✅ Found real drone order:', {
          orderId: actualOrderId,
          droneId: actualDroneId,
          status: droneOrder.status
        });
        
        // Update drone status to in_flight using real drone bridge
        await Drone.findOneAndUpdate(
          { droneId: actualDroneId },
          { status: 'in_flight', altitude: 50 },
          { new: true }
        );
        
        // Update drone order status
        droneOrder.status = 'out_for_delivery';
        await droneOrder.save();
        
        console.log('📝 Updated drone and order status using real drone bridge');
      }
      
      // Send takeoff command to real Python drone bridge
      await takeoff(actualDroneId, actualOrderId);
      
      console.log('🚁 Real drone bridge takeoff command sent successfully');
      
      res.status(200).json({
        success: true,
        message: 'Real drone bridge takeoff command sent successfully',
        data: {
          droneId: actualDroneId,
          orderId: actualOrderId,
          command: 'takeoff',
          useRealOrder,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('🧪 Real drone bridge test error:', error);
      res.status(500).json({
        success: false,
        message: 'Real drone bridge test error',
        error: error.message
      });
    }
  });

  // Test endpoint for land command using real drone bridge
  router.post('/test/land/:droneId', async (req, res) => {
    try {
      console.log('🧪 Testing real drone bridge: land drone');
      const { droneId } = req.params;
      const { useRealOrder = false } = req.body;
      
      // Import required services for real drone bridge
      const { land } = await import('../services/droneCommandService.js');
      const { Drone } = await import('../models/droneModel.js');
      const { DroneAssignment } = await import('../models/droneAssignmentModel.js');
      
      let actualDroneId = droneId;
      
      // If useRealOrder is true, verify drone exists and update status
      if (useRealOrder) {
        console.log('🔍 Looking for real drone:', droneId);
        
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
          return res.status(404).json({
            success: false,
            message: 'Drone not found',
            data: { droneId }
          });
        }
        
        console.log('✅ Found real drone:', {
          droneId: drone.droneId,
          status: drone.status
        });
        
        // Update drone status to landed using real drone bridge
        await Drone.findOneAndUpdate(
          { droneId },
          { status: 'landed', altitude: 0 },
          { new: true }
        );
        
        // Update drone assignment status
        await DroneAssignment.findOneAndUpdate(
          { droneId, status: 'assigned' },
          { $set: { status: 'released', releasedAt: new Date() } }
        );
        
        console.log('📝 Updated drone status to landed using real drone bridge');
      }
      
      // Send land command to real Python drone bridge
      await land(actualDroneId);
      
      console.log('🚁 Real drone bridge land command sent successfully');
      
      res.status(200).json({
        success: true,
        message: 'Real drone bridge land command sent successfully',
        data: {
          droneId: actualDroneId,
          command: 'land',
          useRealOrder,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('🧪 Real drone bridge test error:', error);
      res.status(500).json({
        success: false,
        message: 'Real drone bridge test error',
        error: error.message
      });
    }
  });

  // Test endpoint for emergency stop using real drone bridge
  router.post('/test/emergency-stop/:droneId', async (req, res) => {
    try {
      console.log('🧪 Testing real drone bridge: emergency stop');
      const { droneId } = req.params;
      const { useRealOrder = false } = req.body;
      
      // Import required services for real drone bridge
      const { emergencyStop } = await import('../services/droneCommandService.js');
      const { Drone } = await import('../models/droneModel.js');
      const { DroneOrder } = await import('../models/droneOrderModel.js');
      
      let actualDroneId = droneId;
      
      // If useRealOrder is true, verify drone exists and update status
      if (useRealOrder) {
        console.log('🔍 Looking for real drone:', droneId);
        
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
          return res.status(404).json({
            success: false,
            message: 'Drone not found',
            data: { droneId }
          });
        }
        
        console.log('✅ Found real drone:', {
          droneId: drone.droneId,
          status: drone.status
        });
        
        // Update drone status to stopped using real drone bridge
        await Drone.findOneAndUpdate(
          { droneId },
          { status: 'stopped', altitude: 0 },
          { new: true }
        );
        
        // Find and update associated drone order if exists
        const droneOrder = await DroneOrder.findOne({ droneId });
        if (droneOrder) {
          console.log('📝 Found associated drone order:', droneOrder.orderId);
        }
        
        console.log('📝 Updated drone status to stopped using real drone bridge');
      }
      
      // Send emergency stop command to real Python drone bridge
      await emergencyStop(actualDroneId);
      
      console.log('🚁 Real drone bridge emergency stop command sent successfully');
      
      res.status(200).json({
        success: true,
        message: 'Real drone bridge emergency stop command sent successfully',
        data: {
          droneId: actualDroneId,
          command: 'emergency_stop',
          useRealOrder,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('🧪 Real drone bridge test error:', error);
      res.status(500).json({
        success: false,
        message: 'Real drone bridge test error',
        error: error.message
      });
    }
  });

  // Test endpoint for assigning drone to order using real drone bridge
  router.post('/test/assign/:orderId', async (req, res) => {
    try {
      console.log('🧪 Testing real drone bridge: assign drone to order');
      const { orderId } = req.params;
      const { droneId, useRealOrder = false } = req.body;
      
      // Import required services for real drone bridge
      const { assignOrder } = await import('../services/droneCommandService.js');
      const { DroneOrder } = await import('../models/droneOrderModel.js');
      const { Drone } = await import('../models/droneModel.js');
      const { DroneAssignment } = await import('../models/droneAssignmentModel.js');
      
      let actualDroneId = droneId || 'DRONE-001';
      let actualOrderId = orderId;
      
      // If useRealOrder is true, try to find real order and assign drone
      if (useRealOrder) {
        console.log('🔍 Looking for real drone order:', orderId);
        
        // Find the drone order
        const droneOrder = await DroneOrder.findOne({ orderId });
        if (!droneOrder) {
          return res.status(404).json({
            success: false,
            message: 'Drone order not found',
            data: { orderId }
          });
        }
        
        // Find an available drone
        const availableDrone = await Drone.findOneAndUpdate(
          { status: 'idle' },
          { status: 'assigned' },
          { new: true }
        );
        
        if (!availableDrone) {
          return res.status(409).json({
            success: false,
            message: 'No available drones',
            data: { orderId }
          });
        }
        
        actualDroneId = availableDrone.droneId;
        actualOrderId = droneOrder.orderId;
        
        console.log('✅ Found real drone order and assigned drone:', {
          orderId: actualOrderId,
          droneId: actualDroneId,
          status: droneOrder.status
        });
        
        // Update drone order with assigned drone
        droneOrder.droneId = actualDroneId;
        droneOrder.status = 'assigned';
        await droneOrder.save();
        
        // Create or update drone assignment
        await DroneAssignment.findOneAndUpdate(
          { orderId },
          { $set: { droneId: actualDroneId, status: 'assigned', releasedAt: null } },
          { new: true, upsert: true }
        );
        
        console.log('📝 Updated drone order and assignment using real drone bridge');
      }
      
      // Send assignment command to real Python drone bridge
      await assignOrder(
        actualDroneId,
        actualOrderId,
        { lat: 28.6139, lng: 77.2090 }, // Default pickup location
        { lat: 28.6140, lng: 77.2091 }  // Default delivery location
      );
      
      console.log('🚁 Real drone bridge assignment command sent successfully');
      
      res.status(200).json({
        success: true,
        message: 'Real drone bridge drone assigned successfully',
        data: {
          droneId: actualDroneId,
          orderId: actualOrderId,
          command: 'assign_order',
          useRealOrder,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('🧪 Real drone bridge test error:', error);
      res.status(500).json({
        success: false,
        message: 'Real drone bridge test error',
        error: error.message
      });
    }
  });
}

// Apply JWT verification for user endpoints by default
router.use(verifyJWT);

// ==================== USER DRONE TRACKING ROUTES ====================
// Get user's active drone deliveries
router.get('/user/active-deliveries', async (req, res) => {
    try {
        const userId = req.user._id;
        
        const activeDeliveries = await DroneOrder.find({
            userId,
            status: { $in: ['assigned', 'preparing', 'ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery'] }
        })
        .populate('droneId', 'droneId name model status location battery')
        .populate('sellerId', 'name')
        .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: {
                activeDeliveries: activeDeliveries.map(delivery => ({
                    _id: delivery._id,
                    orderId: delivery.orderId,
                    status: delivery.status,
                    deliveryProgress: delivery.deliveryProgress,
                    estimatedDeliveryTime: delivery.timing.estimatedDeliveryTime,
                    location: delivery.location,
                    drone: delivery.droneId ? {
                        droneId: delivery.droneId.droneId,
                        name: delivery.droneId.name,
                        status: delivery.droneId.status,
                        location: delivery.droneId.location,
                        battery: delivery.droneId.battery
                    } : null,
                    seller: delivery.sellerId ? {
                        name: delivery.sellerId.name
                    } : null
                }))
            },
            message: 'Active drone deliveries retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve active deliveries',
            error: error.message
        });
    }
});

// Get user's drone delivery history
router.get('/user/history', async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;
        
        const completedDeliveries = await DroneOrder.find({
            userId,
            status: { $in: ['delivered', 'failed', 'cancelled'] }
        })
        .populate('droneId', 'droneId name model')
        .populate('sellerId', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
        
        const total = await DroneOrder.countDocuments({
            userId,
            status: { $in: ['delivered', 'failed', 'cancelled'] }
        });
        
        res.status(200).json({
            success: true,
            data: {
                deliveries: completedDeliveries.map(delivery => ({
                    _id: delivery._id,
                    orderId: delivery.orderId,
                    status: delivery.status,
                    createdAt: delivery.createdAt,
                    deliveredAt: delivery.timing.actualDeliveryTime,
                    totalPrice: delivery.pricing.totalPrice,
                    drone: delivery.droneId ? {
                        droneId: delivery.droneId.droneId,
                        name: delivery.droneId.name
                    } : null,
                    seller: delivery.sellerId ? {
                        name: delivery.sellerId.name
                    } : null
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            },
            message: 'Drone delivery history retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve delivery history',
            error: error.message
        });
    }
});

// ==================== SELLER DRONE COORDINATION ROUTES ====================
// Get seller's pending drone orders
router.get('/seller/pending-orders', async (req, res) => {
    try {
        // Verify seller JWT
        await new Promise((resolve, reject) => verifySellerJWT(req, res, (err) => err ? reject(err) : resolve()));
        
        const sellerId = req.seller._id;
        
        const pendingOrders = await DroneOrder.find({
            sellerId,
            status: { $in: ['pending', 'weather_blocked'] }
        })
        .populate('userId', 'name email')
        .populate('droneId', 'droneId name model status')
        .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: {
                pendingOrders: pendingOrders.map(order => ({
                    _id: order._id,
                    orderId: order.orderId,
                    status: order.status,
                    createdAt: order.createdAt,
                    customer: order.userId ? {
                        name: order.userId.name,
                        email: order.userId.email
                    } : null,
                    drone: order.droneId ? {
                        droneId: order.droneId.droneId,
                        name: order.droneId.name,
                        status: order.droneId.status
                    } : null,
                    location: order.location,
                    estimatedPickupTime: order.timing.estimatedPickupTime
                }))
            },
            message: 'Pending drone orders retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve pending orders',
            error: error.message
        });
    }
});

// Get seller's active drone deliveries
router.get('/seller/active-deliveries', async (req, res) => {
    try {
        // Verify seller JWT
        await new Promise((resolve, reject) => verifySellerJWT(req, res, (err) => err ? reject(err) : resolve()));
        
        const sellerId = req.seller._id;
        
        const activeDeliveries = await DroneOrder.find({
            sellerId,
            status: { $in: ['assigned', 'preparing', 'ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery'] }
        })
        .populate('userId', 'name email')
        .populate('droneId', 'droneId name model status location battery')
        .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: {
                activeDeliveries: activeDeliveries.map(delivery => ({
                    _id: delivery._id,
                    orderId: delivery.orderId,
                    status: delivery.status,
                    createdAt: delivery.createdAt,
                    customer: delivery.userId ? {
                        name: delivery.userId.name,
                        email: delivery.userId.email
                    } : null,
                    drone: delivery.droneId ? {
                        droneId: delivery.droneId.droneId,
                        name: delivery.droneId.name,
                        status: delivery.droneId.status,
                        location: delivery.droneId.location,
                        battery: delivery.droneId.battery
                    } : null,
                    location: delivery.location,
                    estimatedDeliveryTime: delivery.timing.estimatedDeliveryTime,
                    deliveryProgress: delivery.deliveryProgress
                }))
            },
            message: 'Active drone deliveries retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve active deliveries',
            error: error.message
        });
    }
});

// Create drone delivery order
router.post('/create', createDroneOrder);

// Get drone order status
router.get('/status-by-order/:orderId', getDroneOrderStatus);

// Update drone order status (admin/seller)
router.patch('/update/:droneOrderId', async (req, res, next) => {
  try {
    await new Promise((resolve, reject) => verifySellerJWT(req, res, (err) => err ? reject(err) : resolve()));
    return next();
  } catch (_) {}
  try {
    await new Promise((resolve, reject) => verifyAdminJWT(req, res, (err) => err ? reject(err) : resolve()));
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
  }
}, updateDroneOrderStatus);

// Verify QR code at delivery
router.post('/verify-qr', verifyQRCodeDelivery);

// Cancel drone delivery
router.post('/cancel/:droneOrderId', cancelDroneDelivery);

// Admin routes
router.get('/admin/all', (req, res, next) => verifyAdminJWT(req, res, next), getAllDroneOrders);
router.get('/admin/drones', (req, res, next) => verifyAdminJWT(req, res, next), getAllDrones);

// Get drone fleet overview
router.get('/admin/fleet-overview', (req, res, next) => verifyAdminJWT(req, res, next), async (req, res) => {
    try {
        const totalDrones = await Drone.countDocuments();
        const operationalDrones = await Drone.countDocuments({ operationalStatus: 'operational' });
        const maintenanceDrones = await Drone.countDocuments({ operationalStatus: 'maintenance_required' });
        const emergencyDrones = await Drone.countDocuments({ operationalStatus: 'emergency' });
        const inFlightDrones = await Drone.countDocuments({ status: { $in: ['in_flight', 'delivering', 'returning'] } });

        const batteries = await Drone.find({}).select('battery');
        const avgBattery = batteries.length ? batteries.reduce((s, d) => s + (d.battery || 0), 0) / batteries.length : 0;

        const healthDocs = await Drone.find({}).select('maintenance.healthScore');
        const avgHealthScore = healthDocs.length ? healthDocs.reduce((s, d) => s + (d.maintenance?.healthScore || 100), 0) / healthDocs.length : 0;

        const recentDeliveries = await DroneOrder.find({ status: 'delivered' })
            .sort({ 'timing.actualDeliveryTime': -1 })
            .limit(5)
            .select('orderId timing.actualDeliveryTime');

        res.status(200).json(new ApiResponse(200, {
            fleet: {
                totalDrones,
                operationalDrones,
                maintenanceDrones,
                emergencyDrones,
                inFlightDrones,
                avgBattery,
                avgHealthScore
            },
            recentDeliveries
        }, 'Fleet overview retrieved successfully'));
    } catch (error) {
        console.error('Fleet overview error:', error);
        res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve fleet overview'));
    }
});

// Get drones needing maintenance
router.get('/admin/maintenance-needed', (req, res, next) => verifyAdminJWT(req, res, next), async (req, res) => {
    try {
        const maintenanceDrones = await Drone.find({
            $or: [
                { 'maintenance.healthScore': { $lt: 70 } },
                { 'maintenance.lastMaintenance': { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
                { 'maintenance.totalFlightHours': { $gt: 100 } }
            ]
        })
        .select('droneId name model status maintenance.location')
        .sort({ 'maintenance.healthScore': 1 });
        
        res.status(200).json({
            success: true,
            data: {
                maintenanceDrones: maintenanceDrones.map(drone => ({
                    _id: drone._id,
                    droneId: drone.droneId,
                    name: drone.name,
                    model: drone.model,
                    status: drone.status,
                    healthScore: drone.maintenance.healthScore,
                    lastMaintenance: drone.maintenance.lastMaintenance,
                    totalFlightHours: drone.maintenance.totalFlightHours,
                    location: drone.location
                }))
            },
            message: 'Maintenance drones retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve maintenance drones',
            error: error.message
        });
    }
});

// Assignment & control endpoints
router.post('/assign/:orderId', (req, res, next) => verifyAdminJWT(req, res, next), assignDrone);
router.post('/launch/:orderId', (req, res, next) => verifyAdminJWT(req, res, next), launchDrone);
router.post('/land/:droneId', (req, res, next) => verifyAdminJWT(req, res, next), landDrone);
router.post('/return/:droneId', (req, res, next) => verifyAdminJWT(req, res, next), returnDrone);
router.post('/emergency-stop/:droneId', (req, res, next) => verifyAdminJWT(req, res, next), emergencyStop);
router.get('/status/:droneId', (req, res, next) => verifyAdminJWT(req, res, next), getDroneStatus);
// Alias for clarity
router.get('/status-by-drone/:droneId', (req, res, next) => verifyAdminJWT(req, res, next), getDroneStatus);

// User-safe telemetry by order
router.get('/status-by-order/:orderId', verifyJWT, getDroneStatusByOrder);

// Seller endpoint to call drone to shop
router.post('/call-to-shop', (req, res, next) => verifySellerJWT(req, res, next), callDroneToShop);

// Check drone availability
router.get('/availability', checkDroneAvailability);

// Fix drone status (temporary)
router.post('/fix-status', fixDroneStatus);

// Webhook from drone bridge (landing confirmation)
router.post('/webhook/landed', webhookDroneLanded);

// ==================== REAL-TIME DRONE TRACKING ROUTES ====================
// Update drone telemetry (requires authentication)
router.post('/telemetry/update', async (req, res) => {
    try {
        const { droneId, location, battery, altitude, speed, heading, status } = req.body;
        
        if (!droneId) {
            return res.status(400).json({
                success: false,
                message: 'Drone ID is required'
            });
        }
        
        const updatedDrone = await Drone.findOneAndUpdate(
            { droneId },
            {
                $set: {
                    location,
                    battery,
                    altitude,
                    speed,
                    heading,
                    status,
                    'telemetry.lastUpdate': new Date()
                }
            },
            { new: true }
        );
        
        if (!updatedDrone) {
            return res.status(404).json({
                success: false,
                message: 'Drone not found'
            });
        }
        
        // Emit real-time update via Socket.IO if available
        try {
            const io = getIo();
            if (io) {
                io.to(`drone:${droneId}`).emit('telemetry:update', {
                    droneId,
                    location,
                    battery,
                    altitude,
                    speed,
                    heading,
                    status,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            data: {
                droneId,
                location,
                battery,
                altitude,
                speed,
                heading,
                status,
                timestamp: new Date().toISOString()
            },
            message: 'Telemetry updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update telemetry',
            error: error.message
        });
    }
});

// Get real-time drone locations (public for authenticated users)
router.get('/telemetry/locations', async (req, res) => {
    try {
        const drones = await Drone.find({
            status: { $in: ['in_flight', 'assigned', 'preparing'] }
        })
        .select('droneId name model status location battery altitude speed heading')
        .limit(50);
        
        res.status(200).json({
            success: true,
            data: {
                drones: drones.map(drone => ({
                    droneId: drone.droneId,
                    name: drone.name,
                    model: drone.model,
                    status: drone.status,
                    location: drone.location,
                    battery: drone.battery,
                    altitude: drone.altitude,
                    speed: drone.speed,
                    heading: drone.heading
                }))
            },
            message: 'Real-time drone locations retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve drone locations',
            error: error.message
        });
    }
});

// ============================================================================
// DIRECT DRONE CONTROL ENDPOINTS FOR TESTING SCRIPT
// These endpoints match the PowerShell testing script requirements
// NO AUTHENTICATION REQUIRED FOR TESTING
// ============================================================================

// Launch drone by droneId (for testing)
router.post('/launch/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        const { altitude = 20 } = req.body;
        
        console.log(`🚁 Testing: Launch drone ${droneId} to altitude ${altitude}m`);
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId },
            { 
                status: 'in_flight',
                altitude: altitude,
                'telemetry.lastUpdate': new Date()
            }
        );
        
        // Emit takeoff event via Socket.IO
        try {
            const io = getIo();
            if (io) {
                io.emit('drone:takeoff', {
                    droneId,
                    altitude,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            message: `Drone ${droneId} launched to ${altitude}m altitude`,
            data: { droneId, altitude, status: 'in_flight' }
        });
    } catch (error) {
        console.error('Launch drone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to launch drone',
            error: error.message
        });
    }
});

// Land drone by droneId (for testing)
router.post('/land/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        
        console.log(`🛬 Testing: Land drone ${droneId}`);
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId },
            { 
                status: 'landing',
                altitude: 0,
                'telemetry.lastUpdate': new Date()
            }
        );
        
        // Emit landing event via Socket.IO
        try {
            const io = getIo();
            if (io) {
                io.emit('drone:landing', {
                    droneId,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            message: `Drone ${droneId} landing initiated`,
            data: { droneId, status: 'landing' }
        });
    } catch (error) {
        console.error('Land drone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to land drone',
            error: error.message
        });
    }
});

// Return to launch (RTL) for drone by droneId (for testing)
router.post('/rtl/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        
        console.log(`🏠 Testing: Return to launch for drone ${droneId}`);
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId },
            { 
                status: 'returning',
                'telemetry.lastUpdate': new Date()
            }
        );
        
        // Emit RTL event via Socket.IO
        try {
            const io = getIo();
            if (io) {
                io.emit('drone:rtl', {
                    droneId,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            message: `Drone ${droneId} returning to launch`,
            data: { droneId, status: 'returning' }
        });
    } catch (error) {
        console.error('RTL drone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate RTL',
            error: error.message
        });
    }
});

// Emergency stop for drone by droneId (for testing)
router.post('/emergency/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        
        console.log(`🛑 Testing: Emergency stop for drone ${droneId}`);
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId },
            { 
                status: 'emergency_stop',
                'telemetry.lastUpdate': new Date()
            }
        );
        
        // Emit emergency stop event via Socket.IO
        try {
            const io = getIo();
            if (io) {
                io.emit('drone:emergency_stop', {
                    droneId,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            message: `Emergency stop initiated for drone ${droneId}`,
            data: { droneId, status: 'emergency_stop' }
        });
    } catch (error) {
        console.error('Emergency stop drone error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate emergency stop',
            error: error.message
        });
    }
});

// Get drone status by droneId (for testing)
router.get('/status/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        
        console.log(`📊 Testing: Get status for drone ${droneId}`);
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                droneId: drone.droneId,
                status: drone.status,
                battery: drone.battery || 100,
                altitude: drone.altitude || 0,
                latitude: drone.location?.coordinates?.[1] || 47.6414678,
                longitude: drone.location?.coordinates?.[0] || -122.1401649,
                speed: drone.speed || 0,
                heading: drone.heading || 0
            },
            message: `Drone ${droneId} status retrieved successfully`
        });
    } catch (error) {
        console.error('Get drone status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get drone status',
            error: error.message
        });
    }
});

// Start mission for drone by droneId (for testing)
router.post('/mission/start/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        const { mission_id, waypoints } = req.body;
        
        console.log(`🎯 Testing: Start mission for drone ${droneId}`, { mission_id, waypoints });
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            return res.status(404).json({
                success: false,
                message: `Drone ${droneId} not found`
            });
        }
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId },
            { 
                status: 'mission',
                'telemetry.lastUpdate': new Date()
            }
        );
        
        // Emit mission start event via Socket.IO
        try {
            const io = getIo();
            if (io) {
                io.emit('drone:mission_start', {
                    droneId,
                    mission_id,
                    waypoints,
                    timestamp: new Date().toISOString()
                });
            }
        } catch {}
        
        res.status(200).json({
            success: true,
            message: `Mission started for drone ${droneId}`,
            data: { 
                droneId, 
                mission_id, 
                waypoints,
                status: 'mission' 
            }
        });
    } catch (error) {
        console.error('Start mission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start mission',
            error: error.message
        });
    }
});

// Log upload endpoint
router.post('/logs/upload', upload.single('log'), async (req, res) => {
    try {
        const { droneId } = req.body;
        const logFile = req.file;

        if (!logFile) {
            return res.status(400).json({
                success: false,
                message: 'No log file provided'
            });
        }

        if (!droneId) {
            return res.status(400).json({
                success: false,
                message: 'Drone ID is required'
            });
        }

        // Save log metadata to database
        const logEntry = new DroneLog({
            droneId,
            filename: logFile.filename,
            originalName: logFile.originalname,
            path: logFile.path,
            size: logFile.size,
            uploadedAt: new Date(),
            processing: { status: 'pending' }
        });

        await logEntry.save();

        console.log(`📁 Log uploaded for drone ${droneId}: ${logFile.filename}`);

        // Trigger async processing (fire-and-forget)
        try { ulogProcessingService.processLog(logEntry._id).catch(() => {}); } catch {}

        res.status(200).json({
            success: true,
            message: 'Log uploaded successfully; processing started',
            data: {
                logId: logEntry._id,
                droneId,
                filename: logFile.filename,
                size: logFile.size,
                processingStatus: 'processing'
            }
        });

    } catch (error) {
        console.error('Log upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload log',
            error: error.message
        });
    }
});

// Get logs for a drone
router.get('/logs/:droneId', async (req, res) => {
    try {
        const { droneId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const logs = await DroneLog.find({ droneId })
            .sort({ uploadedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await DroneLog.countDocuments({ droneId });

        res.status(200).json({
            success: true,
            data: {
                logs: logs.map(l => ({
                    _id: l._id,
                    droneId: l.droneId,
                    filename: l.filename,
                    originalName: l.originalName,
                    uploadedAt: l.uploadedAt,
                    size: l.size,
                    processing: l.processing,
                    reports: (l.reports || []).map(r => ({
                        type: r.type,
                        title: r.title,
                        url: r.path,
                        size: r.size,
                        createdAt: r.createdAt
                    }))
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get logs',
            error: error.message
        });
    }
});

// Get single log with reports (admin/testing)
router.get('/logs/detail/:logId', async (req, res) => {
    try {
        const { logId } = req.params;
        const log = await DroneLog.findById(logId);
        if (!log) {
            return res.status(404).json({ success: false, message: 'Log not found' });
        }
        res.status(200).json({
            success: true,
            data: {
                _id: log._id,
                droneId: log.droneId,
                filename: log.filename,
                originalName: log.originalName,
                uploadedAt: log.uploadedAt,
                size: log.size,
                processing: log.processing,
                reports: (log.reports || []).map(r => ({
                    type: r.type,
                    title: r.title,
                    url: r.path,
                    size: r.size,
                    createdAt: r.createdAt
                }))
            }
        });
    } catch (error) {
        console.error('Get log detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to get log detail', error: error.message });
    }
});

// Get monitoring metrics
router.get('/monitoring/metrics', async (req, res) => {
    try {
        // This would typically fetch from drone bridge monitoring service
        // For now, return mock data structure
        const metrics = {
            missions_completed: 15,
            missions_failed: 2,
            collisions_detected: 1,
            battery_low_events: 3,
            weather_blocks: 5,
            qr_scans_successful: 12,
            qr_scans_failed: 1,
            photos_captured: 13,
            rtl_events: 4,
            emergency_stops: 0,
            uptime_start: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
            last_updated: new Date().toISOString()
        };

        res.status(200).json({
            success: true,
            data: metrics
        });

    } catch (error) {
        console.error('Get monitoring metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring metrics',
            error: error.message
        });
    }
});

// Get monitoring events
router.get('/monitoring/events', async (req, res) => {
    try {
        const { droneId, eventType, limit = 100 } = req.query;

        // This would typically fetch from drone bridge monitoring service
        // For now, return mock data structure
        const events = [
            {
                timestamp: new Date().toISOString(),
                event_type: 'mission_completed',
                drone_id: droneId || 'Drone1',
                severity: 'info',
                data: { mission_id: 'M001', waypoints: 3 }
            },
            {
                timestamp: new Date(Date.now() - 300000).toISOString(),
                event_type: 'battery_low',
                drone_id: droneId || 'Drone1',
                severity: 'warning',
                data: { battery_percent: 18, threshold: 20 }
            }
        ];

        res.status(200).json({
            success: true,
            data: {
                events: events.slice(0, parseInt(limit)),
                total: events.length
            }
        });

    } catch (error) {
        console.error('Get monitoring events error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring events',
            error: error.message
        });
    }
});

// Enhanced fleet management endpoints
router.get('/admin/fleet-overview-enhanced', (req, res, next) => verifyAdminJWT(req, res, next), getFleetOverviewEnhanced);

// Enhanced intelligent assignment
router.post('/assign/intelligent', (req, res, next) => verifyAdminJWT(req, res, next), assignDroneIntelligent);

// (Removed) Admin-only backfill endpoint per request

export default router;
