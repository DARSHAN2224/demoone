// Export all drone services
export { coreCommandService, default as CoreCommandService } from './coreCommandService.js';
export { px4BridgeService, default as PX4BridgeService } from './px4BridgeService.js';
export { realEngineService, default as RealEngineService } from './realEngineService.js';

// Import services for unified access
import { coreCommandService } from './coreCommandService.js';
import { px4BridgeService } from './px4BridgeService.js';
import { realEngineService } from './realEngineService.js';

// Main DroneService class that aggregates all drone functionality
class DroneService {
  constructor() {
    this.core = coreCommandService;
    this.px4 = px4BridgeService;
    this.realEngine = realEngineService;
  }

  // Initialize all drone services
  async initialize() {
    try {
      console.log('🚁 Initializing drone services...');
      
      // Initialize core command service
      await this.core.initialize();
      
      console.log('✅ Drone services initialized successfully');
      return { success: true, message: 'Drone services initialized' };
    } catch (error) {
      console.error('❌ Drone services initialization failed:', error);
      throw error;
    }
  }

  // Get service by type
  getService(type) {
    switch (type.toLowerCase()) {
      case 'core':
        return this.core;
      case 'px4':
        return this.px4;
      case 'realengine':
      case 'real_engine':
        return this.realEngine;
      default:
        throw new Error(`Unknown drone service type: ${type}`);
    }
  }

  // Execute command on appropriate service
  async executeCommand(droneId, command, serviceType = 'auto') {
    try {
      let service;
      
      if (serviceType === 'auto') {
        // Auto-detect service based on drone status
        const drone = await this.core.getDrone(droneId);
        if (drone.simulationMode) {
          service = this.realEngine;
        } else {
          service = this.px4;
        }
      } else {
        service = this.getService(serviceType);
      }

      return await service.executeCommand(droneId, command);
    } catch (error) {
      console.error('Command execution error:', error);
      throw error;
    }
  }

  // Get telemetry from appropriate service
  async getTelemetry(droneId, serviceType = 'auto') {
    try {
      let service;
      
      if (serviceType === 'auto') {
        const drone = await this.core.getDrone(droneId);
        if (drone.simulationMode) {
          service = this.realEngine;
        } else {
          service = this.px4;
        }
      } else {
        service = this.getService(serviceType);
      }

      if (service === this.realEngine) {
        // Get simulation telemetry
        const simulations = this.realEngine.getAllSimulations();
        const simulation = simulations.find(s => s.droneId === droneId);
        if (simulation) {
          return await this.realEngine.getSimulationTelemetry(simulation.id);
        }
      } else if (service === this.px4) {
        // Get PX4 telemetry
        return await this.px4.getTelemetryData(droneId);
      }

      return null;
    } catch (error) {
      console.error('Telemetry retrieval error:', error);
      throw error;
    }
  }

  // Get all drone statuses
  async getAllDroneStatuses() {
    try {
      const drones = await this.core.getAllDrones();
      const statuses = [];

      for (const drone of drones) {
        const status = {
          droneId: drone._id,
          name: drone.name,
          status: drone.status,
          battery: drone.batteryLevel,
          position: drone.currentPosition,
          mode: drone.currentMode,
          lastUpdate: drone.lastUpdate
        };

        // Add service-specific status
        if (drone.simulationMode) {
          const simulations = this.realEngine.getAllSimulations();
          const simulation = simulations.find(s => s.droneId === drone._id);
          if (simulation) {
            status.simulationId = simulation.id;
            status.environmentId = simulation.environmentId;
          }
        } else {
          status.px4Connection = this.px4.getConnectionStatus(drone._id);
        }

        statuses.push(status);
      }

      return statuses;
    } catch (error) {
      console.error('Status retrieval error:', error);
      throw error;
    }
  }

  // Create simulation environment
  async createSimulationEnvironment(config) {
    return await this.realEngine.createEnvironment(config);
  }

  // Start simulation
  async startSimulation(droneId, environmentId, config) {
    return await this.realEngine.createSimulation(droneId, environmentId, config);
  }

  // Stop simulation
  async stopSimulation(simulationId) {
    return await this.realEngine.stopSimulation(simulationId);
  }

  // Connect to PX4 drone
  async connectToPX4(droneId, connectionParams) {
    return await this.px4.connectToDrone(droneId, connectionParams);
  }

  // Disconnect from PX4 drone
  async disconnectFromPX4(droneId) {
    return await this.px4.closeConnection(droneId);
  }

  // Get service health status
  getServiceHealth() {
    return {
      core: this.core.isInitialized,
      px4: this.px4.isConnected,
      realEngine: this.realEngine.isRunning,
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup all services
  async cleanup() {
    try {
      console.log('🧹 Cleaning up drone services...');
      
      await this.core.cleanup();
      this.px4.cleanup();
      this.realEngine.cleanup();
      
      console.log('✅ Drone services cleaned up successfully');
    } catch (error) {
      console.error('❌ Drone services cleanup failed:', error);
      throw error;
    }
  }
}

// Create and export main drone service instance
export const droneService = new DroneService();
export default droneService;
