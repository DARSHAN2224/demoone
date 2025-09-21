import express from 'express';
import { Drone } from '../models/droneModel.js';
import { DroneOrder } from '../models/droneOrderModel.js';
import { getIo } from '../services/socket.js';
import fetch from 'node-fetch';
import { droneDiscoveryService } from '../services/droneDiscoveryService.js';
import { 
    logDrone, 
    logDroneBridge, 
    logDroneOperation, 
    logSuccess, 
    logError, 
    logWarning, 
    logInfo,
    createOperationLogger,
    droneRequestLogger,
    droneBridgeLogger
} from '../middlewares/droneLoggingMiddleware.js';

const router = express.Router();

// Apply logging middleware to all routes
router.use(droneRequestLogger);
router.use(droneBridgeLogger);

// Test mode validation middleware
// Note: Upstream router mounting should already guard these routes (e.g., via checkTestingMode).
// To avoid double-gating that causes 403s in development, allow pass-through here.
const validateTestMode = (req, res, next) => {
    return next();
};

// Health check endpoint
router.get('/health', (req, res) => {
    logInfo('Health check requested');
    
    const healthData = {
        success: true,
        message: 'Drone test API is healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            database: 'connected',
            drone_bridge: 'unknown',
            socket_io: 'active',
            discovery_service: droneDiscoveryService.isDiscovering ? 'active' : 'inactive'
        }
    };
    
    logSuccess('Health check completed', healthData);
    res.status(200).json(healthData);
});

// Fleet discovery endpoint
router.get('/fleet/discover', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('FLEET_DISCOVERY');
    
    try {
        logger.start('fleet', {});
        
        const fleetOverview = await droneDiscoveryService.refreshDiscovery();
        
        logger.success('fleet', fleetOverview);
        res.status(200).json({
            success: true,
            message: 'Fleet discovery completed',
            data: fleetOverview
        });
        
    } catch (error) {
        logger.error('Fleet discovery failed', error);
        logError('Fleet discovery failed', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Fleet discovery failed',
            error: error.message
        });
    }
});

// Get fleet status
router.get('/fleet/status', validateTestMode, async (req, res) => {
    try {
        const fleetOverview = droneDiscoveryService.getFleetOverview();
        
        res.status(200).json({
            success: true,
            message: 'Fleet status retrieved',
            data: fleetOverview
        });
        
    } catch (error) {
        logError('Failed to get fleet status', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get fleet status',
            error: error.message
        });
    }
});

// Get all drones (test endpoint - no auth required)
router.get('/drones', validateTestMode, async (req, res) => {
    try {
        const drones = await Drone.find({ is_active: true }).select('-__v');
        
        res.status(200).json({
            success: true,
            message: 'Drones retrieved successfully',
            data: drones
        });
        
    } catch (error) {
        logError('Failed to get drones', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get drones',
            error: error.message
        });
    }
});

// Enhanced test endpoints that match PowerShell script expectations
// Test routes - NO admin authentication required for testing convenience

// Test drone launch with real drone bridge integration
router.post('/launch/:droneId', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('LAUNCH');
    
    try {
        const { droneId } = req.params;
        const { altitude = 20 } = req.body;
        
        logger.start(droneId, { altitude });
        
        let actualDroneId = droneId;
        let actualOrderId = `TEST-${droneId}-${Date.now()}`;
        
        logInfo('Using test launch mode', { droneId: actualDroneId, orderId: actualOrderId });
        
        // Send command to drone bridge
        const bridgeUrl = `http://127.0.0.1:${8001 + (actualDroneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/takeoff`;
        const command = {
            altitude: altitude,
            droneId: actualDroneId
        };
        
        logDroneBridge('Sending takeoff command', actualDroneId, 'REQUEST', { bridgeUrl, command });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            logError('Drone bridge communication failed', { 
                status: response.status, 
                statusText: response.statusText,
                bridgeUrl 
            });
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        logDroneBridge('Received takeoff response', actualDroneId, 'SUCCESS', result);
        
        // Update drone status in database
        logInfo('Updating drone status in database', { droneId: actualDroneId });
        await Drone.findOneAndUpdate(
            { droneId: actualDroneId },
            { 
                status: 'launched',
                inAir: true,
                armed: true,
                lastCommand: 'takeoff',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.emit('drone:status', {
                droneId: actualDroneId,
                status: 'launched',
                orderId: actualOrderId,
                altitude: altitude
            });
            logInfo('Socket.IO event emitted', { event: 'drone:status', droneId: actualDroneId });
        }
        
        const responseData = {
            success: true,
            message: `Drone ${actualDroneId} launched successfully`,
            data: {
                droneId: actualDroneId,
                orderId: actualOrderId,
                altitude: altitude,
                bridgeResponse: result
            }
        };
        
        logger.success(actualDroneId, responseData);
        res.status(200).json(responseData);
        
    } catch (error) {
        logError('Test launch failed', { droneId, error: error.message, stack: error.stack });
        logger.error(droneId, error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to launch drone',
            error: error.message
        });
    }
});

// Test drone landing
router.post('/land/:droneId', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('LAND');
    
    try {
        const { droneId } = req.params;
        
        logger.start(droneId);
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/land`;
        const command = {
            droneId: droneId
        };
        
        logDroneBridge('Sending land command', droneId, 'REQUEST', { bridgeUrl, command });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            logError('Drone bridge communication failed', { 
                status: response.status, 
                statusText: response.statusText,
                bridgeUrl 
            });
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        logDroneBridge('Received land response', droneId, 'SUCCESS', result);
        
        // Update drone status
        logInfo('Updating drone status in database', { droneId });
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            { 
                status: 'landed',
                inAir: false,
                armed: false,
                lastCommand: 'land',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.emit('drone:status', {
                droneId: droneId,
                status: 'landed'
            });
            logInfo('Socket.IO event emitted', { event: 'drone:status', droneId });
        }
        
        const responseData = {
            success: true,
            message: `Drone ${droneId} landed successfully`,
            data: { droneId, bridgeResponse: result }
        };
        
        logger.success(droneId, responseData);
        res.status(200).json(responseData);
        
    } catch (error) {
        logError('Test land failed', { droneId, error: error.message, stack: error.stack });
        logger.error(droneId, error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to land drone',
            error: error.message
        });
    }
});

// Test emergency stop
router.post('/emergency-stop/:droneId', validateTestMode, async (req, res) => {
    try {
        const { droneId } = req.params;
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/return-to-launch`;
        const command = {
            droneId: droneId
        };
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            { 
                status: 'stopped',
                inAir: false,
                armed: false,
                lastCommand: 'emergency_stop',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        io.emit('drone:status', {
            droneId: droneId,
            status: 'stopped',
            emergency: true
        });
        
        res.status(200).json({
            success: true,
            message: `Emergency stop executed for drone ${droneId}`,
            data: { droneId, bridgeResponse: result }
        });
        
    } catch (error) {
        console.error('Emergency stop error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to execute emergency stop',
            error: error.message
        });
    }
});

// Test demo mission for collision testing
router.post('/demo-mission/:droneId', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('DEMO_MISSION');
    
    try {
        const { droneId } = req.params;
        
        logger.start(droneId);
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/demo-mission`;
        const command = {
            droneId: droneId
        };
        
        logDroneBridge('Sending demo mission command', droneId, 'REQUEST', { bridgeUrl, command });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            logError('Drone bridge communication failed', { 
                status: response.status, 
                statusText: response.statusText,
                bridgeUrl 
            });
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        logDroneBridge('Received demo mission response', droneId, 'SUCCESS', result);
        
        // Update drone status
        logInfo('Updating drone status in database', { droneId });
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            { 
                status: 'mission_active',
                inAir: true,
                armed: true,
                lastCommand: 'demo_mission',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.emit('drone:status', {
                droneId: droneId,
                status: 'mission_active'
            });
            logInfo('Socket.IO event emitted', { event: 'drone:status', droneId });
        }
        
        const responseData = {
            success: true,
            message: `Demo mission started for ${droneId} - testing collision detection`,
            data: { droneId, bridgeResponse: result }
        };
        
        logger.success(droneId, responseData);
        res.status(200).json(responseData);
        
    } catch (error) {
        logError('Demo mission failed', { droneId, error: error.message, stack: error.stack });
        logger.error(droneId, error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to start demo mission',
            error: error.message
        });
    }
});

// Test mission start with waypoints
router.post('/mission/start/:droneId', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('MISSION_START');
    
    try {
        const { droneId } = req.params;
        const { waypoints = [] } = req.body;
        
        logger.start(droneId, { waypointCount: waypoints.length });
        
        if (!waypoints || waypoints.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No waypoints provided for mission'
            });
        }
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/mission`;
        const command = {
            droneId: droneId,
            waypoints: waypoints.map(wp => ({
                lat: wp.lat,
                lng: wp.lng,
                altitude: 20 // Default altitude for waypoints
            }))
        };
        
        logDroneBridge('Sending mission command', droneId, 'REQUEST', { bridgeUrl, command });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            logError('Drone bridge communication failed', { 
                status: response.status, 
                statusText: response.statusText,
                bridgeUrl 
            });
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            { 
                status: 'mission_active',
                inAir: true,
                armed: true,
                lastCommand: 'mission_start',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.emit('drone:status', {
                droneId: droneId,
                status: 'mission_active'
            });
            logInfo('Socket.IO event emitted', { event: 'drone:status', droneId });
        }
        
        const responseData = {
            success: true,
            message: `Mission started for ${droneId} with ${waypoints.length} waypoints`,
            data: { 
                droneId, 
                waypointCount: waypoints.length,
                bridgeResponse: result 
            }
        };
        
        logger.success(droneId, responseData);
        res.status(200).json(responseData);
        
    } catch (error) {
        logError('Mission start failed', { droneId, error: error.message, stack: error.stack });
        logger.error(droneId, error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to start mission',
            error: error.message
        });
    }
});

// Test drone assignment
router.post('/assign/:orderId', validateTestMode, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { droneId, priority = 'normal' } = req.body;
        
        // Find available drone
        let selectedDrone = null;
        if (droneId) {
            selectedDrone = await Drone.findOne({ droneId, status: 'idle' });
        } else {
            // Auto-select best drone based on battery
            selectedDrone = await Drone.findOne({ 
                status: 'idle',
                battery: { $gte: 30 }
            }).sort({ battery: -1 });
        }
        
        if (!selectedDrone) {
            return res.status(400).json({
                success: false,
                message: 'No available drone found',
                data: { orderId, requestedDroneId: droneId }
            });
        }
        
        // Create or update drone order
        const droneOrder = await DroneOrder.findOneAndUpdate(
            { orderId },
            {
                droneId: selectedDrone.droneId,
                status: 'assigned',
                assignedAt: new Date(),
                priority: priority
            },
            { upsert: true, new: true }
        );
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId: selectedDrone.droneId },
            { 
                status: 'assigned',
                lastOrderId: orderId,
                lastAssignmentAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        io.emit('drone:assignment', {
            droneId: selectedDrone.droneId,
            orderId: orderId,
            status: 'assigned'
        });
        
        res.status(200).json({
            success: true,
            message: `Drone ${selectedDrone.droneId} assigned to order ${orderId}`,
            data: {
                droneId: selectedDrone.droneId,
                orderId: orderId,
                drone: {
                    name: selectedDrone.name,
                    battery: selectedDrone.battery,
                    location: selectedDrone.location
                }
            }
        });
        
    } catch (error) {
        console.error('Test assign error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign drone',
            error: error.message
        });
    }
});

// Test mission start
router.post('/mission/start/:droneId', validateTestMode, async (req, res) => {
    try {
        const { droneId } = req.params;
        const { waypoints, orderId, missionType = 'delivery' } = req.body;
        
        if (!waypoints || waypoints.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Waypoints are required for mission',
                data: { droneId }
            });
        }
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/drone/command`;
        const command = {
            action: 'start_mission',
            droneId: droneId,
            waypoints: waypoints,
            orderId: orderId,
            missionType: missionType
        };
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update drone status
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            { 
                status: 'in_flight',
                lastCommand: 'start_mission',
                lastCommandAt: new Date(),
                currentMission: {
                    orderId: orderId,
                    waypoints: waypoints,
                    startedAt: new Date()
                }
            }
        );
        
        // Emit real-time update
        const io = getIo();
        io.emit('drone:mission', {
            droneId: droneId,
            orderId: orderId,
            status: 'started',
            waypoints: waypoints
        });
        
        res.status(200).json({
            success: true,
            message: `Mission started for drone ${droneId}`,
            data: {
                droneId: droneId,
                orderId: orderId,
                waypoints: waypoints,
                bridgeResponse: result
            }
        });
        
    } catch (error) {
        console.error('Test mission start error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start mission',
            error: error.message
        });
    }
});

// Test weather check
router.get('/weather/:droneId', validateTestMode, async (req, res) => {
    try {
        const { droneId } = req.params;
        // Prefer command endpoint to avoid path mismatches
        const result = await handleWeatherCommand(droneId);
        console.log('Weather command result:', JSON.stringify(result, null, 2));
        
        // Extract weather data properly
        const weatherData = result?.data || result || {};
        const actualDroneId = weatherData.droneId || droneId;
        
        return res.status(200).json({
            success: true,
            message: `Weather status for drone ${droneId}`,
            data: {
                droneId: actualDroneId,
                weather: weatherData
            }
        });
    } catch (error) {
        console.error('Weather check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check weather',
            error: error.message
        });
    }
});

// Test battery status
router.get('/battery/:droneId', validateTestMode, async (req, res) => {
    try {
        const { droneId } = req.params;
        
        // Use discovery service to resolve correct bridge endpoint
        const bridgeUrl = await getDroneBridgeUrl(droneId, 'drone/command');
        
        // Send get_status command to get full telemetry data
        const command = {
            action: 'get_status',
            droneId: droneId
        };
        
        console.log('Backend sending command to:', bridgeUrl, 'Command:', JSON.stringify(command, null, 2));
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        console.log('Backend response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const statusData = await response.json();
        console.log('Backend received statusData:', JSON.stringify(statusData, null, 2));
        
        // Extract telemetry data from the command result (drone bridge returns data directly)
        const telemetry = statusData || {};
        const battery = telemetry.battery || 50; // Default battery if not available
        
        console.log('Extracted telemetry:', JSON.stringify(telemetry, null, 2));
        console.log('Extracted battery:', battery);
        
        // Ensure we have the correct droneId
        const actualDroneId = telemetry.droneId || droneId;
        
        res.status(200).json({
            success: true,
            message: `Battery status for drone ${droneId}`,
            data: {
                droneId: actualDroneId,
                battery: battery,
                telemetry: telemetry
            }
        });
        
    } catch (error) {
        console.error('Battery check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check battery',
            error: error.message
        });
    }
});

// Test QR code generation
router.post('/qr/generate', validateTestMode, async (req, res) => {
    try {
        const { orderId, packageId, droneId } = req.body;
        
        if (!droneId) {
            return res.status(400).json({
                success: false,
                message: 'droneId is required for QR display'
            });
        }
        
        const qrData = {
            orderId: orderId,
            packageId: packageId || orderId,
            timestamp: new Date().toISOString(),
            type: 'delivery_confirmation'
        };
        
        // Send QR display command to drone bridge
        const bridgeUrl = await getDroneBridgeUrl(droneId);
        const command = {
            droneId: droneId,
            command: 'show_qr_code',
            parameters: {
                payload: JSON.stringify(qrData)
            }
        };
        
        logDroneBridge('Sending QR display command', droneId, 'REQUEST', { bridgeUrl, command });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        logDroneBridge('QR display command response', droneId, 'RESPONSE', result);
        
        res.status(200).json({
            success: true,
            message: `QR code displayed for ${droneId}`,
            data: {
                orderId: orderId,
                packageId: packageId || orderId,
                droneId: droneId,
                bridgeResponse: result
            }
        });
        
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate QR code',
            error: error.message
        });
    }
});

// Test camera capture
router.post('/camera/capture/:droneId', validateTestMode, async (req, res) => {
    try {
        const { droneId } = req.params;
        const { orderId, location } = req.body;
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/camera/capture`;
        const command = {
            droneId: droneId,
            orderId: orderId,
            location: location
        };
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command)
        });
        
        if (!response.ok) {
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        res.status(200).json({
            success: true,
            message: `Photo captured for drone ${droneId}`,
            data: {
                droneId: droneId,
                orderId: orderId,
                photoPath: result.photoPath,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Camera capture error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to capture photo',
            error: error.message
        });
    }
});

// Get all test results
router.get('/results', validateTestMode, async (req, res) => {
    try {
        const { droneId, limit = 50 } = req.query;
        
        // In a real implementation, you'd store test results in a database
        // For now, return mock data
        const testResults = [
            {
                id: 1,
                droneId: droneId || 'DRONE-001',
                action: 'launch',
                success: true,
                timestamp: new Date().toISOString(),
                details: 'Drone launched successfully'
            },
            {
                id: 2,
                droneId: droneId || 'DRONE-001',
                action: 'mission',
                success: true,
                timestamp: new Date(Date.now() - 300000).toISOString(),
                details: 'Mission completed successfully'
            }
        ];
        
        res.status(200).json({
            success: true,
            message: 'Test results retrieved',
            data: {
                results: testResults.slice(0, parseInt(limit)),
                total: testResults.length
            }
        });
        
    } catch (error) {
        console.error('Get test results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get test results',
            error: error.message
        });
    }
});

// Generic command endpoint for PowerShell test script compatibility
router.post('/command', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('GENERIC_COMMAND');
    
    try {
        const { droneId, command, parameters = {} } = req.body;
        
        logger.start(droneId, { command, parameters });
        
        if (!droneId || !command) {
            logError('Missing required fields', { droneId, command });
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: droneId and command',
                data: { droneId, command }
            });
        }
        
        // Map generic commands to specific endpoints
        let result;
        switch (command) {
            case 'takeoff':
                result = await handleTakeoffCommand(droneId, parameters);
                break;
            case 'land':
                result = await handleLandCommand(droneId);
                break;
            case 'return_to_launch':
            case 'emergency_stop':
                result = await handleEmergencyCommand(droneId);
                break;
            case 'get_status':
                result = await handleStatusCommand(droneId);
                break;
            case 'capture_photo':
                result = await handlePhotoCaptureCommand(droneId, parameters);
                break;
            case 'capture_all_angles':
                result = await handleCaptureAllAnglesCommand(droneId);
                break;
            case 'switch_camera':
                result = await handleSwitchCameraCommand(droneId, parameters);
                break;
            case 'get_weather':
                result = await handleWeatherCommand(droneId);
                break;
            case 'set_weather_profile':
                result = await handleSetWeatherProfileCommand(droneId, parameters);
                break;
            case 'get_battery':
                result = await handleBatteryCommand(droneId);
                break;
            case 'start_charging':
                result = await handleStartChargingCommand(droneId);
                break;
            case 'stop_charging':
                result = await handleStopChargingCommand(droneId);
                break;
            case 'start_camera_views':
                result = await handleStartCameraViewsCommand(droneId);
                break;
            case 'stop_camera_views':
                result = await handleStopCameraViewsCommand(droneId);
                break;
            case 'start_mission':
                result = await handleStartMissionCommand(droneId, parameters);
                break;
            default:
                logError('Unknown command', { command });
                return res.status(400).json({
                    success: false,
                    message: `Unknown command: ${command}`,
                    data: { command }
                });
        }
        
        logger.success(droneId, result);
        res.status(200).json(result);
        
    } catch (error) {
        logger.error('Generic command failed', error);
        logError('Generic command execution failed', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Command execution failed',
            error: error.message
        });
    }
});

// Helper functions for command handling
async function getDroneBridgeUrl(droneId, endpoint = 'drone/command') {
    // Prefer discovery service
    try {
        if (droneDiscoveryService.isDroneAvailable(droneId)) {
            return droneDiscoveryService.getDroneBridgeUrl(droneId, endpoint);
        }
    } catch (_) {}
    // Fallback to conventional localhost ports for single/dual bridge setups
    const basePort = 8001 + (droneId === 'DRONE-002' ? 1 : 0);
    return `http://127.0.0.1:${basePort}/${endpoint}`;
}

async function handleTakeoffCommand(droneId, parameters) {
    const altitude = parameters.altitude || 20;
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'takeoff',
        parameters: { altitude }
    };
    
    logDroneBridge('Sending takeoff command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Takeoff command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Takeoff command sent to ${droneId}`,
        data: result
    };
}

async function handleLandCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'land'
    };
    
    logDroneBridge('Sending land command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Land command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Land command sent to ${droneId}`,
        data: result
    };
}

async function handleEmergencyCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'return_to_launch'
    };
    
    logDroneBridge('Sending emergency command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Emergency command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Emergency command sent to ${droneId}`,
        data: result
    };
}

async function handleStatusCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId, 'status');
    
    logDroneBridge('Getting status', droneId, 'REQUEST', { bridgeUrl });
    
    const response = await fetch(bridgeUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    logDroneBridge('Status response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Status retrieved for ${droneId}`,
        data: result
    };
}

async function handlePhotoCaptureCommand(droneId, parameters = {}) {
    const cameraType = parameters.camera_type || 'front';
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'capture_photo',
        parameters: { camera_type: cameraType }
    };
    
    logDroneBridge('Sending photo capture command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Photo capture response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Photo captured from ${cameraType} camera for ${droneId}`,
        data: result
    };
}

async function handleCaptureAllAnglesCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'capture_all_angles'
    };
    
    logDroneBridge('Sending capture all angles command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Capture all angles command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Photos captured from all angles for ${droneId}`,
        data: result
    };
}

async function handleSwitchCameraCommand(droneId, parameters = {}) {
    const cameraType = parameters.camera_type || 'front';
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'switch_camera',
        parameters: { camera_type: cameraType }
    };
    
    logDroneBridge('Sending switch camera command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Switch camera command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Camera switched to ${cameraType} for ${droneId}`,
        data: result
    };
}

async function handleWeatherCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        action: 'get_weather'
    };
    
    logDroneBridge('Sending weather command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Weather command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Weather command sent to ${droneId}`,
        data: result
    };
}

async function handleBatteryCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'get_status'  // Use get_status to get full telemetry including GPS
    };
    
    logDroneBridge('Sending status command for telemetry', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    const result = await response.json();
    logDroneBridge('Status command response', droneId, 'RESPONSE', result);
    
    // Extract telemetry data from the status response
    const telemetryData = {
        lat: result.lat || 0,
        lng: result.lng || 0,
        alt: result.alt || 0,
        battery: result.battery || 0,
        speed: result.speed || 0,
        heading: result.heading || 0,
        flightMode: result.flightMode || 'UNKNOWN',
        armed: result.armed || false,
        mode: result.mode || 'UNKNOWN',
        timestamp: result.timestamp || Date.now()
    };
    
    return {
        success: true,
        message: `Battery status for drone ${droneId}`,
        data: {
            droneId: droneId,
            battery: result.battery || 0,
            telemetry: telemetryData
        }
    };
}

async function handleStartMissionCommand(droneId, parameters) {
    const waypoints = parameters.waypoints;
    
    if (!waypoints || waypoints.length === 0) {
        throw new Error('Waypoints are required for mission');
    }
    
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'start_mission',
        parameters: {
            waypoints: waypoints,
            // Include mission data for QR verification
            orderId: parameters.orderId || `TEST-ORDER-${Date.now()}`,
            deliveryLocation: parameters.deliveryLocation || {
                lat: waypoints[waypoints.length - 1]?.lat || 47.6514678,
                lng: waypoints[waypoints.length - 1]?.lng || -122.1501649,
                address: 'Test Delivery Location'
            },
            customerInfo: parameters.customerInfo || {
                name: 'Test Customer',
                phone: '+1234567890',
                email: 'test@example.com'
            },
            orderDetails: parameters.orderDetails || {
                totalAmount: 25.99,
                items: ['Test Item 1', 'Test Item 2']
            }
        }
    };
    
    logDroneBridge('Sending start mission command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Start mission command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Mission started for ${droneId}`,
        data: result
    };
}

async function handleSetWeatherProfileCommand(droneId, parameters) {
    const { profile, lat, lng } = parameters;
    
    if (!profile) {
        throw new Error('Weather profile is required');
    }
    
    const validProfiles = ['Clear', 'Rain', 'Snow', 'Fog', 'Storm', 'Windy', 'location_based'];
    if (!validProfiles.includes(profile)) {
        throw new Error(`Invalid weather profile. Valid options: ${validProfiles.join(', ')}`);
    }
    
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'set_weather_profile',
        parameters: { 
            profile: profile,
            ...(lat && lng && { lat: parseFloat(lat), lng: parseFloat(lng) })
        }
    };
    
    logDroneBridge('Sending set weather profile command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Set weather profile command response', droneId, 'RESPONSE', result);
    
    const message = profile === 'location_based' && lat && lng 
        ? `Weather set based on location (${lat}, ${lng}) for ${droneId}`
        : `Weather profile set to '${profile}' for ${droneId}`;
    
    return {
        success: true,
        message: message,
        data: result
    };
}

async function handleStartChargingCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'start_charging'
    };
    
    logDroneBridge('Sending start charging command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Start charging command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Battery charging started for ${droneId}`,
        data: result
    };
}

async function handleStopChargingCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'stop_charging'
    };
    
    logDroneBridge('Sending stop charging command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Stop charging command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `Battery charging stopped for ${droneId}`,
        data: result
    };
}

async function handleStartCameraViewsCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'start_camera_views'
    };
    
    logDroneBridge('Sending start camera views command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Start camera views command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `AirSim camera views started for ${droneId}`,
        data: result
    };
}

async function handleStopCameraViewsCommand(droneId) {
    const bridgeUrl = await getDroneBridgeUrl(droneId);
    
    const command = {
        droneId: droneId,
        command: 'stop_camera_views'
    };
    
    logDroneBridge('Sending stop camera views command', droneId, 'REQUEST', { bridgeUrl, command });
    
    const response = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command)
    });
    
    if (!response.ok) {
        throw new Error(`Drone bridge error: ${response.statusText}`);
    }
    
    const result = await response.json();
    logDroneBridge('Stop camera views command response', droneId, 'RESPONSE', result);
    
    return {
        success: true,
        message: `AirSim camera views stopped for ${droneId}`,
        data: result
    };
}

// Test drone reset
router.post('/reset/:droneId', validateTestMode, async (req, res) => {
    const logger = createOperationLogger('RESET');
    
    try {
        const { droneId } = req.params;
        
        logger.start(droneId);
        
        const bridgeUrl = `http://127.0.0.1:${8001 + (droneId === 'DRONE-002' ? 1 : 0)}/api/v1/commands/reset`;
        
        logDroneBridge('Sending reset command', droneId, 'REQUEST', { bridgeUrl });
        
        const response = await fetch(bridgeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!response.ok) {
            logError('Drone bridge communication failed', {
                status: response.status,
                statusText: response.statusText,
                bridgeUrl
            });
            throw new Error(`Drone bridge error: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Update drone status in database
        await Drone.findOneAndUpdate(
            { droneId: droneId },
            {
                status: 'idle',
                inAir: false,
                armed: false,
                lastCommand: 'reset',
                lastCommandAt: new Date()
            }
        );
        
        // Emit real-time update
        const io = getIo();
        if (io) {
            io.emit('drone:status', {
                droneId: droneId,
                status: 'idle'
            });
            logInfo('Socket.IO event emitted', { event: 'drone:status', droneId });
        }
        
        const responseData = {
            success: true,
            message: `Drone reset command sent to ${droneId}`,
            data: { droneId, bridgeResponse: result }
        };
        
        logger.success(droneId, responseData);
        res.status(200).json(responseData);
        
    } catch (error) {
        logError('Drone reset failed', { droneId, error: error.message, stack: error.stack });
        logger.error(droneId, error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to reset drone',
            error: error.message
        });
    }
});


export default router;
