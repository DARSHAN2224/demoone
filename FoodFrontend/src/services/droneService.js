import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/config';

class DroneService {
  constructor() {
    this.socket = null;
    this.droneStatus = new Map();
    this.activeFlights = new Map();
    this.telemetryData = new Map();
    this.eventListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize drone service and socket connection
   */
  async initialize() {
    try {
      // Initialize socket connection (browser namespace)
      this.socket = io(`${API_BASE_URL}/browser`, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      // Setup socket event handlers
      this.setupSocketHandlers();

      // Initialize drone status
      await this.refreshDroneStatus();

      console.log('Drone service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize drone service:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to drone service');
      this.reconnectAttempts = 0;
      this.emit('drone_service_ready');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from drone service');
      this.emit('drone_service_disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Drone service connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('drone_service_connection_failed', error);
      }
    });

    // Drone telemetry events
    this.socket.on('drone_telemetry', (data) => {
      this.handleTelemetryUpdate(data);
    });

    this.socket.on('drone_status_update', (data) => {
      this.handleStatusUpdate(data);
    });

    this.socket.on('flight_plan_update', (data) => {
      this.handleFlightPlanUpdate(data);
    });

    this.socket.on('emergency_alert', (data) => {
      this.handleEmergencyAlert(data);
    });

    this.socket.on('weather_update', (data) => {
      this.handleWeatherUpdate(data);
    });

    // Command response events
    this.socket.on('command_response', (data) => {
      this.handleCommandResponse(data);
    });

    this.socket.on('command_error', (data) => {
      this.handleCommandError(data);
    });
  }

  /**
   * Send command to drone
   * @param {Object} command - Command object
   * @returns {Promise<Object>} Command result
   */
  async sendCommand(command) {
    try {
      if (!this.socket?.connected) {
        throw new Error('Drone service not connected');
      }

      // Validate command
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        throw new Error(`Invalid command: ${validation.error}`);
      }

      // Send command through socket
      return new Promise((resolve, reject) => {
        const commandId = this.generateCommandId();
        
        // Set up response handler
        const responseHandler = (data) => {
          if (data.commandId === commandId) {
            this.socket.off('command_response', responseHandler);
            this.socket.off('command_error', errorHandler);
            resolve(data);
          }
        };

        const errorHandler = (data) => {
          if (data.commandId === commandId) {
            this.socket.off('command_response', responseHandler);
            this.socket.off('command_error', errorHandler);
            reject(new Error(data.error));
          }
        };

        this.socket.on('command_response', responseHandler);
        this.socket.on('command_error', errorHandler);

        // Send command
        this.socket.emit('send_command', {
          ...command,
          commandId,
          timestamp: Date.now()
        });

        // Set timeout
        setTimeout(() => {
          this.socket.off('command_response', responseHandler);
          this.socket.off('command_error', errorHandler);
          reject(new Error('Command timeout'));
        }, 30000);
      });
    } catch (error) {
      console.error('Error sending drone command:', error);
      throw error;
    }
  }

  /**
   * Get all available drones
   * @returns {Promise<Array>} List of drones
   */
  async getDrones() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drones`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.drones || [];
    } catch (error) {
      console.error('Error fetching drones:', error);
      throw error;
    }
  }

  /**
   * Get drone by ID
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} Drone data
   */
  async getDrone(droneId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drones/${droneId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.drone;
    } catch (error) {
      console.error('Error fetching drone:', error);
      throw error;
    }
  }

  /**
   * Get drone telemetry data
   * @param {string} droneId - Drone ID
   * @returns {Promise<Object>} Telemetry data
   */
  async getDroneTelemetry(droneId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drones/${droneId}/telemetry`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.telemetry;
    } catch (error) {
      console.error('Error fetching drone telemetry:', error);
      throw error;
    }
  }

  /**
   * Get flight plans for a drone
   * @param {string} droneId - Drone ID
   * @returns {Promise<Array>} Flight plans
   */
  async getFlightPlans(droneId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drones/${droneId}/flight-plans`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.flightPlans || [];
    } catch (error) {
      console.error('Error fetching flight plans:', error);
      throw error;
    }
  }

  /**
   * Create new flight plan
   * @param {Object} flightPlan - Flight plan data
   * @returns {Promise<Object>} Created flight plan
   */
  async createFlightPlan(flightPlan) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flight-plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(flightPlan)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.flightPlan;
    } catch (error) {
      console.error('Error creating flight plan:', error);
      throw error;
    }
  }

  /**
   * Update flight plan
   * @param {string} flightPlanId - Flight plan ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated flight plan
   */
  async updateFlightPlan(flightPlanId, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flight-plans/${flightPlanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.flightPlan;
    } catch (error) {
      console.error('Error updating flight plan:', error);
      throw error;
    }
  }

  /**
   * Get weather data for location
   * @param {Object} location - Location coordinates
   * @returns {Promise<Object>} Weather data
   */
  async getWeatherData(location) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/weather?lat=${location.lat}&lng=${location.lng}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.weather;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw error;
    }
  }

  /**
   * Check flight safety for location
   * @param {Object} location - Location coordinates
   * @param {string} droneType - Type of drone
   * @returns {Promise<Object>} Safety assessment
   */
  async checkFlightSafety(location, droneType = 'standard') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/weather/safety`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ location, droneType })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.safety;
    } catch (error) {
      console.error('Error checking flight safety:', error);
      throw error;
    }
  }

  /**
   * Generate QR code for delivery
   * @param {Object} deliveryData - Delivery information
   * @returns {Promise<Object>} QR code data
   */
  async generateDeliveryQR(deliveryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/qr/delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(deliveryData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.qrCode;
    } catch (error) {
      console.error('Error generating delivery QR:', error);
      throw error;
    }
  }

  /**
   * Validate command structure
   * @param {Object} command - Command to validate
   * @returns {Object} Validation result
   */
  validateCommand(command) {
    if (!command.droneId) {
      return { valid: false, error: 'Drone ID required' };
    }

    if (!command.command) {
      return { valid: false, error: 'Command type required' };
    }

    const validCommands = [
      'TAKEOFF', 'LAND', 'GOTO', 'RETURN_TO_BASE', 'HOVER',
      'EMERGENCY_LAND', 'UPDATE_FLIGHT_PLAN', 'SCAN_QR_CODE',
      'DELIVER_PACKAGE', 'MONITOR_WEATHER'
    ];

    if (!validCommands.includes(command.command)) {
      return { valid: false, error: 'Invalid command type' };
    }

    return { valid: true };
  }

  /**
   * Generate unique command ID
   * @returns {string} Command ID
   */
  generateCommandId() {
    return `CMD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle telemetry updates
   * @param {Object} data - Telemetry data
   */
  handleTelemetryUpdate(data) {
    this.telemetryData.set(data.droneId, {
      ...data,
      timestamp: Date.now()
    });

    this.emit('telemetry_updated', data);
  }

  /**
   * Handle status updates
   * @param {Object} data - Status data
   */
  handleStatusUpdate(data) {
    this.droneStatus.set(data.droneId, {
      ...data,
      lastUpdate: Date.now()
    });

    this.emit('status_updated', data);
  }

  /**
   * Handle flight plan updates
   * @param {Object} data - Flight plan data
   */
  handleFlightPlanUpdate(data) {
    this.activeFlights.set(data.droneId, {
      ...data,
      lastUpdate: Date.now()
    });

    this.emit('flight_plan_updated', data);
  }

  /**
   * Handle emergency alerts
   * @param {Object} data - Emergency data
   */
  handleEmergencyAlert(data) {
    console.error('EMERGENCY ALERT:', data);
    this.emit('emergency_alert', data);
  }

  /**
   * Handle weather updates
   * @param {Object} data - Weather data
   */
  handleWeatherUpdate(data) {
    this.emit('weather_updated', data);
  }

  /**
   * Handle command responses
   * @param {Object} data - Command response data
   */
  handleCommandResponse(data) {
    this.emit('command_response', data);
  }

  /**
   * Handle command errors
   * @param {Object} data - Command error data
   */
  handleCommandError(data) {
    this.emit('command_error', data);
  }

  /**
   * Refresh drone status from backend
   */
  async refreshDroneStatus() {
    try {
      const drones = await this.getDrones();
      drones.forEach(drone => {
        this.droneStatus.set(drone._id, {
          ...drone,
          lastUpdate: Date.now()
        });
      });
    } catch (error) {
      console.error('Error refreshing drone status:', error);
    }
  }

  /**
   * Get current drone status
   * @param {string} droneId - Optional drone ID
   * @returns {Object|Map} Drone status
   */
  getDroneStatus(droneId = null) {
    if (droneId) {
      return this.droneStatus.get(droneId);
    }
    return this.droneStatus;
  }

  /**
   * Get current telemetry data
   * @param {string} droneId - Optional drone ID
   * @returns {Object|Map} Telemetry data
   */
  getTelemetryData(droneId = null) {
    if (droneId) {
      return this.telemetryData.get(droneId);
    }
    return this.telemetryData;
  }

  /**
   * Get active flights
   * @param {string} droneId - Optional drone ID
   * @returns {Object|Map} Active flights
   */
  getActiveFlights(droneId = null) {
    if (droneId) {
      return this.activeFlights.get(droneId);
    }
    return this.activeFlights;
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
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
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.droneStatus.clear();
    this.activeFlights.clear();
    this.telemetryData.clear();
    this.eventListeners.clear();
  }
}

// Create singleton instance
const droneService = new DroneService();

export default droneService;
