import { Server } from 'socket.io';
import DroneSocketHandler from '../socket/droneSocketHandler.js';
import { CORS_ORIGIN } from '../constants.js';

let ioInstance = null;
let droneSocketHandler = null;

const initSocket = (server) => {
  ioInstance = new Server(server, {
    cors: {
      origin: CORS_ORIGIN, // Use the CORS constant for consistency
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    // Additional WebSocket configuration for better compatibility
    allowUpgrades: true,
    upgradeTimeout: 10000
  });
  
  console.log('🔌 Socket.IO server initialized');

  // Create dedicated namespace for drone bridge connections
  const droneIo = ioInstance.of("/drone");
  
  // Use default namespace for frontend clients
  const userIo = ioInstance.of("/");

  // Initialize drone socket handler for the drone namespace
  droneSocketHandler = new DroneSocketHandler(droneIo, userIo);
  droneSocketHandler.initialize();
  console.log('🚁 Drone socket handler initialized for /drone namespace');

  // Handle frontend client connections on default namespace
  userIo.on('connection', (socket) => {
    console.log('🔌 Frontend client connected:', socket.id);

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
      console.log('🔌 Frontend client disconnected:', socket.id, 'Reason:', reason);
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


