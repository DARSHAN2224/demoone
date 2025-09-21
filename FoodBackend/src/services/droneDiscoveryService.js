import { Drone } from '../models/droneModel.js';
import { droneTelemetryService } from './droneTelemetryService.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Manages the connection and status of all drones registered in the system.
 * It dynamically discovers drones from the database and establishes WebSocket connections.
 */
class DroneDiscoveryService {
  constructor() {
    this.activeDrones = new Map(); // Use a Map to store active drone connections
    this.discoveryInterval = null;
    this.isDiscovering = false;
  }

  /**
   * Fetches all drones from the database and attempts to connect to each one.
   * This function is the core of the dynamic connection logic.
   */
  async discoverAndConnectDrones(io) {
    console.log('🔍 Starting drone discovery...');
    try {
      const allDrones = await Drone.find({ is_active: true });

      if (allDrones.length === 0) {
        console.log('No active drones found in the database.');
        return;
      }

      console.log(`Found ${allDrones.length} active drones. Attempting to connect...`);

      allDrones.forEach(drone => {
        // If not already connected, create a new telemetry service for it
        if (!this.activeDrones.has(drone.droneId)) {
          console.log(`Attempting to connect to drone: ${drone.droneId} at ${drone.wsUrl}`);
          
          const telemetryClient = droneTelemetryService(drone.wsUrl, io, drone.droneId);
          
          this.activeDrones.set(drone.droneId, {
            ...drone.toObject(),
            client: telemetryClient,
            status: 'CONNECTING',
          });
        }
      });

    } catch (error) {
      console.error('Error during drone discovery:', error);
    }
  }

  /**
   * Starts the periodic discovery process.
   */
  start(io) {
    if (this.isDiscovering) return;
    
    this.isDiscovering = true;
    console.log('🔍 Starting drone discovery service (checking every 30000ms)');
    
    // Run once immediately, then set an interval
    this.discoverAndConnectDrones(io);
    this.discoveryInterval = setInterval(() => this.discoverAndConnectDrones(io), 30000); // Check for new drones every 30 seconds
  }

  /**
   * Stops the discovery service
   */
  stop() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    this.isDiscovering = false;
    console.log('🛑 Drone discovery service stopped');
  }

  /**
   * Retrieves a list of all discovered drones and their current status.
   */
  getDiscoveredDrones() {
    // Convert the Map to an array of drone objects for API responses
    return Array.from(this.activeDrones.values()).map(drone => {
        // Don't expose the client object in the API response
        const { client, ...droneInfo } = drone;
        return droneInfo;
    });
  }

  /**
   * Get a specific drone by ID
   */
  getDrone(droneId) {
    const drone = this.activeDrones.get(droneId);
    if (drone) {
      const { client, ...droneInfo } = drone;
      return droneInfo;
    }
    return null;
  }

  /**
   * Check if a drone is available
   */
  isDroneAvailable(droneId) {
    const drone = this.activeDrones.get(droneId);
    return drone && drone.status === 'CONNECTED';
  }

  /**
   * Get fleet overview
   */
  getFleetOverview() {
    const drones = this.getDiscoveredDrones();
    return {
      totalDrones: drones.length,
      connectedDrones: drones.filter(d => d.status === 'CONNECTED').length,
      connectingDrones: drones.filter(d => d.status === 'CONNECTING').length,
      drones: drones.map(drone => ({
        droneId: drone.droneId,
        model: drone.model,
        status: drone.status,
        wsUrl: drone.wsUrl,
        lastSeen: drone.lastSeen
      }))
    };
  }

  /**
   * Force refresh discovery
   */
  async refreshDiscovery(io) {
    console.log('🔄 Forcing drone discovery refresh...');
    await this.discoverAndConnectDrones(io);
    return this.getFleetOverview();
  }

  /**
   * Add a new drone to the system
   */
  async addDrone(droneData) {
    try {
      const drone = new Drone(droneData);
      await drone.save();
      
      console.log(`✅ Added new drone: ${drone.droneId}`);
      return drone;
    } catch (error) {
      console.error('Error adding drone:', error);
      throw new ApiError('Failed to add drone', 500, error.message);
    }
  }

  /**
   * Remove a drone from the system
   */
  async removeDrone(droneId) {
    try {
      const drone = await Drone.findOneAndDelete({ droneId });
      if (!drone) {
        throw new ApiError('Drone not found', 404, 'Drone does not exist');
      }
      
      // Remove from active connections
      if (this.activeDrones.has(droneId)) {
        this.activeDrones.delete(droneId);
      }
      
      console.log(`🗑️ Removed drone: ${droneId}`);
      return drone;
    } catch (error) {
      console.error('Error removing drone:', error);
      throw new ApiError('Failed to remove drone', 500, error.message);
    }
  }
}

export const droneDiscoveryService = new DroneDiscoveryService();
export default droneDiscoveryService;