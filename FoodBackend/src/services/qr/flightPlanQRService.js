import { coreQRService } from './coreQRService.js';

class FlightPlanQRService {
  constructor() {
    this.coreService = coreQRService;
  }

  /**
   * Generate QR code for PX4 flight plan
   * @param {Object} flightPlan - PX4 flight plan data
   * @returns {Object} QR code for flight plan
   */
  async generatePX4FlightPlanQR(flightPlan) {
    try {
      const px4Data = {
        type: 'px4_flight_plan',
        mission: flightPlan.mission,
        waypoints: flightPlan.waypoints,
        parameters: flightPlan.parameters,
        timestamp: Date.now(),
        droneId: flightPlan.droneId
      };

      const qrResult = await this.coreService.generateQRCode(px4Data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2
      });

      return {
        success: true,
        qrCode: qrResult.qrCode,
        flightPlan: px4Data,
        px4Format: this.formatForPX4(px4Data)
      };
    } catch (error) {
      console.error('Error generating PX4 flight plan QR:', error);
      throw new Error('Failed to generate PX4 flight plan QR');
    }
  }

  /**
   * Generate QR code for RealEngine simulation
   * @param {Object} simulationData - RealEngine simulation data
   * @returns {Object} QR code for simulation
   */
  async generateRealEngineSimulationQR(simulationData) {
    try {
      const realEngineData = {
        type: 'realengine_simulation',
        scenario: simulationData.scenario,
        environment: simulationData.environment,
        droneConfig: simulationData.droneConfig,
        timestamp: Date.now(),
        simulationId: simulationData.simulationId
      };

      const qrResult = await this.coreService.generateQRCode(realEngineData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2
      });

      return {
        success: true,
        qrCode: qrResult.qrCode,
        simulation: realEngineData,
        realEngineFormat: this.formatForRealEngine(realEngineData)
      };
    } catch (error) {
      console.error('Error generating RealEngine simulation QR:', error);
      throw new Error('Failed to generate RealEngine simulation QR');
    }
  }

  /**
   * Format data for PX4 autopilot
   * @param {Object} px4Data - PX4 flight plan data
   * @returns {Object} PX4 formatted data
   */
  formatForPX4(px4Data) {
    return {
      mission: {
        id: px4Data.mission.id || Date.now(),
        name: px4Data.mission.name || 'FoodApp Delivery',
        type: 'mission',
        waypoints: px4Data.waypoints.map((wp, index) => ({
          index: index,
          type: wp.type || 'waypoint',
          lat: wp.lat,
          lon: wp.lon,
          alt: wp.alt || 100,
          param1: wp.param1 || 0,
          param2: wp.param2 || 0,
          param3: wp.param3 || 0,
          param4: wp.param4 || 0
        }))
      },
      parameters: {
        ...px4Data.parameters,
        WPNAV_SPEED: px4Data.parameters.WPNAV_SPEED || 15,
        WPNAV_ACCEL: px4Data.parameters.WPNAV_ACCEL || 200,
        WPNAV_RADIUS: px4Data.parameters.WPNAV_RADIUS || 2
      }
    };
  }

  /**
   * Format data for RealEngine simulation
   * @param {Object} realEngineData - RealEngine simulation data
   * @returns {Object} RealEngine formatted data
   */
  formatForRealEngine(realEngineData) {
    return {
      simulation: {
        id: realEngineData.simulationId,
        name: realEngineData.scenario.name || 'FoodApp Drone Simulation',
        type: 'drone_delivery',
        environment: {
          weather: realEngineData.environment.weather || 'clear',
          wind: realEngineData.environment.wind || { speed: 5, direction: 0 },
          visibility: realEngineData.environment.visibility || 10000,
          temperature: realEngineData.environment.temperature || 20
        },
        drone: {
          model: realEngineData.droneConfig.model || 'standard_delivery_drone',
          weight: realEngineData.droneConfig.weight || 2.5,
          maxSpeed: realEngineData.droneConfig.maxSpeed || 20,
          maxAltitude: realEngineData.droneConfig.maxAltitude || 120,
          payload: realEngineData.droneConfig.payload || 5
        },
        scenario: {
          type: realEngineData.scenario.type || 'delivery',
          startLocation: realEngineData.scenario.startLocation,
          endLocation: realEngineData.scenario.endLocation,
          obstacles: realEngineData.scenario.obstacles || [],
          emergencyZones: realEngineData.scenario.emergencyZones || []
        }
      }
    };
  }

  /**
   * Parse PX4 flight plan from QR code
   * @param {string} qrData - QR code data
   * @returns {Object} Parsed PX4 flight plan
   */
  parsePX4FlightPlan(qrData) {
    try {
      const parsedData = this.coreService.parseQRData(qrData);
      
      if (parsedData.type !== 'px4_flight_plan') {
        throw new Error('Invalid PX4 flight plan QR code');
      }

      return {
        success: true,
        flightPlan: parsedData,
        formatted: this.formatForPX4(parsedData)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse RealEngine simulation from QR code
   * @param {string} qrData - QR code data
   * @returns {Object} Parsed RealEngine simulation
   */
  parseRealEngineSimulation(qrData) {
    try {
      const parsedData = this.coreService.parseQRData(qrData);
      
      if (parsedData.type !== 'realengine_simulation') {
        throw new Error('Invalid RealEngine simulation QR code');
      }

      return {
        success: true,
        simulation: parsedData,
        formatted: this.formatForRealEngine(parsedData)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate PX4 flight plan
   * @param {Object} flightPlan - Flight plan to validate
   * @returns {Object} Validation result
   */
  validatePX4FlightPlan(flightPlan) {
    const errors = [];

    if (!flightPlan.waypoints || flightPlan.waypoints.length < 2) {
      errors.push('Flight plan must have at least 2 waypoints');
    }

    if (!flightPlan.mission || !flightPlan.mission.name) {
      errors.push('Mission name is required');
    }

    if (flightPlan.waypoints) {
      flightPlan.waypoints.forEach((wp, index) => {
        if (typeof wp.lat !== 'number' || typeof wp.lon !== 'number') {
          errors.push(`Waypoint ${index}: Invalid coordinates`);
        }
        if (wp.alt && (wp.alt < 30 || wp.alt > 120)) {
          errors.push(`Waypoint ${index}: Altitude must be between 30-120m`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate RealEngine simulation data
   * @param {Object} simulationData - Simulation data to validate
   * @returns {Object} Validation result
   */
  validateRealEngineSimulation(simulationData) {
    const errors = [];

    if (!simulationData.scenario || !simulationData.scenario.name) {
      errors.push('Simulation scenario name is required');
    }

    if (!simulationData.droneConfig || !simulationData.droneConfig.model) {
      errors.push('Drone configuration is required');
    }

    if (!simulationData.environment) {
      errors.push('Environment configuration is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }
}

export const flightPlanQRService = new FlightPlanQRService();
export default flightPlanQRService;
