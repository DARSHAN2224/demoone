import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { DroneOrder } from '../models/droneOrderModel.js';
import { Drone } from '../models/droneModel.js';
import { DroneAssignment } from '../models/droneAssignmentModel.js';
import { Shop } from '../models/shopModel.js';
import { Notification } from '../models/notificationModel.js';
import { Admin } from '../models/adminModel.js';
import  Order  from '../models/ordersModel.js';
import DroneLog from '../models/droneLogModel.js';
import { generateQRCode, verifyQRCode } from '../utils/qrCodeGenerator.js';
import { checkWeatherConditions } from '../utils/weatherAPI.js';
import { logDroneEvent } from '../utils/auditLogger.js';
import { getIo } from '../services/socket.js';
import { calculateOptimalPath, updatePathInRealTime } from '../utils/navigationUtils.js';
import sendCommand  from '../services/droneCommandService.js';
import { weatherIntegrationService } from '../services/weatherIntegrationService.js';

// Helper function to create notifications (normalized to match notificationModel enums)
const createNotification = async ({ userId, userModel, type, title, message, metadata }) => {
    try {
        // Map incoming app-specific types to model-allowed enums and categories
        const allowedTypes = ['success', 'error', 'warning', 'info', 'order', 'delivery', 'payment', 'system', 'promotion'];
        let finalType = 'info';
        let category = 'general';

        switch (type) {
            case 'order_status':
            case 'order_update':
                finalType = 'order';
                category = 'order_update';
                break;
            case 'payment_update':
                finalType = 'payment';
                category = 'payment_confirmation';
                break;
            case 'drone_assigned':
            case 'drone_launched':
            case 'drone_status_update':
            case 'delivery_completed':
                finalType = 'delivery';
                category = 'delivery_status';
                break;
            default:
                finalType = allowedTypes.includes(type) ? type : 'info';
                category = 'general';
                break;
        }

        await Notification.create({
            userId,
            userModel,
            type: finalType,
            category,
            title,
            message,
            metadata
        });
    } catch (e) {
        console.warn('Notification create failed:', e?.message);
    }
};

// Helper function to notify admins
const notifyAdmins = async (type, title, message, metadata = {}) => {
    const admins = await Admin.find({});
    await Promise.all(admins.map(a => createNotification({ 
        userId: a._id, 
        userModel: 'Admin', 
        type, 
        title, 
        message, 
        metadata 
    })));
};


// ==================== USER ENDPOINTS ====================

// Create drone delivery order (User)
export const createDroneOrder = asyncHandler(async (req, res) => {
    const { orderId, deliveryLocation, pickupLocation, deliveryPreferences } = req.body;
    const userId = req.user._id;
    
    // Validate required fields
    if (!orderId || !deliveryLocation || !pickupLocation) {
        throw new ApiError('Missing required fields', 400, 'Order ID, delivery location, and pickup location are required');
    }
    
    // Check if order exists and belongs to user
    const order = await Order.findById(orderId).populate('shops.shopId');
    if (!order) {
        throw new ApiError('Order not found', 404, 'The specified order does not exist');
    }
    
    if ((order.user || order.userId)?.toString() !== userId.toString()) {
        throw new ApiError('Unauthorized', 403, 'You can only create drone orders for your own orders');
    }
    
    // Check if drone order already exists for this order
    const existingDroneOrder = await DroneOrder.findOne({ orderId });
    if (existingDroneOrder) {
        throw new ApiError('Drone order already exists', 400, 'This order already has a drone delivery scheduled');
    }
    
    // Generate unique QR code and order number
    const qrCode = generateQRCode(orderId, userId, Date.now());
    const orderNumber = order.orderNumber || `DRN-${Date.now()}`;
    
    // Resolve required pincodes if not provided
    const normalizedPickup = {
        lat: pickupLocation.lat,
        lng: pickupLocation.lng,
        address: pickupLocation.address || 'Shop Location',
        pincode: pickupLocation.pincode || '000000'
    };
    const normalizedDelivery = {
        lat: deliveryLocation.lat,
        lng: deliveryLocation.lng,
        address: deliveryLocation.address || 'Delivery Location',
        pincode: deliveryLocation.pincode || '000000',
        deliveryWindow: deliveryLocation.deliveryWindow || {}
    };
    
    // Check weather conditions
    const weatherCheck = await checkWeatherConditions(
        deliveryLocation.lat,
        deliveryLocation.lng
    );
    
    // Calculate route and distance
    const route = calculateOptimalPath(pickupLocation, deliveryLocation);
    
    // Calculate pricing
    const basePrice = 50; // Base drone delivery price
    const distanceSurcharge = route.distance * 2; // 2 INR per km
    const weatherSurcharge = weatherCheck.isSafe ? 0 : 25; // Extra charge for weather challenges
    const totalPrice = basePrice + distanceSurcharge + weatherSurcharge;
    
    // Create drone order
    const sellerId = order.shops?.[0]?.shopId?.sellerId || undefined;
    const droneOrder = new DroneOrder({
        orderId,
        orderNumber,
        userId,
        sellerId,
        qrCode,
        status: weatherCheck.isSafe ? 'pending' : 'weather_blocked',
        weatherCheck,
        location: {
            pickup: normalizedPickup,
            delivery: normalizedDelivery
        },
        route: {
            distance: route.distance,
            estimatedDuration: route.duration,
            waypoints: route.waypoints
        },
        preferences: deliveryPreferences || {},
        pricing: {
            basePrice,
            distanceSurcharge,
            weatherSurcharge,
            totalPrice,
            currency: 'INR'
        },
        audit: {
            createdBy: userId,
            createdByModel: 'User'
        }
    });
    
    await droneOrder.save();
    
    // Log the event
    await logDroneEvent(
        userId,
        'User',
        'drone_order_created',
        req.ip,
        req.get('User-Agent'),
        req.body.deviceId,
        { orderId, qrCode, weatherSafe: weatherCheck.isSafe }
    );
    
    // Emit socket event for real-time updates
    try {
        const io = getIo();
        io?.to(`order:${orderId}`).emit('drone:update', { 
            type: 'created', 
            orderId, 
            droneOrder 
        });
    } catch {}
    
    res.status(201).json(new ApiResponse(
        201,
        {
            droneOrder: {
                _id: droneOrder._id,
                orderId: droneOrder.orderId,
                status: droneOrder.status,
                qrCode: droneOrder.qrCode,
                estimatedDeliveryTime: droneOrder.timing.estimatedDeliveryTime,
                totalPrice: droneOrder.pricing.totalPrice,
                weatherSafe: weatherCheck.isSafe
            }
        },
        'Drone delivery order created successfully'
    ));
});

// Get drone order status (User)
export const getDroneOrderStatus = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user._id;
    
    const droneOrder = await DroneOrder.findOne({ orderId, userId })
        .populate('droneId', 'droneId name model status location battery')
        .populate('sellerId', 'name email');
    
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found for this order');
    }
    
    // Get assignment details if drone is assigned
    let assignment = null;
    if (droneOrder.droneId) {
        assignment = await DroneAssignment.findOne({ 
            orderId: droneOrder._id, 
            droneId: droneOrder.droneId 
        });
    }
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            deliveryProgress: droneOrder.deliveryProgress,
            isOverdue: droneOrder.isOverdue,
            timeRemaining: droneOrder.timeRemaining,
            qrCode: droneOrder.qrCode,
            location: droneOrder.location,
            timing: droneOrder.timing,
            weatherCheck: droneOrder.weatherCheck,
            preferences: droneOrder.preferences,
            pricing: droneOrder.pricing,
            statusHistory: droneOrder.statusHistory.slice(-5) // Last 5 status updates
        },
        drone: droneOrder.droneId ? {
            droneId: droneOrder.droneId.droneId,
            name: droneOrder.droneId.name,
            model: droneOrder.droneId.model,
            status: droneOrder.droneId.status,
            location: droneOrder.droneId.location,
            battery: droneOrder.droneId.battery,
            batteryStatus: droneOrder.droneId.batteryStatus
        } : null,
        assignment: assignment ? {
            status: assignment.status,
            assignmentProgress: assignment.assignmentProgress,
            assignmentHealth: assignment.assignmentHealth,
            timing: assignment.timing,
            route: assignment.route
        } : null
    }, 'Drone order status retrieved successfully'));
});

// Get user's drone delivery history (User)
export const getUserDroneHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { userId };
    if (status) query.status = status;
    
    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: { createdAt: -1 }
    };
    
    const droneOrders = await DroneOrder.find(query)
        .populate('droneId', 'droneId name model')
        .populate('sellerId', 'name')
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .sort(options.sort);
    
    const total = await DroneOrder.countDocuments(query);
    
    res.status(200).json(new ApiResponse(200, {
        droneOrders: droneOrders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            status: order.status,
            deliveryProgress: order.deliveryProgress,
            createdAt: order.createdAt,
            estimatedDeliveryTime: order.timing.estimatedDeliveryTime,
            actualDeliveryTime: order.timing.actualDeliveryTime,
            totalPrice: order.pricing.totalPrice,
            drone: order.droneId ? {
                droneId: order.droneId.droneId,
                name: order.droneId.name,
                model: order.droneId.model
            } : null,
            seller: order.sellerId ? {
                name: order.sellerId.name
            } : null
        })),
        pagination: {
            page: options.page,
            limit: options.limit,
            total,
            pages: Math.ceil(total / options.limit)
        }
    }, 'Drone delivery history retrieved successfully'));
});

// Cancel drone delivery (User)
export const cancelDroneDelivery = asyncHandler(async (req, res) => {
    const { droneOrderId } = req.params;
    const userId = req.user._id;
    
    const droneOrder = await DroneOrder.findOne({ _id: droneOrderId, userId });
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found');
    }
    
    if (!['pending', 'weather_blocked'].includes(droneOrder.status)) {
        throw new ApiError('Cannot cancel delivery', 400, 'Delivery is already in progress and cannot be cancelled');
    }
    
    droneOrder.status = 'cancelled';
    droneOrder.audit.lastModifiedBy = userId;
    droneOrder.audit.lastModifiedByModel = 'User';
    await droneOrder.save();
    
    // Release drone if assigned
    if (droneOrder.droneId) {
        await Drone.findByIdAndUpdate(droneOrder.droneId, { status: 'idle' });
        await DroneAssignment.findOneAndUpdate(
            { orderId: droneOrder._id },
            { status: 'cancelled' }
        );
    }
    
    // Log the event
    await logDroneEvent(
        userId,
        'User',
        'drone_order_cancelled',
        req.ip,
        req.get('User-Agent'),
        req.body.deviceId,
        { droneOrderId, reason: 'User cancelled' }
    );
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            cancelledAt: droneOrder.updatedAt
        }
    }, 'Drone delivery cancelled successfully'));
});

// ==================== SELLER ENDPOINTS ====================

// Get seller's drone orders (Seller)
export const getSellerDroneOrders = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { sellerId };
    if (status) query.status = status;
    
    const droneOrders = await DroneOrder.find(query)
        .populate('userId', 'name email mobile')
        .populate('droneId', 'droneId name model status location battery')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    const total = await DroneOrder.countDocuments(query);
    
    res.status(200).json(new ApiResponse(200, {
        droneOrders: droneOrders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            status: order.status,
            deliveryProgress: order.deliveryProgress,
            createdAt: order.createdAt,
            location: order.location,
            timing: order.timing,
            customer: order.userId ? {
                name: order.userId.name,
                email: order.userId.email,
                mobile: order.userId.mobile
            } : null,
            drone: order.droneId ? {
                droneId: order.droneId.droneId,
                name: order.droneId.name,
                model: order.droneId.model,
                status: order.droneId.status,
                location: order.droneId.location,
                battery: order.droneId.battery
            } : null
        })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
            pages: Math.ceil(total / limit)
            }
    }, 'Seller drone orders retrieved successfully'));
});

// Update drone order status (Seller)
export const updateDroneOrderStatus = asyncHandler(async (req, res) => {
    const { droneOrderId } = req.params;
    const { status, notes } = req.body;
    const sellerId = req.seller._id;
    
    const droneOrder = await DroneOrder.findOne({ _id: droneOrderId, sellerId });
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found');
    }
    
    // Validate status transition
    const validTransitions = {
        'pending': ['preparing', 'cancelled'],
        'weather_blocked': ['pending', 'cancelled'],
        'preparing': ['ready_for_pickup', 'cancelled'],
        'ready_for_pickup': ['drone_en_route', 'cancelled'],
        'drone_en_route': ['picked_up', 'cancelled'],
        'picked_up': ['in_transit', 'cancelled'],
        'in_transit': ['approaching_delivery', 'cancelled'],
        'approaching_delivery': ['delivery_attempt', 'cancelled'],
        'delivery_attempt': ['delivered', 'failed', 'cancelled']
    };
    
    if (!validTransitions[droneOrder.status]?.includes(status)) {
        throw new ApiError('Invalid status transition', 400, `Cannot transition from ${droneOrder.status} to ${status}`);
    }
    
    // Update status
    await droneOrder.updateStatus(status, notes, sellerId, 'Seller');
    
    // Update timing if relevant
    if (status === 'ready_for_pickup') {
        droneOrder.timing.estimatedPickupTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    } else if (status === 'picked_up') {
        droneOrder.timing.actualPickupTime = new Date();
        droneOrder.timing.estimatedDeliveryTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
    }
    
    await droneOrder.save();
    
    // Notify user
    await createNotification({
        userId: droneOrder.userId,
        userModel: 'User',
        type: 'drone_status_update',
        title: 'Drone Delivery Update',
        message: `Your drone delivery status has been updated to: ${status}`,
        metadata: { droneOrderId: droneOrder._id, status, orderId: droneOrder.orderId }
    });
    
    // Emit socket event
    try {
        const io = getIo();
        io?.to(`order:${droneOrder.orderId}`).emit('drone:update', {
            type: 'status_updated',
            droneOrderId: droneOrder._id,
            status,
            notes
        });
    } catch {}
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            updatedAt: droneOrder.updatedAt
        }
    }, 'Drone order status updated successfully'));
});

// Call drone to shop (Seller)
export const callDroneToShop = asyncHandler(async (req, res) => {
    const sellerId = req.seller._id;
    const { orderId, pickupLocation } = req.body;
    
    // Enhanced validation
    if (!orderId || !pickupLocation) {
        throw new ApiError('Missing required fields', 400, 'Order ID and pickup location are required');
    }
    
    if (!pickupLocation.lat || !pickupLocation.lng) {
        throw new ApiError('Invalid pickup location', 400, 'Pickup location must include latitude and longitude');
    }
    
    // Validate coordinates are within reasonable bounds
    if (pickupLocation.lat < -90 || pickupLocation.lat > 90 || 
        pickupLocation.lng < -180 || pickupLocation.lng > 180) {
        throw new ApiError('Invalid coordinates', 400, 'Latitude must be between -90 and 90, longitude between -180 and 180');
    }
    
    // Work directly with DroneOrder by its id
    const droneOrder = await DroneOrder.findById(orderId).populate('userId', 'name email').populate('sellerId', 'name');
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'The specified drone order does not exist.');
    }
    if (droneOrder.sellerId?.toString() !== sellerId.toString()) {
        throw new ApiError('Unauthorized', 403, 'You do not have permission to call a drone for this order.');
    }

    // Validate status
    if (droneOrder.status !== 'ready_for_pickup') {
        throw new ApiError('Invalid order status', 400, `Order must be in 'ready_for_pickup' to call a drone. Current: ${droneOrder.status}`);
    }

    // Find available drone near pickup, fallback to any available
    let available = await Drone.findAvailable({
        'location.lat': { $gte: pickupLocation.lat - 0.5, $lte: pickupLocation.lat + 0.5 },
        'location.lng': { $gte: pickupLocation.lng - 0.5, $lte: pickupLocation.lng + 0.5 }
    }).limit(1);
    if (available.length === 0) {
        available = await Drone.findAvailable({}).limit(1);
    }
    if (available.length === 0) {
        throw new ApiError('No drones available', 409, 'All drones are currently busy. You will be notified when a drone becomes available.');
    }

    const drone = available[0];

    // Assign and update statuses
    droneOrder.droneId = drone._id;
    await droneOrder.updateStatus('assigned', 'Drone assigned and en route to shop', sellerId, 'Seller');

    try {
        if (typeof drone.assignToOrder === 'function') {
            await drone.assignToOrder(droneOrder._id, pickupLocation, droneOrder.location?.delivery);
        } else {
            await Drone.updateOne({ _id: drone._id }, { $set: { status: 'assigned', currentAssignment: { orderId: droneOrder._id, assignedAt: new Date(), pickupLocation } } });
        }
    } catch (e) {
        console.warn('Failed to update drone assignment:', e?.message);
    }

    try {
        await DroneAssignment.create({
        orderId: droneOrder._id,
        droneId: drone._id,
        status: 'assigned',
            audit: { createdBy: sellerId, createdByModel: 'Seller' }
        });
    } catch {}

    try {
        await Notification.create({
        userId: droneOrder.userId,
        userModel: 'User',
            type: 'delivery',
            title: 'Drone is on the way!',
            message: `A drone has been dispatched to pick up your order #${droneOrder.orderNumber}.`,
        metadata: { droneOrderId: droneOrder._id, droneId: drone.droneId }
    });
    } catch {}
    
    try {
        const io = getIo();
        io?.to(`order:${droneOrder.orderId}`).emit('drone:update', {
            type: 'drone_assigned',
            droneOrderId: droneOrder._id,
            drone: { droneId: drone.droneId, name: drone.name, model: drone.model }
        });
    } catch {}
    
    return res.status(200).json(new ApiResponse(200, {
        droneOrder: { _id: droneOrder._id, status: droneOrder.status, droneId: drone.droneId },
        drone: { droneId: drone.droneId, name: drone.name }
    }, 'Drone called to shop successfully'));
});

// ==================== DRONE MISSION CONTROL ====================

// Start drone mission (Admin/Seller)
export const startDroneMission = asyncHandler(async (req, res) => {
    try {
        const { droneId, waypoints } = req.body;
        
        // Enhanced validation
        if (!droneId) {
            throw new ApiError('Missing drone ID', 400, 'Drone ID is required');
        }
        
        if (!waypoints || !Array.isArray(waypoints) || waypoints.length === 0) {
            throw new ApiError('Invalid waypoints', 400, 'Waypoints must be a non-empty array');
        }
        
        // Validate each waypoint
        for (const [index, waypoint] of waypoints.entries()) {
            if (!waypoint.lat || !waypoint.lng) {
                throw new ApiError('Invalid waypoint', 400, `Waypoint ${index + 1} must include latitude and longitude`);
            }
            
            if (waypoint.lat < -90 || waypoint.lat > 90 || 
                waypoint.lng < -180 || waypoint.lng > 180) {
                throw new ApiError('Invalid coordinates', 400, `Waypoint ${index + 1} has invalid coordinates`);
            }
        }
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            throw new ApiError('Drone not found', 404, 'The specified drone does not exist');
        }
        
        if (!drone.isOperational) {
            throw new ApiError('Drone not operational', 400, 'The drone is not operational');
        }
        
        // Send mission start command to drone bridge
        try {
            const droneBridgeClient = await import('../services/droneBridgeClient.js');
            const result = await droneBridgeClient.droneBridgeClient.sendCommand('start_mission', droneId, { waypoints });
            
            if (!result.success) {
                throw new ApiError('Drone bridge unreachable', 503, 'Failed to communicate with drone bridge');
            }
            
            // Update drone status
            await Drone.findOneAndUpdate(
                { droneId },
                { 
                    status: 'in_flight',
                    currentMission: { waypoints, startedAt: new Date() }
                }
            );
            
            res.status(200).json(new ApiResponse(200, {
                droneId,
                waypoints,
                status: 'mission_started',
                message: 'Mission started successfully'
            }, 'Drone mission started successfully'));
            
        } catch (bridgeError) {
            console.error('Drone bridge communication error:', bridgeError);
            throw new ApiError('Drone bridge unreachable', 503, 'Cannot connect to drone bridge. Please ensure it is running.');
        }
        
    } catch (error) {
        console.error('Start mission error:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError('Internal server error', 500, 'Failed to start drone mission');
    }
});

// Return drone to launch (Admin/Seller)
export const returnDroneToLaunch = asyncHandler(async (req, res) => {
    try {
        const { droneId } = req.body;
        
        if (!droneId) {
            throw new ApiError('Missing drone ID', 400, 'Drone ID is required');
        }
        
        // Find drone
        const drone = await Drone.findOne({ droneId });
        if (!drone) {
            throw new ApiError('Drone not found', 404, 'The specified drone does not exist');
        }
        
        // Send RTL command to drone bridge
        try {
            const droneBridgeClient = await import('../services/droneBridgeClient.js');
            const result = await droneBridgeClient.droneBridgeClient.sendCommand('return_to_launch', droneId, {});
            
            if (!result.success) {
                throw new ApiError('Drone bridge unreachable', 503, 'Failed to communicate with drone bridge');
            }
            
            // Update drone status
            await Drone.findOneAndUpdate(
                { droneId },
                { 
                    status: 'returning',
                    currentMission: null
                }
            );
            
            res.status(200).json(new ApiResponse(200, {
                droneId,
                status: 'returning_to_launch',
                message: 'Return to launch command sent successfully'
            }, 'Drone returning to launch'));
            
        } catch (bridgeError) {
            console.error('Drone bridge communication error:', bridgeError);
            throw new ApiError('Drone bridge unreachable', 503, 'Cannot connect to drone bridge. Please ensure it is running.');
        }
        
    } catch (error) {
        console.error('Return to launch error:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new ApiError('Internal server error', 500, 'Failed to send return to launch command');
    }
});

// ==================== DRONE ASSIGNMENT ====================

// Assign drone to order (called when seller marks order as ready)
export const assignDroneToOrder = asyncHandler(async (droneAssignment) => {
    try {
        console.log('🚁 assignDroneToOrder called with:', droneAssignment);
        
        // Find available drone with larger radius
        let availableDrones = await Drone.findAvailable({
            'location.lat': { 
                $gte: droneAssignment.pickupLocation.lat - 0.5, 
                $lte: droneAssignment.pickupLocation.lat + 0.5 
            },
            'location.lng': { 
                $gte: droneAssignment.pickupLocation.lng - 0.5, 
                $lte: droneAssignment.pickupLocation.lng + 0.5 
            }
        }).limit(1);
        
        // If no drones found within radius, try without location criteria
        if (availableDrones.length === 0) {
            console.log('🔍 No drones found within radius, checking all available drones...');
            availableDrones = await Drone.findAvailable({}).limit(1);
        }
        
        if (availableDrones.length === 0) {
            throw new Error('No drones available in the area');
        }
        
        const drone = availableDrones[0];
        console.log('🚁 Found available drone:', drone.droneId);
        
        // Find the drone order (support both regular orderId and drone order _id)
        const droneOrder = await DroneOrder.findOne({ 
            $or: [
                { _id: droneAssignment.orderId },
                { orderId: droneAssignment.orderId }
            ]
        });
        if (!droneOrder) {
            throw new Error('Drone order not found');
        }
        
        // Update drone order with drone assignment
        droneOrder.droneId = drone._id;
        droneOrder.status = 'assigned';
        droneOrder.assignedAt = new Date();
        await droneOrder.save();
        
        // Update drone status without triggering model required-field validations
        try {
            await Drone.updateOne({ _id: drone._id }, { $set: { status: 'in_flight' } });
        } catch (e) {
            console.warn('⚠️ Failed to update drone status via updateOne:', e?.message);
        }
        
        // Create drone assignment record
        const assignment = new DroneAssignment({
            orderId: droneOrder._id,
            droneId: drone._id,
            status: 'assigned',
            priority: droneAssignment.priority || 'normal',
            audit: {
                createdBy: droneAssignment.orderId, // This should be seller ID
                createdByModel: 'Seller'
            }
        });
        await assignment.save();
        
        // Send commands to drone bridge to move to shop
        try {
            console.log('🚁 Sending commands to drone bridge...');
            
            // Command 1: Takeoff
            await sendCommand('TAKEOFF', drone._id, {
                altitude: 100,
                location: drone.currentLocation
            });
            
            // Command 2: Go to shop (pickup location)
            await sendCommand('GOTO', drone._id, {
                destination: droneAssignment.pickupLocation,
                altitude: 100
            });
            
            console.log('✅ Commands sent to drone bridge successfully');
            
        } catch (commandError) {
            console.error('❌ Failed to send commands to drone bridge:', commandError);
            // Continue even if commands fail - the assignment is still valid
        }
        
        // Notify user
        await createNotification({
            userId: droneOrder.userId,
            userModel: 'User',
            type: 'drone_assigned',
            title: 'Drone Assigned',
            message: 'A drone has been assigned to your delivery and is on its way to the shop',
            metadata: { droneOrderId: droneOrder._id, droneId: drone.droneId }
        });
        
        // Emit socket event
        try {
            const io = getIo();
            io?.to(`order:${droneAssignment.orderId}`).emit('drone:update', {
                type: 'drone_assigned',
                droneOrderId: droneOrder._id,
                drone: {
                    droneId: drone.droneId,
                    name: drone.name,
                    model: drone.model
                }
            });
        } catch {}
        
        return {
            success: true,
            droneId: drone.droneId,
            assignmentId: assignment._id,
            estimatedDelivery: droneAssignment.estimatedDeliveryTime,
            message: 'Drone assigned and dispatched to shop'
        };
        
    } catch (error) {
        console.error('❌ Error assigning drone to order:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// ==================== DRONE AVAILABILITY ====================

// Check drone availability
export const checkDroneAvailability = asyncHandler(async (req, res) => {
    try {
        const { lat, lng, radius = 0.5 } = req.query; // Increased default radius to 0.5 degrees (~55km)
        
        // Use the model's findAvailable method with location criteria
        let criteria = {};
        
        // If location provided, filter by proximity
        if (lat && lng) {
            criteria['location.lat'] = { 
                $gte: parseFloat(lat) - parseFloat(radius), 
                $lte: parseFloat(lat) + parseFloat(radius) 
            };
            criteria['location.lng'] = { 
                $gte: parseFloat(lng) - parseFloat(radius), 
                $lte: parseFloat(lng) + parseFloat(radius) 
            };
        }
        
        let availableDrones = await Drone.findAvailable(criteria);
        let count = availableDrones.length;
        
        // If no drones found within radius, try without location criteria (for testing/development)
        if (count === 0 && (lat && lng)) {
            console.log('🔍 No drones found within radius, checking all available drones...');
            availableDrones = await Drone.findAvailable({});
            count = availableDrones.length;
        }
        
        console.log(`🔍 Drone availability check: ${count} drones available`);
        console.log(`🔍 Criteria:`, criteria);
        console.log(`🔍 Available drones:`, availableDrones.map(d => ({
            droneId: d.droneId,
            status: d.status,
            battery: d.battery,
            operationalStatus: d.operationalStatus,
            location: d.location
        })));
        
        res.status(200).json(new ApiResponse(200, {
            available: count > 0,
            count,
            drones: availableDrones.map(drone => ({
                droneId: drone.droneId,
                name: drone.name,
                model: drone.model,
                battery: drone.battery,
                location: drone.location,
                status: drone.status,
                operationalStatus: drone.operationalStatus
            }))
        }, `Found ${count} available drone(s)`));
        
    } catch (error) {
        console.error('❌ Error checking drone availability:', error);
        res.status(500).json(new ApiResponse(500, null, 'Failed to check drone availability'));
    }
});

// ==================== DRONE STATUS FIX ====================

// Fix drone status (temporary endpoint for fixing invalid statuses)
export const fixDroneStatus = asyncHandler(async (req, res) => {
    try {
        console.log('🔧 Fixing drone statuses...');
        
        // Find drones with invalid status
        const invalidStatusDrones = await Drone.find({
            status: { $nin: ['idle', 'assigned', 'launched', 'in_flight', 'delivering', 'returning', 'landed', 'maintenance', 'error', 'stopped'] }
        });
        
        console.log(`Found ${invalidStatusDrones.length} drones with invalid status`);
        
        for (const drone of invalidStatusDrones) {
            console.log(`Fixing drone ${drone.droneId}: ${drone.status} -> idle`);
            await Drone.findByIdAndUpdate(drone._id, { 
                status: 'idle',
                operationalStatus: 'operational'
            });
        }
        
        // Check available drones after fix
        const availableDrones = await Drone.findAvailable();
        console.log(`Available drones after fix: ${availableDrones.length}`);
        
        res.status(200).json(new ApiResponse(200, {
            fixed: invalidStatusDrones.length,
            available: availableDrones.length,
            drones: availableDrones.map(drone => ({
                droneId: drone.droneId,
                name: drone.name,
                status: drone.status,
                battery: drone.battery,
                operationalStatus: drone.operationalStatus
            }))
        }, `Fixed ${invalidStatusDrones.length} drones, ${availableDrones.length} now available`));
        
    } catch (error) {
        console.error('❌ Error fixing drone status:', error);
        res.status(500).json(new ApiResponse(500, null, 'Failed to fix drone status'));
    }
});

// ==================== ADMIN ENDPOINTS ====================

// Get all drone orders (Admin)
export const getAllDroneOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, sellerId, userId } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (sellerId) query.sellerId = sellerId;
    if (userId) query.userId = userId;
    
    const droneOrders = await DroneOrder.find(query)
        .populate('userId', 'name email mobile')
        .populate('sellerId', 'name email')
        .populate('droneId', 'droneId name model status location battery')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    const total = await DroneOrder.countDocuments(query);
    
    res.status(200).json(new ApiResponse(200, {
        droneOrders: droneOrders.map(order => ({
            _id: order._id,
            orderId: order.orderId,
            status: order.status,
            deliveryProgress: order.deliveryProgress,
            isOverdue: order.isOverdue,
            createdAt: order.createdAt,
            location: order.location,
            timing: order.timing,
            weatherCheck: order.weatherCheck,
            pricing: order.pricing,
            customer: order.userId ? {
                name: order.userId.name,
                email: order.userId.email,
                mobile: order.userId.mobile
            } : null,
            seller: order.sellerId ? {
                name: order.sellerId.name,
                email: order.sellerId.email
            } : null,
            drone: order.droneId ? {
                droneId: order.droneId.droneId,
                name: order.droneId.name,
                model: order.droneId.model,
                status: order.droneId.status,
                location: order.droneId.location,
                battery: order.droneId.battery
            } : null
        })),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }, 'All drone orders retrieved successfully'));
});

// Get all drones (Admin)
export const getAllDrones = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, operationalStatus } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (operationalStatus) query.operationalStatus = operationalStatus;
    
    const drones = await Drone.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ lastActive: -1 });
    
    const total = await Drone.countDocuments(query);
    
    res.status(200).json(new ApiResponse(200, {
        drones: drones.map(drone => ({
            _id: drone._id,
            droneId: drone.droneId,
            name: drone.name,
            model: drone.model,
            status: drone.status,
            operationalStatus: drone.operationalStatus,
            location: drone.location,
            battery: drone.battery,
            batteryStatus: drone.batteryStatus,
            isOperational: drone.isOperational,
            maintenance: drone.maintenance,
            performance: drone.performance,
            lastActive: drone.lastActive
        })),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    }, 'All drones retrieved successfully'));
});

// Assign drone to order (Admin)
export const assignDrone = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { droneId, priority = 'normal' } = req.body;
    const adminId = req.admin._id;
    
    // Find drone order
    const droneOrder = await DroneOrder.findById(orderId);
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found');
    }
    
    // Find drone
    const drone = await Drone.findById(droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    if (!drone.isOperational) {
        throw new ApiError('Drone not operational', 400, 'Selected drone is not operational');
    }
    
    if (drone.status !== 'idle') {
        throw new ApiError('Drone not available', 400, 'Selected drone is not available');
    }
    
    // Assign drone to order
    droneOrder.droneId = drone._id;
    droneOrder.status = 'assigned';
    droneOrder.assignedAt = new Date();
    droneOrder.audit.lastModifiedBy = adminId;
    droneOrder.audit.lastModifiedByModel = 'Admin';
    await droneOrder.save();
    
    // Update drone status
    await drone.assignToOrder(droneOrder._id, droneOrder.location.pickup, droneOrder.location.delivery);
    
    // Create drone assignment
    const assignment = new DroneAssignment({
        orderId: droneOrder._id,
        droneId: drone._id,
        status: 'assigned',
        priority,
        audit: {
            createdBy: adminId,
            createdByModel: 'Admin'
        }
    });
    await assignment.save();
    
    // Notify user
    await createNotification({
        userId: droneOrder.userId,
        userModel: 'User',
        type: 'drone_assigned',
        title: 'Drone Assigned',
        message: 'A drone has been assigned to your delivery',
        metadata: { droneOrderId: droneOrder._id, droneId: drone.droneId }
    });
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            droneId: drone.droneId
        },
        drone: {
            droneId: drone.droneId,
            name: drone.name,
            model: drone.model
        }
    }, 'Drone assigned successfully'));
});

// Launch drone (Admin)
export const launchDrone = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const adminId = req.admin._id;
    
    // Find drone order
    const droneOrder = await DroneOrder.findById(orderId);
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found');
    }
    
    if (!droneOrder.droneId) {
        throw new ApiError('No drone assigned', 400, 'No drone is assigned to this order');
    }
    
    if (droneOrder.status !== 'assigned') {
        throw new ApiError('Invalid order status', 400, 'Order must be assigned to launch drone');
    }
    
    // Find drone
    const drone = await Drone.findById(droneOrder.droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    // Update statuses
    droneOrder.status = 'drone_en_route';
    droneOrder.audit.lastModifiedBy = adminId;
    droneOrder.audit.lastModifiedByModel = 'Admin';
    await droneOrder.save();
    
    drone.status = 'in_flight';
    await drone.save();
    
    // Update assignment
    await DroneAssignment.findOneAndUpdate(
        { orderId: droneOrder._id },
        { status: 'launched' }
    );
    
    // Send launch command to drone
    try {
        await sendCommand('launch', drone.droneId, {
            orderId: droneOrder._id,
            pickupLocation: droneOrder.location.pickup,
            deliveryLocation: droneOrder.location.delivery
        });
    } catch (error) {
        console.error('Failed to send launch command:', error);
    }
    
    // Notify user
    await createNotification({ 
        userId: droneOrder.userId,
        userModel: 'User', 
        type: 'drone_launched',
        title: 'Drone Launched',
        message: 'Your drone has been launched and is on its way to pick up your order',
        metadata: { droneOrderId: droneOrder._id, droneId: drone.droneId }
    });
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status
        },
        drone: {
            droneId: drone.droneId,
            status: drone.status
        }
    }, 'Drone launched successfully'));
});

// Land drone (Admin)
export const landDrone = asyncHandler(async (req, res) => {
    const { droneId } = req.params;
    const adminId = req.admin._id;
    
    // Find drone
    const drone = await Drone.findById(droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    if (drone.status === 'idle' || drone.status === 'landed') {
        throw new ApiError('Drone already landed', 400, 'Drone is already on the ground');
    }
    
    // Update drone status
    drone.status = 'landed';
    drone.inAir = false;
    drone.armed = false;
    await drone.save();
    
    // Update assignment if exists
    if (drone.currentAssignment?.orderId) {
        await DroneAssignment.findOneAndUpdate(
            { orderId: drone.currentAssignment.orderId },
            { status: 'completed' }
        );
        
        // Update drone order
        await DroneOrder.findByIdAndUpdate(
            drone.currentAssignment.orderId,
            { status: 'delivered' }
        );
    }
    
    // Release drone from assignment
    await drone.releaseFromAssignment();
    
    // Send land command to drone
    try {
        await sendCommand('land', drone.droneId);
    } catch (error) {
        console.error('Failed to send land command:', error);
    }
    
    res.status(200).json(new ApiResponse(200, {
        drone: {
            droneId: drone.droneId,
            status: drone.status
        }
    }, 'Drone landed successfully'));
});

// Return drone to home (Admin)
export const returnDrone = asyncHandler(async (req, res) => {
    const { droneId } = req.params;
    const adminId = req.admin._id;
    
    // Find drone
    const drone = await Drone.findById(droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    if (drone.status === 'idle') {
        throw new ApiError('Drone already at home', 400, 'Drone is already at home base');
    }
    
    // Determine home location: prefer drone.homeLocation, fallback to env
    let homeLocation;
    if (drone.homeLocation?.lat !== undefined && drone.homeLocation?.lng !== undefined) {
        homeLocation = { lat: drone.homeLocation.lat, lng: drone.homeLocation.lng };
    } else if (process.env.DRONE_HOME_LAT && process.env.DRONE_HOME_LNG) {
        homeLocation = { lat: parseFloat(process.env.DRONE_HOME_LAT), lng: parseFloat(process.env.DRONE_HOME_LNG) };
    } else {
        throw new ApiError('Home location not configured', 500, 'No home location set in DB or .env');
    }
    
    // Update drone status
    drone.status = 'returning';
    await drone.save();
    
    // Send return command to drone with destination
    try {
        await sendCommand('return', drone.droneId, { destination: homeLocation });
    } catch (error) {
        console.error('Failed to send return command:', error);
    }
    
    res.status(200).json(new ApiResponse(200, {
        drone: {
            droneId: drone.droneId,
            status: drone.status,
            returningTo: homeLocation
        }
    }, 'Drone returning to home base'));
});

// Emergency stop drone (Admin)
export const emergencyStop = asyncHandler(async (req, res) => {
    const { droneId } = req.params;
    const adminId = req.admin._id;
    
    // Find drone
    const drone = await Drone.findById(droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    // Update drone status
    drone.status = 'stopped';
    drone.operationalStatus = 'emergency';
    await drone.save();
    
    // Log emergency stop
    await drone.logError('EMERGENCY_STOP', 'Emergency stop activated by admin', 'critical');
    
    // Send emergency stop command to drone
    try {
        await sendCommand('emergency_stop', drone.droneId);
    } catch (error) {
        console.error('Failed to send emergency stop command:', error);
    }
    
    // Notify admins
    await notifyAdmins(
        'drone_emergency',
        'Drone Emergency Stop',
        `Drone ${drone.droneId} has been emergency stopped by admin ${adminId}`,
        { droneId: drone._id, adminId }
    );
    
    res.status(200).json(new ApiResponse(200, {
        drone: {
            droneId: drone.droneId,
            status: drone.status,
            operationalStatus: drone.operationalStatus
        }
    }, 'Emergency stop activated successfully'));
});

// Get drone status (Admin)
export const getDroneStatus = asyncHandler(async (req, res) => {
    const { droneId } = req.params;
    
    const drone = await Drone.findById(droneId);
        if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    
    // Get current assignment if exists
    let currentAssignment = null;
    if (drone.currentAssignment?.orderId) {
        currentAssignment = await DroneAssignment.findOne({ 
            orderId: drone.currentAssignment.orderId 
        }).populate('orderId', 'status location timing');
    }
    
    res.status(200).json(new ApiResponse(200, {
        drone: {
            _id: drone._id,
            droneId: drone.droneId,
            name: drone.name,
            model: drone.model,
            status: drone.status,
            operationalStatus: drone.operationalStatus,
            location: drone.location,
            battery: drone.battery,
            batteryStatus: drone.batteryStatus,
            isOperational: drone.isOperational,
            flightMode: drone.flightMode,
            armed: drone.armed,
            inAir: drone.inAir,
            maintenance: drone.maintenance,
            performance: drone.performance,
            errors: drone.errors.filter(e => !e.resolved),
            lastActive: drone.lastActive
        },
        currentAssignment,
        weatherConditions: drone.weatherConditions
    }, 'Drone status retrieved successfully'));
});

// Get drone status by order (User/Admin)
export const getDroneStatusByOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    
    const droneOrder = await DroneOrder.findById(orderId);
    if (!droneOrder) {
        throw new ApiError('Drone order not found', 404, 'No drone order found');
    }
    
    if (!droneOrder.droneId) {
        return res.status(200).json(new ApiResponse(200, {
            droneOrder: {
                _id: droneOrder._id,
                status: droneOrder.status,
                message: 'No drone assigned yet'
            }
        }, 'No drone assigned to this order'));
    }
    
    const drone = await Drone.findById(droneOrder.droneId);
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'Assigned drone not found');
    }
    
    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            deliveryProgress: droneOrder.deliveryProgress
        },
        drone: {
            droneId: drone.droneId,
            name: drone.name,
            status: drone.status,
            location: drone.location,
            battery: drone.battery,
            batteryStatus: drone.batteryStatus
        }
    }, 'Drone status retrieved successfully'));
});

// Verify QR code at delivery
export const verifyQRCodeDelivery = asyncHandler(async (req, res) => {
    const { qrCode, verificationMethod = 'qr_scan' } = req.body;
    
    if (!qrCode) {
        throw new ApiError('Missing QR code', 400, 'QR code is required');
    }
    
    // Find drone order by QR code
    const droneOrder = await DroneOrder.findOne({ qrCode });
    if (!droneOrder) {
        throw new ApiError('Invalid QR code', 404, 'No drone order found for this QR code');
    }
    
    if (droneOrder.status !== 'approaching_delivery' && droneOrder.status !== 'delivery_attempt') {
        throw new ApiError('Invalid delivery status', 400, 'Drone is not ready for delivery verification');
    }
    
    // Update delivery verification
    droneOrder.deliveryVerification = {
        verifiedAt: new Date(),
        verifiedBy: req.user?._id || req.seller?._id || req.admin?._id,
        verifiedByModel: req.user ? 'User' : req.seller ? 'Seller' : 'Admin',
        verificationMethod
    };
    
    // Update status to delivered
    droneOrder.status = 'delivered';
    droneOrder.timing.actualDeliveryTime = new Date();
    await droneOrder.save();

    // Update drone status: mark available again
    if (droneOrder.droneId) {
        const drone = await Drone.findById(droneOrder.droneId);
        if (drone) {
            // Notify bridge to confirm delivery and return
            try {
                await sendCommand('confirm_delivery', drone.droneId);
            } catch (e) {
                console.warn('⚠️ Failed to notify bridge confirm_delivery:', e?.message);
            }
            // Let bridge manage live status; set to returning for backend tracking
            drone.status = 'returning';
            await drone.save();
        }
    }
    
    // Update assignment
    await DroneAssignment.findOneAndUpdate(
        { orderId: droneOrder._id },
        { status: 'delivered' }
    );
    
    // Notify user
    await createNotification({
        userId: droneOrder.userId,
        userModel: 'User',
        type: 'delivery_completed',
        title: 'Delivery Completed',
        message: 'Your drone delivery has been completed successfully',
        metadata: { droneOrderId: droneOrder._id, orderId: droneOrder.orderId }
    });
    
    // Emit socket updates to user and seller to refresh their views
    try {
        const io = getIo();
        // Notify user room
        io?.to(`user:${droneOrder.userId.toString()}`).emit('drone:update', {
            type: 'delivered',
            droneOrderId: droneOrder._id,
            status: 'delivered',
            deliveredAt: droneOrder.timing.actualDeliveryTime
        });
        // Notify seller room
        io?.to(`seller:${droneOrder.sellerId.toString()}`).emit('drone:update', {
            type: 'delivered',
            droneOrderId: droneOrder._id,
            status: 'delivered',
            deliveredAt: droneOrder.timing.actualDeliveryTime
        });
    } catch {}
    
    // Optionally archive a synthetic regular order record for history if one exists
    if (droneOrder.orderId) {
        try {
            const { archiveOrder } = await import('../utils/orderUtils.js');
            await archiveOrder(droneOrder.orderId);
        } catch (e) {
            console.warn('⚠️ Failed to archive linked regular order for drone delivery:', e?.message);
        }
    }

    res.status(200).json(new ApiResponse(200, {
        droneOrder: {
            _id: droneOrder._id,
            status: droneOrder.status,
            deliveredAt: droneOrder.timing.actualDeliveryTime
        }
    }, 'Delivery verified successfully'));
});

// Webhook: Drone landed and is idle (called by Python bridge after RTL/landing)
export const webhookDroneLanded = asyncHandler(async (req, res) => {
    const { droneId } = req.body;
    if (!droneId) {
        throw new ApiError('Missing droneId', 400, 'droneId is required');
    }
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
        throw new ApiError('Drone not found', 404, 'No drone found');
    }
    // Update to idle when bridge confirms landing
    drone.status = 'idle';
    drone.inAir = false;
    drone.armed = false;
    await drone.save();
    return res.status(200).json(new ApiResponse(200, { droneId: drone.droneId, status: drone.status }, 'Drone marked idle'));
});

// ==================== ANALYTICS ENDPOINTS ====================

// Get drone fleet analytics (Admin)
export const getDroneFleetAnalytics = asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;
    
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
    
    // Fleet overview
    const totalDrones = await Drone.countDocuments();
    const operationalDrones = await Drone.countDocuments({ operationalStatus: 'operational' });
    const inFlightDrones = await Drone.countDocuments({ status: { $in: ['in_flight', 'delivering', 'returning'] } });
    const maintenanceDrones = await Drone.countDocuments({ operationalStatus: 'maintenance_required' });
    
    // Delivery statistics
    const totalDeliveries = await DroneOrder.countDocuments({ 
        createdAt: { $gte: startDate },
        status: 'delivered'
    });
    
    const pendingDeliveries = await DroneOrder.countDocuments({ 
        status: { $in: ['pending', 'assigned', 'preparing', 'ready_for_pickup'] }
    });
    
    const activeDeliveries = await DroneOrder.countDocuments({ 
        status: { $in: ['drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery'] }
    });
    
    // Performance metrics
    const avgDeliveryTime = await DroneOrder.aggregate([
        { $match: { 
            status: 'delivered',
            'timing.totalDuration': { $exists: true, $gt: 0 }
        }},
        { $group: { _id: null, avgTime: { $avg: '$timing.totalDuration' } }}
    ]);
    
    const successRate = await DroneOrder.aggregate([
        { $match: { createdAt: { $gte: startDate } }},
        { $group: { 
            _id: null, 
            total: { $sum: 1 },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }},
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }}
        }}
    ]);
    
    res.status(200).json(new ApiResponse(200, {
        period,
        fleet: {
            total: totalDrones,
            operational: operationalDrones,
            inFlight: inFlightDrones,
            maintenance: maintenanceDrones,
            operationalRate: totalDrones > 0 ? (operationalDrones / totalDrones) * 100 : 0
        },
        deliveries: {
            total: totalDeliveries,
            pending: pendingDeliveries,
            active: activeDeliveries
        },
        performance: {
            averageDeliveryTime: avgDeliveryTime[0]?.avgTime || 0,
            successRate: successRate[0] ? (successRate[0].delivered / successRate[0].total) * 100 : 0,
            totalOrders: successRate[0]?.total || 0,
            successfulDeliveries: successRate[0]?.delivered || 0,
            failedDeliveries: successRate[0]?.failed || 0
        }
    }, 'Drone fleet analytics retrieved successfully'));
});

// ==================== ENHANCED FLEET MANAGEMENT ====================

// Enhanced fleet overview with real-time status
export const getFleetOverviewEnhanced = asyncHandler(async (req, res) => {
    try {
        const drones = await Drone.find({}).sort({ droneId: 1 });
        const activeOrders = await DroneOrder.find({ 
            status: { $in: ['assigned', 'in_flight', 'delivering'] } 
        });
        
        // Calculate fleet metrics
        const metrics = {
            totalDrones: drones.length,
            activeDrones: drones.filter(d => d.status !== 'idle').length,
            idleDrones: drones.filter(d => d.status === 'idle').length,
            maintenanceNeeded: drones.filter(d => d.operationalStatus === 'maintenance_required').length,
            activeMissions: activeOrders.length,
            averageBattery: calculateAverageBattery(drones),
            weatherStatus: await getFleetWeatherStatus()
        };

        res.status(200).json({
            success: true,
            data: {
                drones: drones.map(drone => ({
                    ...drone.toObject(),
                    realTimeStatus: null // Could be enhanced with real-time data
                })),
                metrics,
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Enhanced fleet overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get enhanced fleet overview',
            error: error.message
        });
    }
});

// Intelligent drone assignment
export const assignDroneIntelligent = asyncHandler(async (req, res) => {
    try {
        const { orderId, priority = 'normal', location, weight } = req.body;
        
        // Find available drones
        const availableDrones = await Drone.find({
            status: 'idle',
            operationalStatus: 'operational',
            battery: { $gte: 30 } // Minimum 30% battery
        });

        if (availableDrones.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No available drones found',
                data: { orderId }
            });
        }

        // Score drones based on multiple factors
        const scoredDrones = await scoreDrones(availableDrones, {
            orderId,
            priority,
            location,
            weight
        });

        // Select best drone
        const bestDrone = scoredDrones[0];
        
        // Create drone order
        const droneOrder = new DroneOrder({
            orderId,
            droneId: bestDrone.droneId,
            status: 'assigned',
            assignedAt: new Date(),
            priority,
            deliveryLocation: location,
            packageWeight: weight,
            estimatedDeliveryTime: calculateDeliveryTime(bestDrone, location)
        });

        await droneOrder.save();

        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId: bestDrone.droneId },
            {
                status: 'assigned',
                lastOrderId: orderId,
                lastAssignmentAt: new Date()
            }
        );

        // Emit real-time update
        const io = getIo();
        io.emit('drone:assignment', {
            droneId: bestDrone.droneId,
            orderId: orderId,
            status: 'assigned',
            reason: bestDrone.selectionReason
        });

        res.status(200).json({
            success: true,
            message: `Drone ${bestDrone.droneId} assigned to order ${orderId}`,
            data: {
                droneId: bestDrone.droneId,
                orderId: orderId,
                drone: {
                    name: bestDrone.name,
                    battery: bestDrone.battery,
                    location: bestDrone.location
                },
                selectionReason: bestDrone.selectionReason,
                estimatedDeliveryTime: bestDrone.estimatedDeliveryTime
            }
        });
    } catch (error) {
        console.error('Intelligent assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign drone intelligently',
            error: error.message
        });
    }
});

// ==================== MAINTENANCE / BACKFILL ====================

// Admin-only: backfill DroneOrder.orderId using orderDetails.orderToken
// (Removed) Admin backfill handler per request - using standalone script instead

// Helper functions for enhanced features
const calculateAverageBattery = (drones) => {
    if (drones.length === 0) return 0;
    const totalBattery = drones.reduce((sum, drone) => sum + (drone.battery || 0), 0);
    return Math.round(totalBattery / drones.length);
};

const getFleetWeatherStatus = async () => {
    try {
        const centralLocation = { lat: 37.7749, lng: -122.4194 };
        const weather = await weatherIntegrationService.getWeatherForDrone('FLEET', centralLocation);
        
        return {
            safeToFly: weather.analysis.isSafeToFly,
            riskLevel: weather.analysis.riskLevel,
            conditions: weather.analysis.conditions,
            recommendations: weather.analysis.recommendations
        };
    } catch (error) {
        console.error('Weather status error:', error);
        return {
            safeToFly: false,
            riskLevel: 'UNKNOWN',
            conditions: {},
            recommendations: []
        };
    }
};

const scoreDrones = async (drones, orderContext) => {
    const scoredDrones = [];
    
    for (const drone of drones) {
        let score = 0;
        let reasons = [];
        
        // Battery score (40% weight)
        const batteryScore = (drone.battery / 100) * 40;
        score += batteryScore;
        reasons.push(`Battery: ${drone.battery}%`);
        
        // Distance score (30% weight) - simplified
        const distanceScore = 30; // Could be enhanced with actual distance calculation
        score += distanceScore;
        reasons.push('Distance: Optimal');
        
        // Operational status score (20% weight)
        const statusScore = drone.operationalStatus === 'operational' ? 20 : 0;
        score += statusScore;
        reasons.push(`Status: ${drone.operationalStatus}`);
        
        // Priority handling (10% weight)
        const priorityScore = orderContext.priority === 'urgent' ? 10 : 5;
        score += priorityScore;
        reasons.push(`Priority: ${orderContext.priority}`);
        
        scoredDrones.push({
            ...drone.toObject(),
            score,
            selectionReason: reasons.join(', ')
        });
    }
    
    return scoredDrones.sort((a, b) => b.score - a.score);
};

const calculateDeliveryTime = (drone, location) => {
    // Simplified calculation - could be enhanced with actual distance/time calculations
    const baseTime = 15; // minutes
    const batteryFactor = (100 - drone.battery) / 100; // Higher battery = faster
    return Math.round(baseTime + (batteryFactor * 10));
};
