import { WebSocketServer } from 'ws';
import { getIo } from './socket.js';

class RawWebSocketServer {
  constructor(server) {
    this.server = server;
    this.wss = null;
    this.io = null;
  }

  initialize() {
    // Create raw WebSocket server for drone bridge connections
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/drone-bridge'
    });

    this.io = getIo();

    this.wss.on('connection', (ws, req) => {
      console.log('🚁 Raw WebSocket: Drone bridge connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('📡 Raw WebSocket: Received message:', message.type);
          
          // Forward messages to Socket.IO clients
          this.forwardToSocketIO(message);
          
        } catch (error) {
          console.error('❌ Raw WebSocket: Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('🚁 Raw WebSocket: Drone bridge disconnected');
      });

      ws.on('error', (error) => {
        console.error('❌ Raw WebSocket: Error:', error);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_confirmed',
        message: 'Connected to drone service',
        timestamp: Date.now()
      }));
    });

    console.log('🔌 Raw WebSocket server initialized on /drone path');
  }

  forwardToSocketIO(message) {
    if (!this.io) return;

    const userIo = this.io.of('/');
    
    switch (message.type) {
      case 'drone_telemetry':
        // Broadcast telemetry to all frontend clients
        userIo.emit('drone_telemetry', message.payload);
        break;
        
      case 'mission_update':
        // Broadcast mission updates to all frontend clients
        userIo.emit('mission_update', message.payload);
        break;
        
      default:
        console.log('📡 Raw WebSocket: Unknown message type:', message.type);
    }
  }

  sendToDrone(message) {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN = 1
          client.send(JSON.stringify(message));
        }
      });
    }
  }
}

export default RawWebSocketServer;
