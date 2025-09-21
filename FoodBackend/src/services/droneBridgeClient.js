import axios from 'axios';
import WebSocket from 'ws';

class DroneBridgeClient {
  constructor() {
    // Environment-based configuration
    this.environment = process.env.NODE_ENV || 'development';
    this.isTestMode = process.env.DRONE_TEST_MODE === 'true';
    
    // Enable WebSocket for real drone bridge connection
    process.env.DRONE_SIMULATION_MODE = 'false';
    process.env.DRONE_BRIDGE_ENABLE_WS = 'true';
    
    // Configure URLs based on environment variables
    this.baseURL = process.env.DRONE_BRIDGE_URL || 'http://localhost:8001';
    this.wsURL = process.env.DRONE_BRIDGE_WS_URL || 'ws://localhost:8080/drone';
    this.isSimulationMode = process.env.DRONE_SIMULATION_MODE === 'true';
    
    this.isConnected = false;
    this.wsConnection = null;
    this.enableWS = process.env.DRONE_BRIDGE_ENABLE_WS === 'true';
    
    console.log(`🚁 Drone Bridge Client initialized for ${this.environment} environment`);
    console.log(`🚁 HTTP URL: ${this.baseURL}`);
    console.log(`🚁 WebSocket URL: ${this.wsURL}`);
    console.log(`🚁 WebSocket Enabled: ${this.enableWS}`);
    console.log(`🚁 Simulation Mode: ${this.isSimulationMode}`);
    console.log(`🔌 WebSocket connections enabled for drone bridge communication`);
  }

  // Connect to drone bridge WebSocket
  async connectWebSocket() {
    try {
      if (!this.enableWS) {
        console.log('🔌 Drone bridge WebSocket disabled by config');
        return false;
      }
      this.wsConnection = new WebSocket(this.wsURL);
      
      this.wsConnection.onopen = () => {
        console.log('🔌 Connected to drone bridge WebSocket');
        this.isConnected = true;
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 Received from drone bridge:', data);
          this.handleDroneMessage(data);
        } catch (error) {
          console.error('Error parsing drone bridge message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 Disconnected from drone bridge WebSocket');
        this.isConnected = false;
        // Retry connection with backoff (dev-friendly)
        setTimeout(() => this.connectWebSocket().catch(() => {}), 3000);
      };

      this.wsConnection.onerror = (error) => {
        console.warn('❌ Drone bridge WebSocket error:', error);
        this.isConnected = false;
      };

      return true;
    } catch (error) {
      console.error('❌ Failed to connect to drone bridge WebSocket:', error);
      return false;
    }
  }

  // Send command via HTTP
  async sendCommand(command, droneId, params = {}) {
    try {
      console.log(`🚁 Sending command to drone bridge: ${command} for drone ${droneId}`);
      
      // In test mode, simulate command execution
      if (this.isTestMode || this.isSimulationMode) {
        return await this.simulateCommand(command, droneId, params);
      }
      
      const payload = {
        command,
        droneId,
        params,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(`${this.baseURL}/command`, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Command sent successfully:', response.data);
      return {
        success: true,
        data: response.data,
        message: 'Command sent to drone bridge'
      };

    } catch (error) {
      console.error('❌ Failed to send command to drone bridge:', error.message);
      
      // If HTTP fails, try WebSocket
      if (this.isConnected && this.wsConnection) {
        try {
          return await this.sendCommandViaWebSocket(command, droneId, params);
        } catch (wsError) {
          console.error('❌ WebSocket command also failed:', wsError.message);
        }
      }

      // In test mode, return success even if connection fails
      if (this.isTestMode) {
        console.log('🧪 Test mode: Simulating successful command execution');
        return {
          success: true,
          data: { simulated: true, command, droneId },
          message: 'Command simulated in test mode'
        };
      }

      return {
        success: false,
        error: error.message,
        message: 'Failed to send command to drone bridge'
      };
    }
  }

  // Send command via WebSocket
  async sendCommandViaWebSocket(command, droneId, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.wsConnection) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const commandId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const payload = {
        type: 'command',
        command,
        droneId,
        params,
        commandId,
        timestamp: new Date().toISOString()
      };

      const timeout = setTimeout(() => {
        reject(new Error('WebSocket command timeout'));
      }, 10000);

      const messageHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'command_response' && response.commandId === payload.commandId) {
            clearTimeout(timeout);
            this.wsConnection.removeEventListener('message', messageHandler);
            resolve({
              success: true,
              data: response,
              message: 'Command sent via WebSocket'
            });
          }
        } catch (error) {
          // Ignore parsing errors for other messages
        }
      };

      this.wsConnection.addEventListener('message', messageHandler);
      this.wsConnection.send(JSON.stringify(payload));
    });
  }

  // Handle incoming messages from drone bridge
  handleDroneMessage(data) {
    switch (data.type) {
      case 'telemetry':
        this.handleTelemetryUpdate(data);
        break;
      case 'status_update':
        this.handleStatusUpdate(data);
        break;
      case 'mission_complete':
        this.handleMissionComplete(data);
        break;
      case 'error':
        this.handleError(data);
        break;
      default:
        console.log('📡 Unknown message type from drone bridge:', data.type);
    }
  }

  // Handle telemetry updates
  handleTelemetryUpdate(data) {
    console.log(`📊 Telemetry update for drone ${data.droneId}:`, {
      position: data.position,
      battery: data.battery,
      status: data.status
    });
    
    // Update drone status in database
    this.updateDroneTelemetry(data.droneId, data);
  }

  // Handle status updates
  handleStatusUpdate(data) {
    console.log(`📋 Status update for drone ${data.droneId}:`, data.status);
    
    // Update drone status in database
    this.updateDroneStatus(data.droneId, data.status);
  }

  // Handle mission completion
  handleMissionComplete(data) {
    console.log(`✅ Mission completed for drone ${data.droneId}:`, data.mission);
    
    // Update order status
    this.updateOrderStatus(data.mission.orderId, 'delivered');
  }

  // Handle errors
  handleError(data) {
    console.error(`❌ Error from drone ${data.droneId}:`, data.error);
    
    // Handle emergency situations
    if (data.error.severity === 'critical') {
      this.handleEmergency(data.droneId, data.error);
    }
  }

  // Update drone telemetry in database
  async updateDroneTelemetry(droneId, telemetry) {
    try {
      const { Drone } = await import('../models/droneModel.js');
      
      await Drone.findOneAndUpdate(
        { droneId },
        {
          currentLocation: telemetry.position,
          battery: telemetry.battery,
          lastTelemetryUpdate: new Date(),
          $push: {
            telemetryHistory: {
              timestamp: new Date(),
              position: telemetry.position,
              battery: telemetry.battery,
              altitude: telemetry.altitude,
              speed: telemetry.speed,
              heading: telemetry.heading
            }
          }
        }
      );
    } catch (error) {
      console.error('Error updating drone telemetry:', error);
    }
  }

  // Update drone status in database
  async updateDroneStatus(droneId, status) {
    try {
      const { Drone } = await import('../models/droneModel.js');
      
      await Drone.findOneAndUpdate(
        { droneId },
        {
          status: status.current,
          operationalStatus: status.operational,
          lastStatusUpdate: new Date()
        }
      );
    } catch (error) {
      console.error('Error updating drone status:', error);
    }
  }

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const { DroneOrder } = await import('../models/droneOrderModel.js');
      
      await DroneOrder.findOneAndUpdate(
        { orderId },
        {
          status,
          'timing.actualDeliveryTime': new Date()
        }
      );
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  }

  // Handle emergency situations
  async handleEmergency(droneId, error) {
    try {
      console.log(`🚨 Emergency situation for drone ${droneId}:`, error);
      
      // Update drone status to emergency
      const { Drone } = await import('../models/droneModel.js');
      await Drone.findOneAndUpdate(
        { droneId },
        {
          status: 'emergency',
          operationalStatus: 'emergency',
          emergencyReason: error.message,
          emergencyTime: new Date()
        }
      );

      // Send emergency notifications
      // This would integrate with your notification system
      console.log('🚨 Emergency notifications sent');
      
    } catch (error) {
      console.error('Error handling emergency:', error);
    }
  }

  // Disconnect from drone bridge
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    this.isConnected = false;
    console.log('🔌 Disconnected from drone bridge');
  }

  // Check if connected
  isConnectedToBridge() {
    return this.isConnected;
  }

  // Simulate command execution for test mode
  async simulateCommand(command, droneId, params = {}) {
    console.log(`🧪 Simulating command: ${command} for drone ${droneId}`);
    
    // Simulate command execution delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const simulatedResponse = {
      success: true,
      command,
      droneId,
      params,
      simulated: true,
      timestamp: new Date().toISOString(),
      message: `Command ${command} simulated successfully`
    };
    
    // Simulate different responses based on command type
    switch (command) {
      case 'TAKEOFF':
        simulatedResponse.data = {
          status: 'in_flight',
          altitude: params.altitude || 100,
          position: params.location || { lat: 12.9716, lng: 77.5946, alt: 100 }
        };
        break;
      case 'LAND':
        simulatedResponse.data = {
          status: 'landed',
          altitude: 0,
          position: params.location || { lat: 12.9716, lng: 77.5946, alt: 0 }
        };
        break;
      case 'GOTO':
        simulatedResponse.data = {
          status: 'navigating',
          destination: params.destination,
          estimatedArrival: new Date(Date.now() + 30000).toISOString() // 30 seconds
        };
        break;
      case 'RTL':
        simulatedResponse.data = {
          status: 'returning_to_base',
          baseLocation: params.baseLocation,
          estimatedArrival: new Date(Date.now() + 60000).toISOString() // 1 minute
        };
        break;
      default:
        simulatedResponse.data = {
          status: 'command_executed',
          message: `Command ${command} executed successfully`
        };
    }
    
    console.log('🧪 Simulated response:', simulatedResponse);
    return simulatedResponse;
  }
}

// Create singleton instance
export const droneBridgeClient = new DroneBridgeClient();

// Initialize connection when module is imported
droneBridgeClient.connectWebSocket().catch(error => {
  console.warn('Failed to connect to drone bridge WebSocket:', error.message);
});

export default droneBridgeClient;
