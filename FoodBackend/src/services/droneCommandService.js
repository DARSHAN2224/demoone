import { Drone } from '../models/droneModel.js';
import { DroneAssignment } from '../models/droneAssignmentModel.js';
import { DroneOrder } from '../models/droneOrderModel.js';
import { weatherService } from './weather/index.js';
import { qrService } from './qr/index.js';
import { droneBridgeClient } from './droneBridgeClient.js';

class DroneCommandService {
  constructor() {
    this.activeCommands = new Map();
    this.commandQueue = [];
    this.telemetryData = new Map();
    this.emergencyContacts = new Map();
    this.commandHistory = [];
    this.maxRetries = 3;
    this.commandTimeout = 30000; // 30 seconds
  }

  /**
   * Send command to drone
   * @param {Object} command - Command object
   * @returns {Object} Command result
   */
  async sendCommand(command) {
    try {
      // Validate command
      const validation = this.validateCommand(command);
      if (!validation.valid) {
        throw new Error(`Invalid command: ${validation.error}`);
      }

      // Check drone availability
      const droneAvailable = await this.checkDroneAvailability(command.droneId);
      if (!droneAvailable.available) {
        throw new Error(`Drone not available: ${droneAvailable.reason}`);
      }

      // Check weather conditions for flight commands
      if (this.isFlightCommand(command.command)) {
        const weatherCheck = await this.checkWeatherForFlight(command);
        if (!weatherCheck.safe) {
          throw new Error(`Weather conditions unsafe: ${weatherCheck.reason}`);
        }
      }

      // Add command to queue
      const queuedCommand = {
        ...command,
        id: this.generateCommandId(),
        timestamp: Date.now(),
        status: 'queued',
        retries: 0
      };

      this.commandQueue.push(queuedCommand);
      this.activeCommands.set(queuedCommand.id, queuedCommand);

      // Process command queue
      await this.processCommandQueue();

      return {
        success: true,
        commandId: queuedCommand.id,
        status: 'queued',
        message: 'Command queued successfully'
      };
    } catch (error) {
      console.error('Error sending drone command:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Process command queue
   */
  async processCommandQueue() {
    while (this.commandQueue.length > 0) {
      const command = this.commandQueue.shift();
      
      try {
        // Execute command
        const result = await this.executeCommand(command);
        
        if (result.success) {
          command.status = 'executed';
          command.result = result;
          command.executedAt = Date.now();
        } else {
          // Retry logic
          if (command.retries < this.maxRetries) {
            command.retries++;
            command.status = 'retrying';
            this.commandQueue.unshift(command);
          } else {
            command.status = 'failed';
            command.error = result.error;
            command.failedAt = Date.now();
          }
        }

        // Update active commands
        this.activeCommands.set(command.id, command);
        
        // Log command execution
        this.logCommandExecution(command, result);
        
      } catch (error) {
        console.error(`Error executing command ${command.id}:`, error);
        command.status = 'failed';
        command.error = error.message;
        command.failedAt = Date.now();
        this.activeCommands.set(command.id, command);
      }
    }
  }

  /**
   * Execute a single command
   * @param {Object} command - Command to execute
   * @returns {Object} Execution result
   */
  async executeCommand(command) {
    try {
      switch (command.command) {
        case 'TAKEOFF':
          return await this.executeTakeoff(command);
        case 'LAND':
          return await this.executeLand(command);
        case 'GOTO':
          return await this.executeGoto(command);
        case 'RETURN_TO_BASE':
          return await this.executeReturnToBase(command);
        case 'HOVER':
          return await this.executeHover(command);
        case 'EMERGENCY_LAND':
          return await this.executeEmergencyLand(command);
        case 'UPDATE_FLIGHT_PLAN':
          return await this.executeUpdateFlightPlan(command);
        case 'SCAN_QR_CODE':
          return await this.executeScanQRCode(command);
        case 'DELIVER_PACKAGE':
          return await this.executeDeliverPackage(command);
        case 'MONITOR_WEATHER':
          return await this.executeMonitorWeather(command);
        default:
          throw new Error(`Unknown command: ${command.command}`);
      }
    } catch (error) {
      console.error(`Error executing command ${command.command}:`, error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Execute takeoff command
   * @param {Object} command - Takeoff command
   * @returns {Object} Takeoff result
   */
  async executeTakeoff(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Check pre-flight conditions
      const preflightCheck = await this.performPreflightCheck(command.droneId);
      if (!preflightCheck.passed) {
        throw new Error(`Pre-flight check failed: ${preflightCheck.reason}`);
      }

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'in_flight',
        lastTakeoff: new Date(),
        currentAltitude: command.altitude || 50,
        currentLocation: command.location || drone.baseLocation
      });

      // Update assignment status
      if (command.assignmentId) {
        await DroneAssignment.findByIdAndUpdate(command.assignmentId, {
          status: 'in_flight',
          takeoffTime: new Date()
        });
      }

      return {
        success: true,
        message: 'Takeoff successful',
        altitude: command.altitude || 50,
        location: command.location || drone.baseLocation,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Takeoff failed: ${error.message}`);
    }
  }

  /**
   * Execute land command
   * @param {Object} command - Land command
   * @returns {Object} Landing result
   */
  async executeLand(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'landed',
        lastLanding: new Date(),
        currentAltitude: 0,
        currentLocation: command.location || drone.baseLocation
      });

      // Update assignment status
      if (command.assignmentId) {
        await DroneAssignment.findByIdAndUpdate(command.assignmentId, {
          status: 'completed',
          landingTime: new Date()
        });
      }

      return {
        success: true,
        message: 'Landing successful',
        location: command.location || drone.baseLocation,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Landing failed: ${error.message}`);
    }
  }

  /**
   * Execute goto command
   * @param {Object} command - Goto command
   * @returns {Object} Goto result
   */
  async executeGoto(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Validate destination
      if (!command.destination || !command.destination.lat || !command.destination.lng) {
        throw new Error('Invalid destination coordinates');
      }

      // Calculate route and ETA
      const route = await this.calculateRoute(
        drone.currentLocation,
        command.destination,
        command.altitude || 100
      );

      // Update drone location
      await Drone.findByIdAndUpdate(command.droneId, {
        currentLocation: command.destination,
        currentAltitude: command.altitude || 100,
        lastMovement: new Date()
      });

      return {
        success: true,
        message: 'Navigation successful',
        destination: command.destination,
        route: route,
        eta: route.eta,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Navigation failed: ${error.message}`);
    }
  }

  /**
   * Execute return to base command
   * @param {Object} command - Return to base command
   * @returns {Object} Return result
   */
  async executeReturnToBase(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Calculate return route
      const returnRoute = await this.calculateRoute(
        drone.currentLocation,
        drone.baseLocation,
        command.altitude || 100
      );

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'returning_to_base',
        returnRoute: returnRoute,
        lastMovement: new Date()
      });

      return {
        success: true,
        message: 'Return to base initiated',
        baseLocation: drone.baseLocation,
        route: returnRoute,
        eta: returnRoute.eta,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Return to base failed: ${error.message}`);
    }
  }

  /**
   * Execute hover command
   * @param {Object} command - Hover command
   * @returns {Object} Hover result
   */
  async executeHover(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'hovering',
        hoverLocation: drone.currentLocation,
        hoverAltitude: drone.currentAltitude,
        hoverStartTime: new Date()
      });

      return {
        success: true,
        message: 'Hovering initiated',
        location: drone.currentLocation,
        altitude: drone.currentAltitude,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Hover failed: ${error.message}`);
    }
  }

  /**
   * Execute emergency land command
   * @param {Object} command - Emergency land command
   * @returns {Object} Emergency landing result
   */
  async executeEmergencyLand(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Find nearest safe landing zone
      const landingZone = await this.findNearestSafeLandingZone(
        drone.currentLocation,
        command.emergencyType || 'general'
      );

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'emergency_landing',
        emergencyType: command.emergencyType || 'general',
        emergencyLandingZone: landingZone,
        emergencyInitiated: new Date()
      });

      // Send emergency notifications
      await this.sendEmergencyNotifications(command.droneId, command.emergencyType);

      return {
        success: true,
        message: 'Emergency landing initiated',
        landingZone: landingZone,
        emergencyType: command.emergencyType || 'general',
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Emergency landing failed: ${error.message}`);
    }
  }

  /**
   * Execute update flight plan command
   * @param {Object} command - Update flight plan command
   * @returns {Object} Update result
   */
  async executeUpdateFlightPlan(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Validate new flight plan
      const validation = this.validateFlightPlan(command.newFlightPlan);
      if (!validation.valid) {
        throw new Error(`Invalid flight plan: ${validation.error}`);
      }

      // Update drone flight plan
      await Drone.findByIdAndUpdate(command.droneId, {
        currentFlightPlan: command.newFlightPlan,
        flightPlanUpdated: new Date(),
        lastMovement: new Date()
      });

      return {
        success: true,
        message: 'Flight plan updated successfully',
        newFlightPlan: command.newFlightPlan,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Flight plan update failed: ${error.message}`);
    }
  }

  /**
   * Execute scan QR code command
   * @param {Object} command - Scan QR code command
   * @returns {Object} Scan result
   */
  async executeScanQRCode(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Simulate QR code scanning
      const scanResult = await this.simulateQRCodeScan(command.location, command.qrData);

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        lastQRScan: new Date(),
        qrScanResults: scanResult
      });

      return {
        success: true,
        message: 'QR code scan completed',
        scanResult: scanResult,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`QR code scan failed: ${error.message}`);
    }
  }

  /**
   * Execute deliver package command
   * @param {Object} command - Deliver package command
   * @returns {Object} Delivery result
   */
  async executeDeliverPackage(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Validate delivery location
      if (!command.deliveryLocation) {
        throw new Error('Delivery location required');
      }

      // Check delivery feasibility
      const deliveryCheck = await this.checkDeliveryFeasibility(
        command.droneId,
        command.deliveryLocation,
        command.packageDetails
      );

      if (!deliveryCheck.feasible) {
        throw new Error(`Delivery not feasible: ${deliveryCheck.reason}`);
      }

      // Update drone status
      await Drone.findByIdAndUpdate(command.droneId, {
        status: 'delivering',
        deliveryLocation: command.deliveryLocation,
        packageDetails: command.packageDetails,
        deliveryInitiated: new Date()
      });

      return {
        success: true,
        message: 'Package delivery initiated',
        deliveryLocation: command.deliveryLocation,
        packageDetails: command.packageDetails,
        eta: deliveryCheck.eta,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Package delivery failed: ${error.message}`);
    }
  }

  /**
   * Execute monitor weather command
   * @param {Object} command - Monitor weather command
   * @returns {Object} Weather monitoring result
   */
  async executeMonitorWeather(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }

      // Get weather data for drone location
      const weatherData = await weatherService.getCurrentWeather(
        drone.currentLocation.lat,
        drone.currentLocation.lng
      );

      // Assess flight safety
      const safetyAssessment = await weatherService.checkFlightSafety(
        drone.currentLocation,
        drone.type || 'standard'
      );

      // Update drone weather data
      await Drone.findByIdAndUpdate(command.droneId, {
        currentWeather: weatherData,
        weatherSafety: safetyAssessment,
        lastWeatherCheck: new Date()
      });

      return {
        success: true,
        message: 'Weather monitoring completed',
        weather: weatherData,
        safety: safetyAssessment,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(`Weather monitoring failed: ${error.message}`);
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
   * Check if drone is available for commands
   * @param {string} droneId - Drone ID
   * @returns {Object} Availability status
   */
  async checkDroneAvailability(droneId) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) {
        return { available: false, reason: 'Drone not found' };
      }

      if (drone.status === 'maintenance') {
        return { available: false, reason: 'Drone under maintenance' };
      }

      if (drone.status === 'emergency') {
        return { available: false, reason: 'Drone in emergency state' };
      }

      if (drone.batteryLevel < 20) {
        return { available: false, reason: 'Low battery' };
      }

      return { available: true };
    } catch (error) {
      return { available: false, reason: 'Error checking availability' };
    }
  }

  /**
   * Check if command is a flight command
   * @param {string} command - Command type
   * @returns {boolean} True if flight command
   */
  isFlightCommand(command) {
    const flightCommands = ['TAKEOFF', 'GOTO', 'RETURN_TO_BASE'];
    return flightCommands.includes(command);
  }

  /**
   * Check weather conditions for flight
   * @param {Object} command - Flight command
   * @returns {Object} Weather check result
   */
  async checkWeatherForFlight(command) {
    try {
      const drone = await Drone.findById(command.droneId);
      if (!drone) {
        return { safe: false, reason: 'Drone not found' };
      }

      const location = command.location || drone.currentLocation;
      const safetyCheck = await weatherService.checkFlightSafety(
        location,
        drone.type || 'standard'
      );

      return {
        safe: safetyCheck.safe,
        reason: safetyCheck.safe ? 'Weather conditions safe' : 'Weather conditions unsafe',
        details: safetyCheck
      };
    } catch (error) {
      return { safe: false, reason: 'Weather check failed' };
    }
  }

  /**
   * Perform pre-flight check
   * @param {string} droneId - Drone ID
   * @returns {Object} Pre-flight check result
   */
  async performPreflightCheck(droneId) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) {
        return { passed: false, reason: 'Drone not found' };
      }

      const checks = [
        { name: 'Battery', passed: drone.batteryLevel > 30, value: drone.batteryLevel },
        { name: 'GPS Signal', passed: drone.gpsSignal > 0.8, value: drone.gpsSignal },
        { name: 'Communication', passed: drone.communicationStatus === 'active', value: drone.communicationStatus },
        { name: 'Propellers', passed: drone.propellerStatus === 'good', value: drone.propellerStatus },
        { name: 'Sensors', passed: drone.sensorStatus === 'calibrated', value: drone.sensorStatus }
      ];

      const failedChecks = checks.filter(check => !check.passed);
      const passed = failedChecks.length === 0;

      return {
        passed,
        reason: passed ? 'All checks passed' : `Failed checks: ${failedChecks.map(c => c.name).join(', ')}`,
        checks,
        failedChecks
      };
    } catch (error) {
      return { passed: false, reason: 'Pre-flight check failed' };
    }
  }

  /**
   * Calculate route between two points
   * @param {Object} start - Start coordinates
   * @param {Object} end - End coordinates
   * @param {number} altitude - Flight altitude
   * @returns {Object} Route information
   */
  async calculateRoute(start, end, altitude) {
    try {
      // Calculate distance using Haversine formula
      const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
      
      // Estimate flight time (assuming average speed of 15 m/s)
      const averageSpeed = 15; // m/s
      const flightTime = distance / averageSpeed;
      
      // Calculate ETA
      const eta = new Date(Date.now() + flightTime * 1000);

      return {
        start,
        end,
        altitude,
        distance: Math.round(distance),
        flightTime: Math.round(flightTime),
        eta,
        waypoints: this.generateWaypoints(start, end, altitude)
      };
    } catch (error) {
      throw new Error(`Route calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two coordinates
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Generate waypoints for route
   * @param {Object} start - Start coordinates
   * @param {Object} end - End coordinates
   * @param {number} altitude - Flight altitude
   * @returns {Array} Waypoints
   */
  generateWaypoints(start, end, altitude) {
    const waypoints = [];
    const steps = 5; // Number of waypoints

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;
      
      waypoints.push({
        lat,
        lng,
        altitude,
        order: i
      });
    }

    return waypoints;
  }

  /**
   * Find nearest safe landing zone
   * @param {Object} currentLocation - Current location
   * @param {string} emergencyType - Type of emergency
   * @returns {Object} Landing zone
   */
  async findNearestSafeLandingZone(currentLocation, emergencyType) {
    try {
      // This would typically query a database of known safe landing zones
      // For now, returning a calculated safe zone
      const safeZone = {
        lat: currentLocation.lat + (Math.random() - 0.5) * 0.01,
        lng: currentLocation.lng + (Math.random() - 0.5) * 0.01,
        type: 'emergency_landing',
        safety: 'high',
        distance: this.calculateDistance(
          currentLocation.lat, currentLocation.lng,
          currentLocation.lat + 0.005, currentLocation.lng + 0.005
        )
      };

      return safeZone;
    } catch (error) {
      // Return current location as fallback
      return {
        ...currentLocation,
        type: 'emergency_landing',
        safety: 'medium',
        distance: 0
      };
    }
  }

  /**
   * Send emergency notifications
   * @param {string} droneId - Drone ID
   * @param {string} emergencyType - Type of emergency
   */
  async sendEmergencyNotifications(droneId, emergencyType) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) return;

      // Get emergency contacts
      const contacts = this.emergencyContacts.get(droneId) || [];
      
      // Send notifications to emergency contacts
      for (const contact of contacts) {
        console.log(`Emergency notification sent to ${contact.name} (${contact.phone})`);
        // This would integrate with actual notification service
      }

      // Log emergency
      console.log(`Emergency: ${emergencyType} for drone ${droneId}`);
    } catch (error) {
      console.error('Error sending emergency notifications:', error);
    }
  }

  /**
   * Validate flight plan
   * @param {Object} flightPlan - Flight plan to validate
   * @returns {Object} Validation result
   */
  validateFlightPlan(flightPlan) {
    if (!flightPlan.waypoints || flightPlan.waypoints.length < 2) {
      return { valid: false, error: 'Flight plan must have at least 2 waypoints' };
    }

    if (!flightPlan.altitude || flightPlan.altitude < 30 || flightPlan.altitude > 120) {
      return { valid: false, error: 'Invalid altitude (must be between 30-120m)' };
    }

    return { valid: true };
  }

  /**
   * Simulate QR code scanning
   * @param {Object} location - Scan location
   * @param {Object} qrData - QR code data
   * @returns {Object} Scan result
   */
  async simulateQRCodeScan(location, qrData) {
    try {
      // Simulate scanning process
      const scanResult = {
        success: true,
        qrData: qrData,
        location: location,
        timestamp: Date.now(),
        quality: Math.random() * 0.3 + 0.7, // 70-100% quality
        confidence: Math.random() * 0.2 + 0.8 // 80-100% confidence
      };

      return scanResult;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check delivery feasibility
   * @param {string} droneId - Drone ID
   * @param {Object} deliveryLocation - Delivery location
   * @param {Object} packageDetails - Package details
   * @returns {Object} Feasibility check result
   */
  async checkDeliveryFeasibility(droneId, deliveryLocation, packageDetails) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) {
        return { feasible: false, reason: 'Drone not found' };
      }

      // Check package weight
      if (packageDetails.weight > drone.maxPayload) {
        return { feasible: false, reason: 'Package exceeds drone payload capacity' };
      }

      // Check distance
      const distance = this.calculateDistance(
        drone.currentLocation.lat, drone.currentLocation.lng,
        deliveryLocation.lat, deliveryLocation.lng
      );

      if (distance > drone.maxRange) {
        return { feasible: false, reason: 'Delivery location exceeds drone range' };
      }

      // Check battery
      const estimatedConsumption = distance * 0.1; // 0.1% per meter
      if (drone.batteryLevel < estimatedConsumption + 20) { // 20% safety margin
        return { feasible: false, reason: 'Insufficient battery for delivery' };
      }

      // Calculate ETA
      const averageSpeed = 15; // m/s
      const flightTime = distance / averageSpeed;
      const eta = new Date(Date.now() + flightTime * 1000);

      return {
        feasible: true,
        distance: Math.round(distance),
        estimatedConsumption: Math.round(estimatedConsumption),
        eta,
        flightTime: Math.round(flightTime)
      };
    } catch (error) {
      return { feasible: false, reason: 'Feasibility check failed' };
    }
  }

  /**
   * Generate unique command ID
   * @returns {string} Command ID
   */
  generateCommandId() {
    return `CMD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log command execution
   * @param {Object} command - Executed command
   * @param {Object} result - Execution result
   */
  logCommandExecution(command, result) {
    const logEntry = {
      commandId: command.id,
      droneId: command.droneId,
      command: command.command,
      timestamp: command.timestamp,
      executedAt: command.executedAt,
      status: command.status,
      result: result,
      retries: command.retries
    };

    this.commandHistory.push(logEntry);
    
    // Keep only last 1000 commands
    if (this.commandHistory.length > 1000) {
      this.commandHistory = this.commandHistory.slice(-1000);
    }
  }

  /**
   * Get command history
   * @param {string} droneId - Optional drone ID filter
   * @param {number} limit - Number of commands to return
   * @returns {Array} Command history
   */
  getCommandHistory(droneId = null, limit = 100) {
    let history = this.commandHistory;
    
    if (droneId) {
      history = history.filter(cmd => cmd.droneId === droneId);
    }
    
    return history.slice(-limit);
  }

  /**
   * Get active commands
   * @returns {Array} Active commands
   */
  getActiveCommands() {
    return Array.from(this.activeCommands.values());
  }

  /**
   * Get command queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.commandQueue.length,
      activeCommands: this.activeCommands.size,
      processing: this.commandQueue.length > 0
    };
  }

  /**
   * Clear command queue
   */
  clearCommandQueue() {
    this.commandQueue = [];
    this.activeCommands.clear();
  }

  /**
   * Add emergency contact
   * @param {string} droneId - Drone ID
   * @param {Object} contact - Contact information
   */
  addEmergencyContact(droneId, contact) {
    if (!this.emergencyContacts.has(droneId)) {
      this.emergencyContacts.set(droneId, []);
    }
    
    this.emergencyContacts.get(droneId).push(contact);
  }

  /**
   * Remove emergency contact
   * @param {string} droneId - Drone ID
   * @param {string} contactId - Contact ID
   */
  removeEmergencyContact(droneId, contactId) {
    if (this.emergencyContacts.has(droneId)) {
      const contacts = this.emergencyContacts.get(droneId);
      const filtered = contacts.filter(c => c.id !== contactId);
      this.emergencyContacts.set(droneId, filtered);
    }
  }

  // Helper function to get drone by ID
  async getDrone(droneId) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) {
        throw new Error('Drone not found');
      }
      return drone;
    } catch (error) {
      console.error('Error getting drone:', error);
      throw error;
    }
  }

  // Execute commands using appropriate service
  async executeTakeoff(droneId, params = {}) {
    try {
      const drone = await this.getDrone(droneId);
      if (!drone) throw new Error('Drone not found');

      // Send command to drone bridge
      const result = await droneBridgeClient.sendCommand('TAKEOFF', drone.droneId, params);
      
      if (result.success) {
        // Update drone status in database
        await Drone.findByIdAndUpdate(droneId, {
          status: 'in_flight',
          lastTakeoff: new Date(),
          currentAltitude: params.altitude || 50,
          currentLocation: params.location || drone.baseLocation
        });

        return { success: true, message: 'Takeoff command sent to drone bridge' };
      } else {
        throw new Error(result.error || 'Failed to send takeoff command');
      }
    } catch (error) {
      console.error('Takeoff execution error:', error);
      throw error;
    }
  }

  async executeLand(droneId, params = {}) {
    try {
      const drone = await this.getDrone(droneId);
      if (!drone) throw new Error('Drone not found');

      // Send command to drone bridge
      const result = await droneBridgeClient.sendCommand('LAND', drone.droneId, params);
      
      if (result.success) {
        // Update drone status in database
        await Drone.findByIdAndUpdate(droneId, {
          status: 'landed',
          lastLanding: new Date(),
          currentAltitude: 0,
          currentLocation: params.location || drone.baseLocation
        });

        return { success: true, message: 'Land command sent to drone bridge' };
      } else {
        throw new Error(result.error || 'Failed to send land command');
      }
    } catch (error) {
      console.error('Land execution error:', error);
      throw error;
    }
  }

  async executeGoto(droneId, coordinates) {
    try {
      const drone = await this.getDrone(droneId);
      if (!drone) throw new Error('Drone not found');

      // Send command to drone bridge
      const result = await droneBridgeClient.sendCommand('GOTO', drone.droneId, {
        destination: coordinates,
        altitude: coordinates.altitude || 100
      });
      
      if (result.success) {
        // Update drone location in database
        await Drone.findByIdAndUpdate(droneId, {
          currentLocation: coordinates,
          currentAltitude: coordinates.altitude || 100,
          lastMovement: new Date()
        });

        return { success: true, message: 'Goto command sent to drone bridge' };
      } else {
        throw new Error(result.error || 'Failed to send goto command');
      }
    } catch (error) {
      console.error('Goto execution error:', error);
      throw error;
    }
  }

  async executeReturnToBase(droneId) {
    try {
      const drone = await this.getDrone(droneId);
      if (!drone) throw new Error('Drone not found');

      // Send command to drone bridge
      const result = await droneBridgeClient.sendCommand('RTL', drone.droneId, {
        baseLocation: drone.baseLocation
      });
      
      if (result.success) {
        // Update drone status in database
        await Drone.findByIdAndUpdate(droneId, {
          status: 'returning_to_base',
          lastMovement: new Date()
        });

        return { success: true, message: 'Return to base command sent to drone bridge' };
      } else {
        throw new Error(result.error || 'Failed to send return to base command');
      }
    } catch (error) {
      console.error('RTL execution error:', error);
      throw error;
    }
  }
}

export const droneCommandService = new DroneCommandService();

// Wrapper function for backward compatibility
export const sendCommand = async (command, droneId, params = {}) => {
  return await droneCommandService.sendCommand({
    command,
    droneId,
    ...params
  });
};

export default droneCommandService;
