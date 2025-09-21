import { api } from './api.js';

/**
 * Drone service for handling all drone-related API calls.
 * Uses the global api instance with automatic JWT token attachment.
 */
class DroneService {
  /**
   * Start a drone mission with waypoints
   * @param {string} droneId - Drone ID
   * @param {Array} waypoints - Array of waypoint objects with lat, lng properties
   * @returns {Promise<Object>} API response
   */
  async startMission(droneId, waypoints) {
    try {
      const response = await api.post(`/api/v1/test/drone/mission/start/${droneId}`, {
        waypoints: waypoints
      }, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Mission started successfully'
      };
    } catch (error) {
      console.error('Failed to start mission:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to start mission'
      };
    }
  }

  /**
   * Command drone to return to launch
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} API response
   */
  async returnToLaunch(droneId) {
    try {
      const response = await api.post('/api/v1/test/drone/emergency-stop', {
        droneId: droneId
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Return to launch command sent successfully'
      };
    } catch (error) {
      console.error('Failed to send return to launch command:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to send return to launch command'
      };
    }
  }

  /**
   * Get current drone status
   * @param {string} droneId - Drone ID (optional, defaults to DRONE-001)
   * @returns {Promise<Object>} API response
   */
  async getDroneStatus(droneId = 'DRONE-001') {
    try {
      const response = await api.get(`/api/v1/drone/status/${droneId}`);
      
      return {
        success: true,
        data: response.data,
        message: 'Drone status retrieved successfully'
      };
    } catch (error) {
      console.error('Failed to get drone status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to get drone status'
      };
    }
  }

  /**
   * Get drone availability
   * @param {Object} location - Location object with lat, lng properties
   * @returns {Promise<Object>} API response
   */
  async checkDroneAvailability(location = null) {
    try {
      const params = new URLSearchParams();
      if (location) {
        params.append('lat', location.lat);
        params.append('lng', location.lng);
      }
      
      const response = await api.get(`/api/v1/drone/availability?${params.toString()}`);
      
      return {
        success: true,
        data: response.data,
        message: 'Drone availability checked successfully'
      };
    } catch (error) {
      console.error('Failed to check drone availability:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to check drone availability'
      };
    }
  }

  /**
   * Launch drone (Admin/Seller function)
   * @param {string} droneId - Drone ID
   * @param {number} altitude - Takeoff altitude
   * @returns {Promise<Object>} API response
   */
  async launchDrone(droneId, altitude = 20) {
    try {
      const response = await api.post(`/api/v1/test/drone/launch/${droneId}`, {
        altitude: altitude
      }, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Drone launched successfully'
      };
    } catch (error) {
      console.error('Failed to launch drone:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to launch drone'
      };
    }
  }

  /**
   * Land drone (Admin/Seller function)
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} API response
   */
  async landDrone(droneId) {
    try {
      const response = await api.post(`/api/v1/test/drone/land/${droneId}`, {}, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Drone landing initiated successfully'
      };
    } catch (error) {
      console.error('Failed to land drone:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to land drone'
      };
    }
  }

  /**
   * Emergency stop drone (Admin function)
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} API response
   */
  async emergencyStop(droneId) {
    try {
      const response = await api.post(`/api/v1/test/drone/emergency-stop/${droneId}`, {}, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Emergency stop initiated successfully'
      };
    } catch (error) {
      console.error('Failed to emergency stop drone:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to emergency stop drone'
      };
    }
  }

  /**
   * Start demo mission for collision testing
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} API response
   */
  async startDemoMission(droneId) {
    try {
      const response = await api.post(`/api/v1/test/drone/demo-mission/${droneId}`, {}, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Demo mission started successfully'
      };
    } catch (error) {
      console.error('Failed to start demo mission:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to start demo mission'
      };
    }
  }

  /**
   * Reset drone state
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} API response
   */
  async resetDrone(droneId) {
    try {
      const response = await api.post(`/api/v1/test/drone/reset/${droneId}`, {}, {
        headers: { 'x-test-mode': 'true' }
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Drone reset command sent successfully'
      };
    } catch (error) {
      console.error('Failed to reset drone:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        message: 'Failed to reset drone'
      };
    }
  }
}

// Create and export singleton instance
export const droneService = new DroneService();
export default droneService;
