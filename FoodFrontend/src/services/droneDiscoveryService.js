import { api } from '../stores/api';

/**
 * Dynamic Drone Discovery Service
 * Handles automatic discovery of available drone bridges and fleet management
 */
class DroneDiscoveryService {
  constructor() {
    this.discoveredDrones = new Map();
    this.discoveryInterval = null;
    this.isDiscovering = false;
    this.eventListeners = new Map();
    this.discoveryIntervalMs = 10000; // 10 seconds
  }

  /**
   * Start automatic drone discovery
   */
  startDiscovery(intervalMs = 10000) {
    if (this.isDiscovering) return;
    
    this.discoveryIntervalMs = intervalMs;
    this.isDiscovering = true;
    console.log(`🔍 Starting drone discovery service (checking every ${intervalMs}ms)`);
    
    // Initial discovery
    this.discoverDrones();
    
    // Set up periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.discoverDrones();
    }, intervalMs);
  }

  /**
   * Stop automatic drone discovery
   */
  stopDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    this.isDiscovering = false;
    console.log('🛑 Drone discovery service stopped');
  }

  /**
   * Discover available drones from backend
   */
  async discoverDrones() {
    try {
      const response = await api.get('/test/drone/fleet/discover');
      
      if (response.data.success) {
        const fleetData = response.data.data;
        
        // Update discovered drones map
        this.discoveredDrones.clear();
        fleetData.drones.forEach(drone => {
          this.discoveredDrones.set(drone.id, {
            id: drone.id,
            port: drone.port,
            available: drone.available,
            lastSeen: new Date(drone.lastSeen),
            status: drone.status,
            discoveredAt: new Date()
          });
        });

        // Emit discovery event
        this.emit('discovery', {
          totalDrones: fleetData.totalDrones,
          availableDrones: fleetData.availableDrones,
          drones: Array.from(this.discoveredDrones.values())
        });

        console.log(`🔍 Discovery complete: ${this.discoveredDrones.size} drones available`);
        return { success: true, data: fleetData };
      } else {
        throw new Error(response.data.message || 'Discovery failed');
      }
    } catch (error) {
      console.error('❌ Drone discovery failed:', error);
      this.emit('discoveryError', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all discovered drones
   */
  getDiscoveredDrones() {
    return Array.from(this.discoveredDrones.values());
  }

  /**
   * Get a specific drone by ID
   */
  getDrone(droneId) {
    return this.discoveredDrones.get(droneId);
  }

  /**
   * Check if a drone is available
   */
  isDroneAvailable(droneId) {
    const drone = this.discoveredDrones.get(droneId);
    return drone && drone.available;
  }

  /**
   * Get fleet overview
   */
  getFleetOverview() {
    const drones = this.getDiscoveredDrones();
    return {
      totalDrones: drones.length,
      availableDrones: drones.filter(d => d.available).length,
      offlineDrones: drones.filter(d => !d.available).length,
      drones: drones.map(drone => ({
        id: drone.id,
        port: drone.port,
        available: drone.available,
        lastSeen: drone.lastSeen,
        status: drone.status,
        discoveredAt: drone.discoveredAt
      }))
    };
  }

  /**
   * Force refresh discovery
   */
  async refreshDiscovery() {
    console.log('🔄 Forcing drone discovery refresh...');
    return await this.discoverDrones();
  }

  /**
   * Send command to a specific drone
   */
  async sendDroneCommand(droneId, command, parameters = {}) {
    try {
      if (!this.isDroneAvailable(droneId)) {
        throw new Error(`Drone ${droneId} is not available`);
      }

      const response = await api.post('/test/drone/command', {
        droneId,
        command,
        parameters
      });

      if (response.data.success) {
        console.log(`✅ Command '${command}' sent to ${droneId}: ${response.data.message}`);
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.message || 'Command failed');
      }
    } catch (error) {
      console.error(`❌ Command '${command}' to ${droneId} failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get drone status
   */
  async getDroneStatus(droneId) {
    try {
      if (!this.isDroneAvailable(droneId)) {
        throw new Error(`Drone ${droneId} is not available`);
      }

      const response = await api.post('/test/drone/command', {
        droneId,
        command: 'get_status'
      });

      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        throw new Error(response.data.message || 'Status request failed');
      }
    } catch (error) {
      console.error(`❌ Status request for ${droneId} failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Event system for discovery updates
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get discovery status
   */
  getDiscoveryStatus() {
    return {
      isDiscovering: this.isDiscovering,
      intervalMs: this.discoveryIntervalMs,
      discoveredCount: this.discoveredDrones.size,
      lastDiscovery: this.discoveredDrones.size > 0 ? 
        Math.max(...Array.from(this.discoveredDrones.values()).map(d => d.discoveredAt.getTime())) : null
    };
  }
}

// Export singleton instance
export const droneDiscoveryService = new DroneDiscoveryService();
export default droneDiscoveryService;
