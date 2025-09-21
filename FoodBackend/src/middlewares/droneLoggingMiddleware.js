/**
 * Enhanced Drone Logging Middleware
 * Provides comprehensive logging for all drone-related operations
 */
import { getIo } from '../services/socket.js';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Log levels with colors and emojis
const logLevels = {
    INFO: { color: colors.cyan, emoji: 'ℹ️', prefix: 'INFO' },
    SUCCESS: { color: colors.green, emoji: '✅', prefix: 'SUCCESS' },
    WARNING: { color: colors.yellow, emoji: '⚠️', prefix: 'WARNING' },
    ERROR: { color: colors.red, emoji: '❌', prefix: 'ERROR' },
    DRONE: { color: colors.blue, emoji: '🚁', prefix: 'DRONE' },
    BACKEND: { color: colors.magenta, emoji: '🔧', prefix: 'BACKEND' },
    BRIDGE: { color: colors.cyan, emoji: '🌉', prefix: 'BRIDGE' }
};

/**
 * Enhanced logging function with timestamps, colors, and emojis
 */
export function logDrone(message, level = 'INFO', data = null) {
    const timestamp = new Date().toISOString();
    const timeStr = timestamp.substring(11, 23); // HH:MM:SS.mmm
    
    const logConfig = logLevels[level] || logLevels.INFO;
    const coloredMessage = `${logConfig.color}${logConfig.emoji} [${timeStr}] ${logConfig.prefix}: ${message}${colors.reset}`;
    
    console.log(coloredMessage);
    
    if (data) {
        console.log(`${colors.dim}    Data: ${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
}

/**
 * Log drone bridge communication
 */
export function logDroneBridge(operation, droneId, status, data = null) {
    const message = `Drone Bridge ${operation} for ${droneId}: ${status}`;
    logDrone(message, 'BRIDGE', data);
}

/**
 * Log backend operation
 */
export function logBackend(operation, status, data = null) {
    const message = `Backend ${operation}: ${status}`;
    logBackend(message, 'BACKEND', data);
}

/**
 * Log drone operation
 */
export function logDroneOperation(operation, droneId, status, data = null) {
    const message = `Drone ${operation} for ${droneId}: ${status}`;
    logDrone(message, 'DRONE', data);
}

/**
 * Log success with green color
 */
export function logSuccess(message, data = null) {
    logDrone(message, 'SUCCESS', data);
}

/**
 * Log error with red color
 */
export function logError(message, error = null) {
    logDrone(message, 'ERROR', error);
}

/**
 * Log warning with yellow color
 */
export function logWarning(message, data = null) {
    logDrone(message, 'WARNING', data);
}

/**
 * Log info with cyan color
 */
export function logInfo(message, data = null) {
    logDrone(message, 'INFO', data);
}

/**
 * Middleware to log all drone-related requests
 */
export function droneRequestLogger(req, res, next) {
    const startTime = Date.now();
    const { method, url, params, body, query } = req;
    
    // Extract drone ID from params or body
    const droneId = params.droneId || params.orderId || body.droneId || 'UNKNOWN';
    
    logInfo(`Incoming ${method} request to ${url}`, {
        droneId,
        params,
        query,
        body: body ? Object.keys(body) : null
    });
    
    // Override res.json to log responses
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        
        if (status >= 200 && status < 300) {
            logSuccess(`Response ${status} for ${method} ${url} (${duration}ms)`, {
                droneId,
                success: data.success,
                message: data.message
            });
        } else if (status >= 400 && status < 500) {
            logWarning(`Client Error ${status} for ${method} ${url} (${duration}ms)`, {
                droneId,
                error: data.message
            });
        } else if (status >= 500) {
            logError(`Server Error ${status} for ${method} ${url} (${duration}ms)`, {
                droneId,
                error: data.message
            });
        }
        
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * Middleware to log drone bridge communication
 */
export function droneBridgeLogger(req, res, next) {
    const { method, url, params, body } = req;
    const droneId = params.droneId || params.orderId || body.droneId || 'UNKNOWN';
    
    // Log the request
    logDroneBridge('Request', droneId, `${method} ${url}`, {
        params,
        body: body ? Object.keys(body) : null
    });
    
    // Override res.json to log drone bridge responses
    const originalJson = res.json;
    res.json = function(data) {
        const status = res.statusCode;
        const success = status >= 200 && status < 300;
        
        logDroneBridge('Response', droneId, success ? 'SUCCESS' : 'FAILED', {
            status,
            success: data.success,
            message: data.message
        });
        
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * Log database operations
 */
export function logDatabase(operation, collection, status, data = null) {
    const message = `Database ${operation} on ${collection}: ${status}`;
    logDrone(message, 'INFO', data);
}

/**
 * Log Socket.IO events
 */
export function logSocketIO(event, room, data = null) {
    const message = `Socket.IO ${event} to room ${room}`;
    logDrone(message, 'INFO', data);
}

/**
 * Log external API calls
 */
export function logExternalAPI(api, endpoint, status, data = null) {
    const message = `External API ${api} ${endpoint}: ${status}`;
    logDrone(message, 'INFO', data);
}

/**
 * Create a logger for specific operations
 */
export function createOperationLogger(operation) {
    return {
        start: (droneId, data = null) => {
            logInfo(`${operation} started for ${droneId}`, data);
        },
        success: (droneId, data = null) => {
            logSuccess(`${operation} completed for ${droneId}`, data);
        },
        error: (droneId, error = null) => {
            logError(`${operation} failed for ${droneId}`, error);
        },
        warning: (droneId, data = null) => {
            logWarning(`${operation} warning for ${droneId}`, data);
        }
    };
}

export default {
    logDrone,
    logDroneBridge,
    logBackend,
    logDroneOperation,
    logSuccess,
    logError,
    logWarning,
    logInfo,
    droneRequestLogger,
    droneBridgeLogger,
    logDatabase,
    logSocketIO,
    logExternalAPI,
    createOperationLogger
};
