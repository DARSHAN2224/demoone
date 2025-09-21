import fetch from 'node-fetch';

class DroneDiscoveryService {
    constructor() {
        this.basePort = 8001; // Should match BRIDGE_HTTP_PORT_BASE from drone-bridge config
        this.maxDrones = parseInt(process.env.MAX_DRONES || '5');
        this.discoveredDrones = new Map();
        this.discoveryInterval = null;
        this.isDiscovering = false;
    }

    /**
     * Start automatic drone discovery
     */
    startDiscovery(intervalMs = 10000) {
        if (this.isDiscovering) return;
        
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
     * Discover available drones by checking their status endpoints
     */
    async discoverDrones() {
        const promises = [];
        
        for (let i = 1; i <= this.maxDrones; i++) {
            const droneId = `DRONE-${i.toString().padStart(3, '0')}`;
            const port = this.basePort + (i - 1);
            promises.push(this.checkDroneAvailability(droneId, port));
        }

        const results = await Promise.allSettled(promises);
        
        // Update discovered drones map
        results.forEach((result, index) => {
            const droneId = `DRONE-${(index + 1).toString().padStart(3, '0')}`;
            const port = this.basePort + index;
            
            if (result.status === 'fulfilled' && result.value.available) {
                this.discoveredDrones.set(droneId, {
                    id: droneId,
                    port: port,
                    status: result.value.status,
                    lastSeen: new Date(),
                    available: true
                });
            } else {
                // Remove from discovered drones if not available
                if (this.discoveredDrones.has(droneId)) {
                    this.discoveredDrones.delete(droneId);
                }
            }
        });

        console.log(`🔍 Discovery complete: ${this.discoveredDrones.size} drones available`);
    }

    /**
     * Check if a specific drone is available
     */
    async checkDroneAvailability(droneId, port) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/status`, {
                method: 'GET',
                timeout: 2000
            });

            if (response.ok) {
                const status = await response.json();
                return {
                    available: true,
                    status: status,
                    port: port
                };
            } else {
                return { available: false, port: port };
            }
        } catch (error) {
            return { available: false, port: port, error: error.message };
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
     * Get drone bridge URL for a specific drone
     */
    getDroneBridgeUrl(droneId, endpoint = 'drone/command') {
        const drone = this.discoveredDrones.get(droneId);
        if (!drone) {
            throw new Error(`Drone ${droneId} not found in discovered drones`);
        }
        return `http://127.0.0.1:${drone.port}/${endpoint}`;
    }

    /**
     * Get drone status URL
     */
    getDroneStatusUrl(droneId) {
        return this.getDroneBridgeUrl(droneId, 'status');
    }

    /**
     * Get fleet overview
     */
    getFleetOverview() {
        const drones = this.getDiscoveredDrones();
        return {
            totalDrones: drones.length,
            availableDrones: drones.filter(d => d.available).length,
            drones: drones.map(drone => ({
                id: drone.id,
                port: drone.port,
                available: drone.available,
                lastSeen: drone.lastSeen,
                status: drone.status
            }))
        };
    }

    /**
     * Force refresh discovery
     */
    async refreshDiscovery() {
        console.log('🔄 Forcing drone discovery refresh...');
        await this.discoverDrones();
        return this.getFleetOverview();
    }
}

// Export singleton instance
export const droneDiscoveryService = new DroneDiscoveryService();
export default droneDiscoveryService;
