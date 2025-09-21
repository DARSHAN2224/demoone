import { droneCommandService } from '../services/droneCommandService.js';
import { weatherService } from '../services/weather/index.js';
import { qrService } from '../services/qr/index.js';
import { Drone } from '../models/droneModel.js';
import { DroneOrder } from '../models/droneOrderModel.js';

class DroneSocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.droneSubscriptions = new Map();
    this.telemetryIntervals = new Map();
  }

  /**
   * Initialize drone socket handler
   */
  initialize() {
    // Handle drone namespace connections
    this.io.of('/drone').on('connection', (socket) => {
      console.log(`Drone client connected: ${socket.id}`);
      
      this.handleConnection(socket);
      this.setupEventHandlers(socket);
      
      // Send initial connection confirmation
      socket.emit('drone_service_ready', {
        message: 'Connected to drone service',
        timestamp: Date.now()
      });
    });

    console.log('Drone socket handler initialized');
  }

  /**
   * Handle new client connection
   * @param {Socket} socket - Socket instance
   */
  handleConnection(socket) {
    this.connectedClients.set(socket.id, {
      socket,
      connectedAt: Date.now(),
      subscriptions: new Set()
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Drone client disconnected: ${socket.id}`);
      this.handleDisconnection(socket.id);
    });
  }

  /**
   * Handle client disconnection
   * @param {string} socketId - Socket ID
   */
  handleDisconnection(socketId) {
    const client = this.connectedClients.get(socketId);
    if (client) {
      // Clear telemetry intervals
      client.subscriptions.forEach(droneId => {
        this.clearTelemetryInterval(droneId, socketId);
      });
      
      this.connectedClients.delete(socketId);
    }
  }

  /**
   * Setup socket event handlers
   * @param {Socket} socket - Socket instance
   */
  setupEventHandlers(socket) {
    // Handle drone commands
    socket.on('send_command', async (data) => {
      await this.handleDroneCommand(socket, data);
    });

    // Handle drone subscriptions
    socket.on('subscribe_drone', async (data) => {
      await this.handleDroneSubscription(socket, data);
    });

    socket.on('unsubscribe_drone', (data) => {
      this.handleDroneUnsubscription(socket, data);
    });

    // Handle flight plan updates
    socket.on('update_flight_plan', async (data) => {
      await this.handleFlightPlanUpdate(socket, data);
    });

    // Handle weather requests
    socket.on('get_weather', async (data) => {
      await this.handleWeatherRequest(socket, data);
    });

    // Handle QR code generation
    socket.on('generate_qr', async (data) => {
      await this.handleQRGeneration(socket, data);
    });

    // Handle emergency commands
    socket.on('emergency_command', async (data) => {
      await this.handleEmergencyCommand(socket, data);
    });
  }

  /**
   * Handle drone command
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Command data
   */
  async handleDroneCommand(socket, data) {
    try {
      console.log(`Processing drone command: ${data.command} for drone ${data.droneId}`);

      // Validate command
      const validation = droneCommandService.validateCommand(data);
      if (!validation.valid) {
        socket.emit('command_error', {
          commandId: data.commandId,
          error: validation.error,
          timestamp: Date.now()
        });
        return;
      }

      // Send command to drone service
      const result = await droneCommandService.sendCommand(data);

      if (result.success) {
        // Send success response
        socket.emit('command_response', {
          commandId: data.commandId,
          success: true,
          message: result.message,
          timestamp: Date.now()
        });

        // Broadcast status update to all subscribed clients
        this.broadcastDroneStatusUpdate(data.droneId);
      } else {
        // Send error response
        socket.emit('command_error', {
          commandId: data.commandId,
          error: result.error,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error handling drone command:', error);
      socket.emit('command_error', {
        commandId: data.commandId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle drone subscription
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Subscription data
   */
  async handleDroneSubscription(socket, data) {
    try {
      const { droneId } = data;
      
      if (!droneId) {
        socket.emit('subscription_error', {
          error: 'Drone ID required',
          timestamp: Date.now()
        });
        return;
      }

      // Verify drone exists
      const drone = await Drone.findById(droneId);
      if (!drone) {
        socket.emit('subscription_error', {
          error: 'Drone not found',
          timestamp: Date.now()
        });
        return;
      }

      // Add subscription
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.subscriptions.add(droneId);
        
        // Add to drone subscriptions
        if (!this.droneSubscriptions.has(droneId)) {
          this.droneSubscriptions.set(droneId, new Set());
        }
        this.droneSubscriptions.get(droneId).add(socket.id);

        // Start telemetry updates if not already running
        this.startTelemetryUpdates(droneId);

        // Send current drone status
        socket.emit('drone_status_update', {
          droneId,
          status: drone.status,
          batteryLevel: drone.batteryLevel,
          currentLocation: drone.currentLocation,
          currentAltitude: drone.currentAltitude,
          timestamp: Date.now()
        });

        console.log(`Client ${socket.id} subscribed to drone ${droneId}`);
      }
    } catch (error) {
      console.error('Error handling drone subscription:', error);
      socket.emit('subscription_error', {
        error: 'Subscription failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle drone unsubscription
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Unsubscription data
   */
  handleDroneUnsubscription(socket, data) {
    const { droneId } = data;
    const client = this.connectedClients.get(socket.id);
    
    if (client && droneId) {
      client.subscriptions.delete(droneId);
      
      // Remove from drone subscriptions
      if (this.droneSubscriptions.has(droneId)) {
        this.droneSubscriptions.get(droneId).delete(socket.id);
        
        // If no more subscribers, stop telemetry updates
        if (this.droneSubscriptions.get(droneId).size === 0) {
          this.stopTelemetryUpdates(droneId);
        }
      }

      console.log(`Client ${socket.id} unsubscribed from drone ${droneId}`);
    }
  }

  /**
   * Handle flight plan update
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Flight plan data
   */
  async handleFlightPlanUpdate(socket, data) {
    try {
      const { droneId, flightPlan } = data;
      
      // Update drone flight plan
      await Drone.findByIdAndUpdate(droneId, {
        currentFlightPlan: flightPlan,
        flightPlanUpdated: new Date()
      });

      // Broadcast flight plan update
      this.broadcastFlightPlanUpdate(droneId, flightPlan);

      socket.emit('flight_plan_updated', {
        droneId,
        success: true,
        message: 'Flight plan updated successfully',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error updating flight plan:', error);
      socket.emit('flight_plan_error', {
        error: 'Failed to update flight plan',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle weather request
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Weather request data
   */
  async handleWeatherRequest(socket, data) {
    try {
      const { location, droneType } = data;
      
      // Get weather data
      const weather = await weatherService.getCurrentWeather(location.lat, location.lng);
      
      // Check flight safety
      const safety = await weatherService.checkFlightSafety(location, droneType);

      socket.emit('weather_update', {
        location,
        weather,
        safety,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error handling weather request:', error);
      socket.emit('weather_error', {
        error: 'Failed to get weather data',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle QR code generation
   * @param {Socket} socket - Socket instance
   * @param {Object} data - QR generation data
   */
  async handleQRGeneration(socket, data) {
    try {
      const { deliveryData } = data;
      
      // Generate delivery QR code
      const qrCode = await qrService.generateDeliveryQR(deliveryData);

      socket.emit('qr_generated', {
        qrCode,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      socket.emit('qr_error', {
        error: 'Failed to generate QR code',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle emergency command
   * @param {Socket} socket - Socket instance
   * @param {Object} data - Emergency command data
   */
  async handleEmergencyCommand(socket, data) {
    try {
      const { droneId, emergencyType } = data;
      
      // Send emergency command
      const result = await droneCommandService.sendCommand({
        droneId,
        command: 'EMERGENCY_LAND',
        emergencyType: emergencyType || 'general'
      });

      if (result.success) {
        // Broadcast emergency alert to all clients
        this.broadcastEmergencyAlert(droneId, emergencyType);
        
        socket.emit('emergency_response', {
          success: true,
          message: 'Emergency landing initiated',
          timestamp: Date.now()
        });
      } else {
        socket.emit('emergency_error', {
          error: result.error,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error handling emergency command:', error);
      socket.emit('emergency_error', {
        error: 'Emergency command failed',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Start telemetry updates for a drone
   * @param {string} droneId - Drone ID
   */
  startTelemetryUpdates(droneId) {
    if (this.telemetryIntervals.has(droneId)) {
      return; // Already running
    }

    const interval = setInterval(async () => {
      try {
        // Get current drone data
        const drone = await Drone.findById(droneId);
        if (!drone) return;

        // Get active drone orders
        const activeOrders = await DroneOrder.find({
          droneId,
          status: { $in: ['assigned', 'in_transit', 'approaching_destination'] }
        });

        // Prepare telemetry data
        const telemetry = {
          droneId,
          timestamp: Date.now(),
          location: drone.currentLocation,
          altitude: drone.currentAltitude,
          batteryLevel: drone.batteryLevel,
          status: drone.status,
          speed: drone.currentSpeed || 0,
          heading: drone.currentHeading || 0,
          activeOrders: activeOrders.length
        };

        // Broadcast to subscribed clients
        this.broadcastTelemetryUpdate(droneId, telemetry);

      } catch (error) {
        console.error(`Error updating telemetry for drone ${droneId}:`, error);
      }
    }, 2000); // Update every 2 seconds

    this.telemetryIntervals.set(droneId, interval);
  }

  /**
   * Stop telemetry updates for a drone
   * @param {string} droneId - Drone ID
   */
  stopTelemetryUpdates(droneId) {
    const interval = this.telemetryIntervals.get(droneId);
    if (interval) {
      clearInterval(interval);
      this.telemetryIntervals.delete(droneId);
    }
  }

  /**
   * Clear telemetry interval for specific client
   * @param {string} droneId - Drone ID
   * @param {string} socketId - Socket ID
   */
  clearTelemetryInterval(droneId, socketId) {
    if (this.droneSubscriptions.has(droneId)) {
      this.droneSubscriptions.get(droneId).delete(socketId);
      
      if (this.droneSubscriptions.get(droneId).size === 0) {
        this.stopTelemetryUpdates(droneId);
      }
    }
  }

  /**
   * Broadcast telemetry update to subscribed clients
   * @param {string} droneId - Drone ID
   * @param {Object} telemetry - Telemetry data
   */
  broadcastTelemetryUpdate(droneId, telemetry) {
    if (this.droneSubscriptions.has(droneId)) {
      this.droneSubscriptions.get(droneId).forEach(socketId => {
        const client = this.connectedClients.get(socketId);
        if (client && client.socket.connected) {
          client.socket.emit('drone_telemetry', telemetry);
        }
      });
    }
  }

  /**
   * Broadcast drone status update
   * @param {string} droneId - Drone ID
   */
  async broadcastDroneStatusUpdate(droneId) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) return;

      const statusUpdate = {
        droneId,
        status: drone.status,
        batteryLevel: drone.batteryLevel,
        currentLocation: drone.currentLocation,
        currentAltitude: drone.currentAltitude,
        lastUpdate: Date.now()
      };

      if (this.droneSubscriptions.has(droneId)) {
        this.droneSubscriptions.get(droneId).forEach(socketId => {
          const client = this.connectedClients.get(socketId);
          if (client && client.socket.connected) {
            client.socket.emit('drone_status_update', statusUpdate);
          }
        });
      }
    } catch (error) {
      console.error('Error broadcasting drone status update:', error);
    }
  }

  /**
   * Broadcast flight plan update
   * @param {string} droneId - Drone ID
   * @param {Object} flightPlan - Flight plan data
   */
  broadcastFlightPlanUpdate(droneId, flightPlan) {
    if (this.droneSubscriptions.has(droneId)) {
      this.droneSubscriptions.get(droneId).forEach(socketId => {
        const client = this.connectedClients.get(socketId);
        if (client && client.socket.connected) {
          client.socket.emit('flight_plan_update', {
            droneId,
            flightPlan,
            timestamp: Date.now()
          });
        }
      });
    }
  }

  /**
   * Broadcast emergency alert
   * @param {string} droneId - Drone ID
   * @param {string} emergencyType - Emergency type
   */
  broadcastEmergencyAlert(droneId, emergencyType) {
    // Broadcast to all connected clients
    this.connectedClients.forEach(client => {
      if (client.socket.connected) {
        client.socket.emit('emergency_alert', {
          droneId,
          emergencyType,
          timestamp: Date.now(),
          message: `Emergency alert for drone ${droneId}: ${emergencyType}`
        });
      }
    });
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      totalClients: this.connectedClients.size,
      totalDrones: this.droneSubscriptions.size,
      activeTelemetry: this.telemetryIntervals.size,
      timestamp: Date.now()
    };
  }
}

export default DroneSocketHandler;
