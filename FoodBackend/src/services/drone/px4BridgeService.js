import { Drone } from '../../models/droneModel.js';
import { coreCommandService } from './coreCommandService.js';

class PX4BridgeService {
  constructor() {
    this.connections = new Map();
    this.mavlinkMessages = new Map();
    this.telemetryData = new Map();
    this.commandQueue = new Map();
    this.isConnected = false;
  }

  // Initialize PX4 connection
  async connectToDrone(droneId, connectionParams) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) throw new Error('Drone not found');

      // Simulate MAVLink connection (replace with actual MAVLink library)
      const connection = await this.establishMAVLinkConnection(connectionParams);
      
      this.connections.set(droneId, connection);
      this.isConnected = true;
      
      // Start telemetry monitoring
      this.startTelemetryMonitoring(droneId);
      
      // Update drone status
      await Drone.findByIdAndUpdate(droneId, { 
        status: 'connected',
        lastConnection: new Date()
      });

      console.log(`🚁 PX4 connected to drone: ${droneId}`);
      return { success: true, message: 'PX4 connection established' };
    } catch (error) {
      console.error('PX4 connection error:', error);
      throw error;
    }
  }

  // Establish MAVLink connection
  async establishMAVLinkConnection(params) {
    // Simulate MAVLink connection setup
    return {
      id: `px4_${Date.now()}`,
      status: 'connected',
      params,
      sendMessage: (message) => this.sendMAVLinkMessage(message),
      close: () => this.closeConnection()
    };
  }

  // Send MAVLink command
  async sendCommand(droneId, command) {
    try {
      const connection = this.connections.get(droneId);
      if (!connection) throw new Error('No PX4 connection');

      // Convert command to MAVLink message
      const mavlinkMessage = this.convertToMAVLink(command);
      
      // Send command
      const result = await connection.sendMessage(mavlinkMessage);
      
      // Log command
      await this.logCommand(droneId, command, result);
      
      return result;
    } catch (error) {
      console.error('PX4 command error:', error);
      throw error;
    }
  }

  // Convert command to MAVLink format
  convertToMAVLink(command) {
    const mavlinkMessage = {
      type: this.getMAVLinkCommandType(command.type),
      params: command.params,
      timestamp: Date.now(),
      sequence: this.getNextSequence()
    };

    return mavlinkMessage;
  }

  // Get MAVLink command type
  getMAVLinkCommandType(commandType) {
    const commandMap = {
      'TAKEOFF': 'MAV_CMD_NAV_TAKEOFF',
      'LAND': 'MAV_CMD_NAV_LAND',
      'GOTO': 'MAV_CMD_NAV_WAYPOINT',
      'RTL': 'MAV_CMD_NAV_RETURN_TO_LAUNCH',
      'LOITER': 'MAV_CMD_NAV_LOITER_UNLIM',
      'SET_MODE': 'MAV_CMD_DO_SET_MODE',
      'ARM': 'MAV_CMD_COMPONENT_ARM_DISARM',
      'DISARM': 'MAV_CMD_COMPONENT_ARM_DISARM'
    };

    return commandMap[commandType] || 'MAV_CMD_CUSTOM';
  }

  // Get next sequence number
  getNextSequence() {
    return Date.now() % 255;
  }

  // Start telemetry monitoring
  startTelemetryMonitoring(droneId) {
    const interval = setInterval(async () => {
      try {
        const telemetry = await this.getTelemetryData(droneId);
        this.telemetryData.set(droneId, telemetry);
        
        // Emit telemetry update via socket
        coreCommandService.emitTelemetryUpdate(droneId, telemetry);
      } catch (error) {
        console.error('Telemetry monitoring error:', error);
      }
    }, 1000); // Update every second

    // Store interval for cleanup
    this.telemetryIntervals = this.telemetryIntervals || new Map();
    this.telemetryIntervals.set(droneId, interval);
  }

  // Get telemetry data from PX4
  async getTelemetryData(droneId) {
    try {
      const connection = this.connections.get(droneId);
      if (!connection) throw new Error('No connection');

      // Simulate telemetry data from PX4
      const telemetry = {
        timestamp: Date.now(),
        position: {
          lat: 37.7749 + (Math.random() - 0.5) * 0.001,
          lng: -122.4194 + (Math.random() - 0.5) * 0.001,
          alt: 100 + Math.random() * 50
        },
        attitude: {
          roll: (Math.random() - 0.5) * 10,
          pitch: (Math.random() - 0.5) * 10,
          yaw: Math.random() * 360
        },
        velocity: {
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          vz: (Math.random() - 0.5) * 5
        },
        battery: {
          voltage: 22 + Math.random() * 2,
          current: 5 + Math.random() * 3,
          remaining: 80 + Math.random() * 20
        },
        gps: {
          satellites: 8 + Math.floor(Math.random() * 4),
          hdop: 1 + Math.random() * 2,
          fix: 3
        },
        status: 'active'
      };

      return telemetry;
    } catch (error) {
      console.error('Telemetry error:', error);
      throw error;
    }
  }

  // Execute specific drone commands
  async executeTakeoff(droneId, params = {}) {
    const command = {
      type: 'TAKEOFF',
      params: {
        altitude: params.altitude || 100,
        ...params
      }
    };

    return await this.sendCommand(droneId, command);
  }

  async executeLand(droneId, params = {}) {
    const command = {
      type: 'LAND',
      params: {
        ...params
      }
    };

    return await this.sendCommand(droneId, command);
  }

  async executeGoto(droneId, coordinates) {
    const command = {
      type: 'GOTO',
      params: {
        lat: coordinates.lat,
        lng: coordinates.lng,
        alt: coordinates.alt || 100
      }
    };

    return await this.sendCommand(droneId, command);
  }

  async executeRTL(droneId) {
    const command = {
      type: 'RTL',
      params: {}
    };

    return await this.sendCommand(droneId, command);
  }

  // Log command execution
  async logCommand(droneId, command, result) {
    try {
      await Drone.findByIdAndUpdate(droneId, {
        $push: {
          commandHistory: {
            command: command.type,
            params: command.params,
            result: result,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      console.error('Command logging error:', error);
    }
  }

  // Close connection
  async closeConnection(droneId) {
    try {
      const connection = this.connections.get(droneId);
      if (connection) {
        await connection.close();
        this.connections.delete(droneId);
      }

      // Clear telemetry interval
      const interval = this.telemetryIntervals?.get(droneId);
      if (interval) {
        clearInterval(interval);
        this.telemetryIntervals.delete(droneId);
      }

      // Update drone status
      await Drone.findByIdAndUpdate(droneId, { 
        status: 'disconnected',
        lastDisconnection: new Date()
      });

      console.log(`🚁 PX4 disconnected from drone: ${droneId}`);
    } catch (error) {
      console.error('PX4 disconnection error:', error);
    }
  }

  // Get connection status
  getConnectionStatus(droneId) {
    const connection = this.connections.get(droneId);
    return {
      isConnected: !!connection,
      status: connection?.status || 'disconnected',
      lastUpdate: this.telemetryData.get(droneId)?.timestamp
    };
  }

  // Get all connections
  getAllConnections() {
    return Array.from(this.connections.keys()).map(droneId => ({
      droneId,
      ...this.getConnectionStatus(droneId)
    }));
  }
}

export const px4BridgeService = new PX4BridgeService();
export default px4BridgeService;
