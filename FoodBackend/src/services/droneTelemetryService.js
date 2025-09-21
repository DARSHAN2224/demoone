import { getIo } from './socket.js';
import { Drone } from '../models/droneModel.js';
import WebSocket from 'ws';

// Store connected drones
const connectedDrones = new Map();

/**
 * Creates a WebSocket connection to a specific drone bridge
 * @param {string} wsUrl - WebSocket URL for the drone bridge
 * @param {Object} io - Socket.IO instance for broadcasting
 * @param {string} droneId - Unique drone identifier
 * @returns {Object} WebSocket connection object
 */
export const droneTelemetryService = (wsUrl, io, droneId) => {
  console.log(`🔌 Creating WebSocket connection to ${droneId} at ${wsUrl}`);
  
  const wsConnection = new WebSocket(wsUrl);
  
  wsConnection.on('open', () => {
    console.log(`✅ Connected to drone ${droneId} at ${wsUrl}`);
    
    // Store connection info
    connectedDrones.set(droneId, {
      wsConnection,
      lastSeen: Date.now(),
      status: 'CONNECTED'
    });
    
    // Notify clients that drone is connected
    io.emit('drone_status', { 
      droneId, 
      status: 'CONNECTED',
      wsUrl,
      timestamp: new Date().toISOString()
    });
  });
  
  wsConnection.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📡 Received from ${droneId}:`, message);
      
      // Update last seen
      if (connectedDrones.has(droneId)) {
        connectedDrones.get(droneId).lastSeen = Date.now();
      }
      
      // Handle different message types
      if (message.type === 'drone_telemetry') {
        const telemetryData = message.payload;
        
        // Broadcast telemetry to frontend clients
        io.emit('drone_telemetry', {
          droneId,
          ...telemetryData,
          timestamp: new Date().toISOString()
        });
        
        // Update database
        await Drone.findOneAndUpdate(
          { droneId },
          {
            lastLocation: {
              type: 'Point',
              coordinates: [telemetryData.longitude_deg, telemetryData.latitude_deg],
            },
            batteryLevel: telemetryData.battery || 100,
            altitude: telemetryData.relative_altitude_m || 0,
            lastSeen: new Date(),
            status: 'active'
          },
          { upsert: true, new: true }
        );
        
      } else if (message.type === 'mission_update') {
        const missionData = message.payload;
        
        // Broadcast mission update to frontend clients
        io.emit('mission_update', {
          droneId,
          ...missionData,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`Error processing message from ${droneId}:`, error);
    }
  });
  
  wsConnection.on('close', () => {
    console.log(`🔌 Disconnected from drone ${droneId}`);
    
    // Update status
    if (connectedDrones.has(droneId)) {
      connectedDrones.get(droneId).status = 'DISCONNECTED';
    }
    
    // Notify clients
    io.emit('drone_status', { 
      droneId, 
      status: 'DISCONNECTED',
      timestamp: new Date().toISOString()
    });
    
    // Update database
    Drone.findOneAndUpdate(
      { droneId },
      { status: 'offline', lastSeen: new Date() }
    ).catch(console.error);
  });
  
  wsConnection.on('error', (error) => {
    console.error(`❌ WebSocket error for ${droneId}:`, error);
    
    // Update status
    if (connectedDrones.has(droneId)) {
      connectedDrones.get(droneId).status = 'ERROR';
    }
    
    // Notify clients
    io.emit('drone_status', { 
      droneId, 
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  });
  
  return wsConnection;
};

const initializeTelemetryService = () => {
    const io = getIo();
    
    // Handle drone bridge connections
    io.on('connection', (socket) => {
        console.log('🔗 New connection:', socket.id);
        
        // Handle drone telemetry data
        socket.on('drone:telemetry', async (telemetryData) => {
            try {
                const { droneId, lat, lng, alt, battery, mode, armed, speed, heading, timestamp } = telemetryData;

            if (!droneId) {
                console.warn('Received telemetry without a droneId. Discarding.');
                return;
            }
           
                // Store drone connection
                connectedDrones.set(droneId, {
                    socketId: socket.id,
                    lastSeen: Date.now(),
                    data: telemetryData
                });

                // Broadcast telemetry to all connected clients
                io.emit('drone:telemetry', telemetryData);
                
                // Also emit position updates for map tracking
                io.emit('drone:position', {
                    droneId,
                    lat,
                    lng,
                    alt,
                    timestamp
                });

                // Update drone in database
            await Drone.findOneAndUpdate(
                { droneId: droneId },
                {
                    lastLocation: {
                        type: 'Point',
                        coordinates: [lng, lat],
                    },
                    batteryLevel: battery,
                        flightMode: mode,
                        armed: armed,
                        speed: speed,
                        heading: heading,
                        lastSeen: new Date(timestamp),
                        status: 'active'
                    },
                    { upsert: true, new: true }
                );

                console.log(`📡 Drone ${droneId} telemetry: ${lat}, ${lng}, Alt: ${alt}m, Battery: ${battery}%`);

            } catch (error) {
                console.error('Error processing drone telemetry:', error);
            }
        });

        // Handle drone commands
        socket.on('drone:command', async (commandData) => {
            try {
                const { droneId, command, ...params } = commandData;
                
                if (!droneId) {
                    console.warn('Received command without a droneId. Discarding.');
                    return;
                }

                // Forward command to the appropriate drone
                const droneConnection = connectedDrones.get(droneId);
                if (droneConnection) {
                    // Emit command to the drone bridge
                    socket.emit('drone:command', commandData);
                    console.log(`🚁 Command sent to drone ${droneId}: ${command}`);
                } else {
                    console.warn(`Drone ${droneId} not connected`);
                }

            } catch (error) {
                console.error('Error processing drone command:', error);
            }
        });

        // Handle drone registration
        socket.on('drone:register', async (droneData) => {
            try {
                const { droneId, name, type, capabilities } = droneData;
                
                await Drone.findOneAndUpdate(
                    { droneId },
                    {
                        name: name || `Drone ${droneId}`,
                        type: type || 'delivery',
                        capabilities: capabilities || ['takeoff', 'land', 'navigate'],
                        status: 'available',
                        registeredAt: new Date()
                    },
                    { upsert: true, new: true }
                );

                console.log(`🚁 Drone ${droneId} registered successfully`);
                socket.emit('drone:registered', { success: true, droneId });

            } catch (error) {
                console.error('Error registering drone:', error);
                socket.emit('drone:registered', { success: false, error: error.message });
            }
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('🔌 Connection lost:', socket.id);
            
            // Find and remove disconnected drone
            for (const [droneId, connection] of connectedDrones.entries()) {
                if (connection.socketId === socket.id) {
                    connectedDrones.delete(droneId);
                    
                    // Update drone status in database
                    Drone.findOneAndUpdate(
                        { droneId },
                        { status: 'offline', lastSeen: new Date() }
                    ).catch(console.error);
                    
                    // Notify clients
                    io.emit('drone:status', { droneId, status: 'offline' });
                    console.log(`🚁 Drone ${droneId} disconnected`);
                    break;
                }
            }
        });
    });

    console.log('📡 Drone Telemetry Service initialized - listening for WebSocket connections');
};

// Get connected drones info
const getConnectedDrones = () => {
    return Array.from(connectedDrones.entries()).map(([droneId, data]) => ({
        droneId,
        lastSeen: data.lastSeen,
        status: 'active'
    }));
};

export {
    initializeTelemetryService,
    getConnectedDrones
};
