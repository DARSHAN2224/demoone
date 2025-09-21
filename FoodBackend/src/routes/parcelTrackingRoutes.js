import express from 'express';
import { verifyJWT, verifySellerJWT, verifyAdminJWT } from '../middlewares/authMiddleware.js';
import { DroneOrder } from '../models/droneOrderModel.js';
import { Drone } from '../models/droneModel.js';
import Order  from '../models/ordersModel.js';
import { getIo } from '../services/socket.js';

const router = express.Router();

// ==================== USER PARCEL TRACKING ROUTES ====================

// Get user's active parcel deliveries (Amazon-style)
router.get('/user/active-parcels', verifyJWT, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const activeParcels = await DroneOrder.find({
            userId,
            status: { $in: ['assigned', 'preparing', 'ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery'] }
        })
        .populate('orderId', 'items totalPrice')
        .populate('droneId', 'droneId name model status location battery altitude speed')
        .populate('sellerId', 'name address')
        .sort({ createdAt: -1 });
        
        const formattedParcels = activeParcels.map(parcel => {
            // Create Amazon-style timeline
            const timeline = createParcelTimeline(parcel);
            
            return {
                id: parcel._id,
                orderId: parcel.orderId._id,
                status: parcel.status,
                progress: parcel.deliveryProgress,
                product: {
                    name: parcel.orderId?.items?.[0]?.name || 'Food Order',
                    image: parcel.orderId?.items?.[0]?.image || '/api/placeholder/80/80',
                    quantity: parcel.orderId?.items?.length || 1,
                    price: parcel.pricing?.totalPrice || 0
                },
                delivery: {
                    estimatedDate: formatDeliveryDate(parcel.timing.estimatedDeliveryTime),
                    previousDate: formatDeliveryDate(parcel.timing.estimatedDeliveryTime, -1),
                    time: formatDeliveryTime(parcel.timing.estimatedDeliveryTime),
                    address: parcel.location.delivery.address,
                    recipient: parcel.location.delivery.contactPerson || 'Customer'
                },
                drone: parcel.droneId ? {
                    id: parcel.droneId.droneId,
                    name: parcel.droneId.name,
                    battery: parcel.droneId.battery,
                    speed: parcel.droneId.speed,
                    altitude: parcel.droneId.altitude,
                    location: {
                        lat: parcel.droneId.location.lat,
                        lng: parcel.droneId.location.lng
                    }
                } : null,
                timeline,
                seller: parcel.sellerId ? {
                    name: parcel.sellerId.name,
                    address: parcel.sellerId.address
                } : null
            };
        });
        
        res.status(200).json({
            success: true,
            data: {
                activeParcels: formattedParcels
            },
            message: 'Active parcel deliveries retrieved successfully'
        });
    } catch (error) {
        console.error('Get active parcels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve active parcels',
            error: error.message
        });
    }
});

// Get parcel tracking details by order ID
router.get('/user/track/:orderId', verifyJWT, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;
        
        const parcel = await DroneOrder.findOne({
            orderId,
            userId
        })
        .populate('orderId', 'items totalPrice')
        .populate('droneId', 'droneId name model status location battery altitude speed heading')
        .populate('sellerId', 'name address phone');
        
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcel not found'
            });
        }
        
        const timeline = createParcelTimeline(parcel);
        
        res.status(200).json({
            success: true,
            data: {
                parcel: {
                    id: parcel._id,
                    orderId: parcel.orderId._id,
                    status: parcel.status,
                    progress: parcel.deliveryProgress,
                    product: {
                        name: parcel.orderId?.items?.[0]?.name || 'Food Order',
                        image: parcel.orderId?.items?.[0]?.image || '/api/placeholder/80/80',
                        quantity: parcel.orderId?.items?.length || 1,
                        price: parcel.pricing?.totalPrice || 0
                    },
                    delivery: {
                        estimatedDate: formatDeliveryDate(parcel.timing.estimatedDeliveryTime),
                        previousDate: formatDeliveryDate(parcel.timing.estimatedDeliveryTime, -1),
                        time: formatDeliveryTime(parcel.timing.estimatedDeliveryTime),
                        address: parcel.location.delivery.address,
                        recipient: parcel.location.delivery.contactPerson || 'Customer',
                        instructions: parcel.location.delivery.instructions
                    },
                    drone: parcel.droneId ? {
                        id: parcel.droneId.droneId,
                        name: parcel.droneId.name,
                        battery: parcel.droneId.battery,
                        speed: parcel.droneId.speed,
                        altitude: parcel.droneId.altitude,
                        heading: parcel.droneId.heading,
                        location: {
                            lat: parcel.droneId.location.lat,
                            lng: parcel.droneId.location.lng
                        }
                    } : null,
                    timeline,
                    seller: parcel.sellerId ? {
                        name: parcel.sellerId.name,
                        address: parcel.sellerId.address,
                        phone: parcel.sellerId.phone
                    } : null,
                    route: parcel.route,
                    preferences: parcel.preferences
                }
            },
            message: 'Parcel tracking details retrieved successfully'
        });
    } catch (error) {
        console.error('Get parcel tracking error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve parcel tracking details',
            error: error.message
        });
    }
});

// Update delivery instructions
router.patch('/user/update-instructions/:orderId', verifyJWT, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { instructions } = req.body;
        const userId = req.user._id;
        
        const parcel = await DroneOrder.findOneAndUpdate(
            { orderId, userId },
            { 
                'location.delivery.instructions': instructions,
                'preferences.deliveryInstructions': instructions
            },
            { new: true }
        );
        
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcel not found'
            });
        }
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.to(`parcel:${orderId}`).emit('parcel:instructions_updated', {
                orderId,
                instructions,
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Delivery instructions updated successfully'
        });
    } catch (error) {
        console.error('Update instructions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update delivery instructions',
            error: error.message
        });
    }
});

// Cancel parcel delivery
router.post('/user/cancel/:orderId', verifyJWT, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.user._id;
        
        const parcel = await DroneOrder.findOneAndUpdate(
            { orderId, userId, status: { $in: ['assigned', 'preparing', 'ready_for_pickup'] } },
            { 
                status: 'cancelled',
                'incidents': [{
                    type: 'other',
                    description: `Order cancelled by user: ${reason || 'No reason provided'}`,
                    severity: 'medium',
                    timestamp: new Date()
                }]
            },
            { new: true }
        );
        
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcel not found or cannot be cancelled'
            });
        }
        
        // Release drone if assigned
        if (parcel.droneId) {
            await Drone.findByIdAndUpdate(parcel.droneId, {
                status: 'idle',
                currentAssignment: {}
            });
        }
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.to(`parcel:${orderId}`).emit('parcel:cancelled', {
                orderId,
                reason,
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Parcel delivery cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel parcel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel parcel delivery',
            error: error.message
        });
    }
});

// ==================== SELLER PARCEL MANAGEMENT ROUTES ====================

// Get seller's parcel deliveries
router.get('/seller/parcels', verifySellerJWT, async (req, res) => {
    try {
        const sellerId = req.seller._id;
        const { status, page = 1, limit = 10 } = req.query;
        
        const filter = { sellerId };
        if (status) {
            filter.status = status;
        }
        
        const parcels = await DroneOrder.find(filter)
        .populate('orderId', 'items totalPrice')
        .populate('userId', 'name email mobile')
        .populate('droneId', 'droneId name model status location battery')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
        
        const total = await DroneOrder.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: {
                parcels: parcels.map(parcel => ({
                    id: parcel._id,
                    orderId: parcel.orderId._id,
                    status: parcel.status,
                    progress: parcel.deliveryProgress,
                    customer: parcel.userId ? {
                        name: parcel.userId.name,
                        email: parcel.userId.email,
                        mobile: parcel.userId.mobile
                    } : null,
                    drone: parcel.droneId ? {
                        id: parcel.droneId.droneId,
                        name: parcel.droneId.name,
                        status: parcel.droneId.status,
                        battery: parcel.droneId.battery
                    } : null,
                    delivery: {
                        address: parcel.location.delivery.address,
                        estimatedTime: parcel.timing.estimatedDeliveryTime,
                        instructions: parcel.location.delivery.instructions
                    },
                    createdAt: parcel.createdAt
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            },
            message: 'Seller parcels retrieved successfully'
        });
    } catch (error) {
        console.error('Get seller parcels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve seller parcels',
            error: error.message
        });
    }
});

// Update parcel status (seller)
router.patch('/seller/update-status/:orderId', verifySellerJWT, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes } = req.body;
        const sellerId = req.seller._id;
        
        const parcel = await DroneOrder.findOneAndUpdate(
            { orderId, sellerId },
            { 
                status,
                'statusHistory': {
                    $push: {
                        status,
                        timestamp: new Date(),
                        notes: notes || `Status updated to ${status} by seller`,
                        updatedBy: sellerId,
                        updatedByModel: 'Seller'
                    }
                }
            },
            { new: true }
        );
        
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcel not found'
            });
        }
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.to(`parcel:${orderId}`).emit('parcel:status_updated', {
                orderId,
                status,
                notes,
                updatedBy: 'seller',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Parcel status updated successfully'
        });
    } catch (error) {
        console.error('Update parcel status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update parcel status',
            error: error.message
        });
    }
});

// ==================== ADMIN PARCEL OVERSIGHT ROUTES ====================

// Get all parcels (admin)
router.get('/admin/all-parcels', verifyAdminJWT, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        const filter = {};
        if (status) {
            filter.status = status;
        }
        
        const parcels = await DroneOrder.find(filter)
        .populate('orderId', 'items totalPrice')
        .populate('userId', 'name email')
        .populate('sellerId', 'name')
        .populate('droneId', 'droneId name model status location battery')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
        
        const total = await DroneOrder.countDocuments(filter);
        
        // Get statistics
        const stats = await getParcelStatistics();
        
        res.status(200).json({
            success: true,
            data: {
                parcels: parcels.map(parcel => ({
                    id: parcel._id,
                    orderId: parcel.orderId._id,
                    status: parcel.status,
                    progress: parcel.deliveryProgress,
                    customer: parcel.userId ? {
                        name: parcel.userId.name,
                        email: parcel.userId.email
                    } : null,
                    seller: parcel.sellerId ? {
                        name: parcel.sellerId.name
                    } : null,
                    drone: parcel.droneId ? {
                        id: parcel.droneId.droneId,
                        name: parcel.droneId.name,
                        status: parcel.droneId.status,
                        battery: parcel.droneId.battery
                    } : null,
                    delivery: {
                        address: parcel.location.delivery.address,
                        estimatedTime: parcel.timing.estimatedDeliveryTime
                    },
                    createdAt: parcel.createdAt
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                },
                statistics: stats
            },
            message: 'All parcels retrieved successfully'
        });
    } catch (error) {
        console.error('Get all parcels error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve all parcels',
            error: error.message
        });
    }
});

// Force update parcel status (admin)
router.patch('/admin/force-update/:orderId', verifyAdminJWT, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, notes, reason } = req.body;
        const adminId = req.admin._id;
        
        const parcel = await DroneOrder.findOneAndUpdate(
            { orderId },
            { 
                status,
                'statusHistory': {
                    $push: {
                        status,
                        timestamp: new Date(),
                        notes: notes || `Status force updated to ${status} by admin: ${reason || 'No reason provided'}`,
                        updatedBy: adminId,
                        updatedByModel: 'Admin'
                    }
                }
            },
            { new: true }
        );
        
        if (!parcel) {
            return res.status(404).json({
                success: false,
                message: 'Parcel not found'
            });
        }
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.to(`parcel:${orderId}`).emit('parcel:status_force_updated', {
                orderId,
                status,
                notes,
                reason,
                updatedBy: 'admin',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Parcel status force updated successfully'
        });
    } catch (error) {
        console.error('Force update parcel status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to force update parcel status',
            error: error.message
        });
    }
});

// ==================== REAL-TIME PARCEL UPDATES ====================

// Update parcel telemetry (from drone bridge)
router.post('/telemetry/update', async (req, res) => {
    try {
        const { orderId, droneId, location, battery, altitude, speed, heading, status } = req.body;
        
        if (!orderId || !droneId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Drone ID are required'
            });
        }
        
        // Update drone telemetry
        await Drone.findOneAndUpdate(
            { droneId },
            {
                location,
                battery,
                altitude,
                speed,
                heading,
                status,
                lastActive: new Date()
            }
        );
        
        // Update parcel with current location
        await DroneOrder.findOneAndUpdate(
            { orderId },
            {
                $push: {
                    'route.actualPath': {
                        lat: location.lat,
                        lng: location.lng,
                        altitude,
                        speed,
                        timestamp: new Date()
                    }
                }
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.to(`parcel:${orderId}`).emit('parcel:telemetry_update', {
                orderId,
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
        
        res.status(200).json({
            success: true,
            message: 'Parcel telemetry updated successfully'
        });
    } catch (error) {
        console.error('Update parcel telemetry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update parcel telemetry',
            error: error.message
        });
    }
});

// ==================== HELPER FUNCTIONS ====================

function createParcelTimeline(parcel) {
    const statusOrder = [
        { status: 'ordered', label: 'Ordered', completed: true },
        { status: 'preparing', label: 'Preparing', completed: ['preparing', 'ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery', 'delivered'].includes(parcel.status) },
        { status: 'shipped', label: 'Shipped', completed: ['ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery', 'delivered'].includes(parcel.status) },
        { status: 'in_transit', label: 'Out for delivery', completed: ['picked_up', 'in_transit', 'approaching_delivery', 'delivered'].includes(parcel.status) },
        { status: 'delivered', label: 'Delivered', completed: parcel.status === 'delivered' }
    ];
    
    return statusOrder.map((step, index) => ({
        status: step.status,
        label: step.label,
        completed: step.completed,
        time: getTimelineTime(parcel, step.status, index)
    }));
}

function getTimelineTime(parcel, status, index) {
    const now = new Date();
    const times = {
        'ordered': parcel.createdAt,
        'preparing': parcel.timing.estimatedPickupTime || new Date(now.getTime() + 5 * 60 * 1000),
        'shipped': parcel.timing.estimatedPickupTime || new Date(now.getTime() + 10 * 60 * 1000),
        'in_transit': parcel.timing.estimatedDeliveryTime || new Date(now.getTime() + 20 * 60 * 1000),
        'delivered': parcel.timing.actualDeliveryTime || parcel.timing.estimatedDeliveryTime
    };
    
    const time = times[status];
    if (!time) return 'TBD';
    
    return formatTimelineTime(time, index === statusOrder.length - 1);
}

function formatTimelineTime(time, isLast) {
    if (!time) return 'TBD';
    
    const now = new Date();
    const timeDate = new Date(time);
    
    if (isLast && timeDate > now) {
        return `Estimated ${timeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `${timeDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${timeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatDeliveryDate(estimatedTime, dayOffset = 0) {
    if (!estimatedTime) return 'TBD';
    
    const date = new Date(estimatedTime);
    date.setDate(date.getDate() + dayOffset);
    
    return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatDeliveryTime(estimatedTime) {
    if (!estimatedTime) return 'TBD';
    
    const date = new Date(estimatedTime);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

async function getParcelStatistics() {
    const total = await DroneOrder.countDocuments();
    const active = await DroneOrder.countDocuments({ 
        status: { $in: ['assigned', 'preparing', 'ready_for_pickup', 'drone_en_route', 'picked_up', 'in_transit', 'approaching_delivery'] } 
    });
    const delivered = await DroneOrder.countDocuments({ status: 'delivered' });
    const failed = await DroneOrder.countDocuments({ status: 'failed' });
    const cancelled = await DroneOrder.countDocuments({ status: 'cancelled' });
    
    return {
        total,
        active,
        delivered,
        failed,
        cancelled,
        successRate: total > 0 ? ((delivered / (delivered + failed)) * 100).toFixed(1) : 0
    };
}

export default router;
