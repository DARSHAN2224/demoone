import { Drone } from '../../models/droneModel.js';

class CoreCommandService {
  constructor() {
    this.activeCommands = new Map();
    this.commandQueue = [];
    this.commandHistory = [];
    this.maxRetries = 3;
    this.commandTimeout = 30000; // 30 seconds
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
   * Generate unique command ID
   * @returns {string} Command ID
   */
  generateCommandId() {
    return `CMD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add command to queue
   * @param {Object} command - Command to queue
   * @returns {Object} Queued command
   */
  queueCommand(command) {
    const queuedCommand = {
      ...command,
      id: this.generateCommandId(),
      timestamp: Date.now(),
      status: 'queued',
      retries: 0
    };

    this.commandQueue.push(queuedCommand);
    this.activeCommands.set(queuedCommand.id, queuedCommand);

    return queuedCommand;
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

  // Placeholder methods for command execution
  // These will be implemented by specialized services
  async executeTakeoff(command) { throw new Error('Takeoff not implemented'); }
  async executeLand(command) { throw new Error('Land not implemented'); }
  async executeGoto(command) { throw new Error('Goto not implemented'); }
  async executeReturnToBase(command) { throw new Error('Return to base not implemented'); }
  async executeHover(command) { throw new Error('Hover not implemented'); }
  async executeEmergencyLand(command) { throw new Error('Emergency land not implemented'); }
  async executeUpdateFlightPlan(command) { throw new Error('Update flight plan not implemented'); }
  async executeScanQRCode(command) { throw new Error('Scan QR code not implemented'); }
  async executeDeliverPackage(command) { throw new Error('Deliver package not implemented'); }
  async executeMonitorWeather(command) { throw new Error('Monitor weather not implemented'); }
}

export const coreCommandService = new CoreCommandService();
export default coreCommandService;
