import { Drone } from '../../models/droneModel.js';
import { coreCommandService } from './coreCommandService.js';

class RealEngineService {
  constructor() {
    this.simulations = new Map();
    this.environments = new Map();
    this.telemetryData = new Map();
    this.simulationIntervals = new Map();
    this.isRunning = false;
  }

  // Create virtual environment
  async createEnvironment(environmentConfig = {}) {
    const envId = `env_${Date.now()}`;
    
    const environment = {
      id: envId,
      name: environmentConfig.name || 'Default Environment',
      weather: environmentConfig.weather || 'clear',
      windSpeed: environmentConfig.windSpeed || 0,
      windDirection: environmentConfig.windDirection || 0,
      temperature: environmentConfig.temperature || 20,
      visibility: environmentConfig.visibility || 10000,
      obstacles: environmentConfig.obstacles || [],
      noFlyZones: environmentConfig.noFlyZones || [],
      createdAt: new Date(),
      status: 'active'
    };

    this.environments.set(envId, environment);
    console.log(`🌍 RealEngine environment created: ${envId}`);
    
    return environment;
  }

  // Create virtual drone simulation
  async createSimulation(droneId, environmentId, simulationConfig = {}) {
    try {
      const drone = await Drone.findById(droneId);
      if (!drone) throw new Error('Drone not found');

      const environment = this.environments.get(environmentId);
      if (!environment) throw new Error('Environment not found');

      const simulationId = `sim_${droneId}_${Date.now()}`;
      
      const simulation = {
        id: simulationId,
        droneId,
        environmentId,
        status: 'initializing',
        startTime: new Date(),
        config: {
          initialPosition: simulationConfig.initialPosition || { lat: 37.7749, lng: -122.4194, alt: 0 },
          maxAltitude: simulationConfig.maxAltitude || 400,
          maxSpeed: simulationConfig.maxSpeed || 25,
          batteryCapacity: simulationConfig.batteryCapacity || 100,
          ...simulationConfig
        },
        currentState: {
          position: { ...simulationConfig.initialPosition },
          attitude: { roll: 0, pitch: 0, yaw: 0 },
          velocity: { vx: 0, vy: 0, vz: 0 },
          battery: simulationConfig.batteryCapacity || 100,
          mode: 'STABILIZED',
          armed: false
        },
        mission: {
          waypoints: [],
          currentWaypoint: 0,
          completed: false
        },
        logs: []
      };

      this.simulations.set(simulationId, simulation);
      
      // Start simulation loop
      this.startSimulationLoop(simulationId);
      
      console.log(`🚁 RealEngine simulation created: ${simulationId}`);
      return simulation;
    } catch (error) {
      console.error('RealEngine simulation creation error:', error);
      throw error;
    }
  }

  // Start simulation loop
  startSimulationLoop(simulationId) {
    const interval = setInterval(async () => {
      try {
        await this.updateSimulation(simulationId);
      } catch (error) {
        console.error('Simulation loop error:', error);
      }
    }, 100); // 10 FPS simulation

    this.simulationIntervals.set(simulationId, interval);
  }

  // Update simulation state
  async updateSimulation(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation || simulation.status === 'stopped') return;

    // Update physics
    this.updatePhysics(simulation);
    
    // Update environment effects
    this.updateEnvironmentEffects(simulation);
    
    // Update mission progress
    this.updateMissionProgress(simulation);
    
    // Emit telemetry
    await this.emitSimulationTelemetry(simulationId);
    
    // Store updated simulation
    this.simulations.set(simulationId, simulation);
  }

  // Update physics simulation
  updatePhysics(simulation) {
    const { currentState, config } = simulation;
    
    // Simple physics simulation
    if (currentState.armed && currentState.mode !== 'LAND') {
      // Update position based on velocity
      currentState.position.lat += currentState.velocity.vy * 0.00001;
      currentState.position.lng += currentState.velocity.vx * 0.00001;
      currentState.position.alt += currentState.velocity.vz * 0.1;
      
      // Apply gravity
      if (currentState.position.alt > 0) {
        currentState.velocity.vz -= 0.098; // 9.8 m/s²
      }
      
      // Battery consumption
      if (currentState.armed) {
        currentState.battery -= 0.01;
      }
    }
    
    // Ensure altitude limits
    currentState.position.alt = Math.max(0, Math.min(currentState.position.alt, config.maxAltitude));
    
    // Ensure battery limits
    currentState.battery = Math.max(0, Math.min(currentState.battery, config.batteryCapacity));
  }

  // Update environment effects
  updateEnvironmentEffects(simulation) {
    const environment = this.environments.get(simulation.environmentId);
    if (!environment) return;

    const { currentState } = simulation;
    
    // Wind effects
    if (environment.windSpeed > 0) {
      const windRad = (environment.windDirection * Math.PI) / 180;
      currentState.velocity.vx += Math.cos(windRad) * environment.windSpeed * 0.01;
      currentState.velocity.vy += Math.sin(windRad) * environment.windSpeed * 0.01;
    }
    
    // Weather effects
    if (environment.weather === 'rain') {
      currentState.velocity.vz -= 0.02; // Rain drag
    } else if (environment.weather === 'storm') {
      currentState.velocity.vx += (Math.random() - 0.5) * 0.5; // Turbulence
      currentState.velocity.vy += (Math.random() - 0.5) * 0.5;
    }
  }

  // Update mission progress
  updateMissionProgress(simulation) {
    const { mission, currentState } = simulation;
    
    if (mission.waypoints.length === 0 || mission.completed) return;
    
    const currentWaypoint = mission.waypoints[mission.currentWaypoint];
    if (!currentWaypoint) return;
    
    // Calculate distance to waypoint
    const distance = this.calculateDistance(
      currentState.position,
      currentWaypoint.position
    );
    
    // Check if waypoint reached
    if (distance < 5) { // 5 meter tolerance
      mission.currentWaypoint++;
      
      if (mission.currentWaypoint >= mission.waypoints.length) {
        mission.completed = true;
        currentState.mode = 'RTL';
      }
    }
  }

  // Execute command in simulation
  async executeCommand(simulationId, command) {
    try {
      const simulation = this.simulations.get(simulationId);
      if (!simulation) throw new Error('Simulation not found');

      const result = await this.processCommand(simulation, command);
      
      // Log command
      simulation.logs.push({
        timestamp: new Date(),
        command: command.type,
        params: command.params,
        result: result
      });
      
      return result;
    } catch (error) {
      console.error('RealEngine command error:', error);
      throw error;
    }
  }

  // Process command in simulation
  async processCommand(simulation, command) {
    const { currentState } = simulation;
    
    switch (command.type) {
      case 'ARM':
        currentState.armed = true;
        currentState.mode = 'STABILIZED';
        return { success: true, message: 'Drone armed' };
        
      case 'DISARM':
        currentState.armed = false;
        currentState.mode = 'DISARMED';
        return { success: true, message: 'Drone disarmed' };
        
      case 'TAKEOFF':
        if (!currentState.armed) {
          throw new Error('Drone must be armed before takeoff');
        }
        currentState.mode = 'TAKEOFF';
        currentState.position.alt = command.params.altitude || 100;
        return { success: true, message: 'Takeoff initiated' };
        
      case 'LAND':
        currentState.mode = 'LAND';
        return { success: true, message: 'Landing initiated' };
        
      case 'GOTO':
        if (currentState.mode === 'LAND') {
          throw new Error('Cannot goto while landing');
        }
        currentState.mode = 'MISSION';
        simulation.mission.waypoints.push({
          position: command.params,
          type: 'GOTO'
        });
        return { success: true, message: 'Waypoint added' };
        
      case 'RTL':
        currentState.mode = 'RTL';
        return { success: true, message: 'Return to launch initiated' };
        
      case 'SET_MODE':
        currentState.mode = command.params.mode;
        return { success: true, message: `Mode changed to ${command.params.mode}` };
        
      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }

  // Get simulation telemetry
  async getSimulationTelemetry(simulationId) {
    const simulation = this.simulations.get(simulationId);
    if (!simulation) return null;

    const telemetry = {
      timestamp: Date.now(),
      simulationId,
      droneId: simulation.droneId,
      position: simulation.currentState.position,
      attitude: simulation.currentState.attitude,
      velocity: simulation.currentState.velocity,
      battery: simulation.currentState.battery,
      mode: simulation.currentState.mode,
      armed: simulation.currentState.armed,
      mission: simulation.mission,
      status: simulation.status
    };

    return telemetry;
  }

  // Emit telemetry via socket
  async emitSimulationTelemetry(simulationId) {
    try {
      const telemetry = await this.getSimulationTelemetry(simulationId);
      if (telemetry) {
        coreCommandService.emitTelemetryUpdate(telemetry.droneId, telemetry);
      }
    } catch (error) {
      console.error('Telemetry emission error:', error);
    }
  }

  // Calculate distance between two points
  calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (pos1.lat * Math.PI) / 180;
    const φ2 = (pos2.lat * Math.PI) / 180;
    const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
    const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // Stop simulation
  async stopSimulation(simulationId) {
    try {
      const simulation = this.simulations.get(simulationId);
      if (!simulation) return;

      simulation.status = 'stopped';
      
      // Clear interval
      const interval = this.simulationIntervals.get(simulationId);
      if (interval) {
        clearInterval(interval);
        this.simulationIntervals.delete(simulationId);
      }

      console.log(`🚁 RealEngine simulation stopped: ${simulationId}`);
    } catch (error) {
      console.error('Simulation stop error:', error);
    }
  }

  // Get all simulations
  getAllSimulations() {
    return Array.from(this.simulations.values());
  }

  // Get simulation by ID
  getSimulation(simulationId) {
    return this.simulations.get(simulationId);
  }

  // Cleanup resources
  cleanup() {
    // Stop all simulations
    for (const simulationId of this.simulations.keys()) {
      this.stopSimulation(simulationId);
    }
    
    // Clear all data
    this.simulations.clear();
    this.environments.clear();
    this.telemetryData.clear();
    this.simulationIntervals.clear();
    
    this.isRunning = false;
  }
}

export const realEngineService = new RealEngineService();
export default realEngineService;
