import { Server } from 'socket.io';
import DroneSocketHandler from '../socket/droneSocketHandler.js';

let ioInstance = null;
let droneSocketHandler = null;

const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });
  
  console.log('🔌 Socket.IO server initialized');

  // Namespace for browser clients
  const browserNs = ioInstance.of('/browser');

  // Initialize drone socket handler (existing app namespace usage remains)
  droneSocketHandler = new DroneSocketHandler(ioInstance);
  droneSocketHandler.initialize();
  console.log('🚁 Drone socket handler initialized');

  // Accept generic updates (e.g., from Python bridge client) and relay to browser namespace
  ioInstance.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Relay bridge events to browser namespace with frontend-expected names
    socket.on('drone:status', (data) => {
      try {
        browserNs.emit('drone:update', data);
        browserNs.emit('drone_status_update', {
          droneId: data?.droneId,
          status: data?.status,
          batteryLevel: data?.battery ?? data?.batteryLevel,
          currentLocation: data?.location ?? (data?.lat != null && data?.lng != null ? { lat: data.lat, lng: data.lng } : undefined),
          currentAltitude: data?.alt ?? data?.altitude,
          lastUpdate: Date.now()
        });
        browserNs.emit('drone:position_updated', {
          droneId: data?.droneId,
          position: {
            latitude: data?.lat,
            longitude: data?.lng,
            altitude: data?.alt,
            heading: data?.heading,
            speed: data?.speed
          }
        });
      } catch (e) {
        console.warn('Socket relay error (drone:status):', e);
      }
    });

    socket.on('drone:telemetry', (snapshot) => {
      try {
        browserNs.emit('drone_telemetry', snapshot);
        browserNs.emit('drone:telemetry', snapshot);
      } catch (e) {
        console.warn('Socket relay error (drone:telemetry):', e);
      }
    });

    // Client may join rooms per droneId or orderId for scoped updates
    socket.on('join_drone', ({ droneId }) => {
      if (droneId) {
        socket.join(`drone:${droneId}`);
        console.log(`🔌 Client ${socket.id} joined drone room: ${droneId}`);
      }
    });
    socket.on('join_order', ({ orderId }) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
        console.log(`🔌 Client ${socket.id} joined order room: ${orderId}`);
      }
    });
    socket.on('join_notif', ({ userId }) => {
      if (userId) {
        socket.join(`notif:${userId}`);
        console.log(`🔌 Client ${socket.id} joined notification room: ${userId}`);
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  return ioInstance;
};

const getIo = () => ioInstance;

const getDroneSocketHandler = () => droneSocketHandler;

const emitNotification = (userId, payload) => {
  try {
    ioInstance?.to(`notif:${userId}`).emit('notification:new', payload);
  } catch {}
};

export {
  initSocket,
  getIo,
  getDroneSocketHandler,
  emitNotification
};


