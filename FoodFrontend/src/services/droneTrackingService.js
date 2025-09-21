import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/config';

class DroneTrackingService {
  constructor() {
    this.socket = null;
    this.dronePositions = new Map(); // droneId -> position data
    this.flightPaths = new Map(); // droneId -> array of waypoints
    this.telemetryData = new Map(); // droneId -> telemetry data
    this.videoStreams = new Map(); // droneId -> video stream
    this.missions = new Map(); // droneId -> mission data
    this.listeners = new Map(); // event -> callback array
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize connection to drone bridge
  async connect() {
    try {
      this.socket = io(`${API_BASE_URL}/browser`, {
        transports: ['websocket'],
        auth: {
          token: this.getAuthToken()
        }
      });

      this.setupSocketListeners();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      console.log('🚁 Drone Tracking Service connected');
      this.emit('tracking:connected');
      
    } catch (error) {
      console.error('Failed to connect to drone tracking service:', error);
      this.handleReconnection();
    }
  }

  // Setup socket event listeners
  setupSocketListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔗 Connected to drone tracking service');
      this.isConnected = true;
      this.emit('tracking:connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from drone tracking service');
      this.isConnected = false;
      this.emit('tracking:disconnected');
      this.handleReconnection();
    });

    // Real-time GPS position updates
    this.socket.on('drone:position', (data) => {
      this.updateDronePosition(data);
    });

    // Flight path updates
    this.socket.on('drone:path', (data) => {
      this.updateFlightPath(data);
    });

    // Telemetry data updates
    this.socket.on('drone:telemetry', (data) => {
      this.updateTelemetry(data);
    });

    // Mission updates
    this.socket.on('drone:mission', (data) => {
      this.updateMission(data);
    });

    // Video stream updates
    this.socket.on('drone:video', (data) => {
      this.updateVideoStream(data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Drone tracking error:', error);
      this.emit('tracking:error', error);
    });
  }

  // Handle reconnection attempts
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('tracking:max_reconnect_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Update drone position in real-time
  updateDronePosition(data) {
    const { droneId, latitude, longitude, altitude, heading, speed, timestamp } = data;
    
    this.dronePositions.set(droneId, {
      latitude,
      longitude,
      altitude,
      heading,
      speed,
      timestamp: new Date(timestamp)
    });

    // Add to flight path for visualization
    this.addToFlightPath(droneId, { latitude, longitude, altitude, timestamp });
    
    this.emit('drone:position_updated', { droneId, position: data });
  }

  // Add position to flight path for visualization
  addToFlightPath(droneId, position) {
    if (!this.flightPaths.has(droneId)) {
      this.flightPaths.set(droneId, []);
    }
    
    const path = this.flightPaths.get(droneId);
    path.push(position);
    
    // Keep only last 1000 points to prevent memory issues
    if (path.length > 1000) {
      path.shift();
    }
    
    this.flightPaths.set(droneId, path);
  }

  // Update flight path data
  updateFlightPath(data) {
    const { droneId, waypoints, pathType } = data;
    
    this.flightPaths.set(droneId, {
      waypoints: waypoints || [],
      pathType: pathType || 'planned', // planned, actual, optimized
      timestamp: new Date()
    });
    
    this.emit('drone:path_updated', { droneId, path: data });
  }

  // Update telemetry data
  updateTelemetry(data) {
    const { droneId, battery, altitude, speed, heading, status, mode, signal } = data;
    
    this.telemetryData.set(droneId, {
      battery: battery || 0,
      altitude: altitude || 0,
      speed: speed || 0,
      heading: heading || 0,
      status: status || 'unknown',
      mode: mode || 'manual',
      signal: signal || 0,
      timestamp: new Date()
    });
    
    this.emit('drone:telemetry_updated', { droneId, telemetry: data });
  }

  // Update mission data
  updateMission(data) {
    const { droneId, missionId, waypoints, status, progress } = data;
    
    this.missions.set(droneId, {
      missionId,
      waypoints: waypoints || [],
      status: status || 'idle', // idle, active, paused, completed, failed
      progress: progress || 0,
      timestamp: new Date()
    });
    
    this.emit('drone:mission_updated', { droneId, mission: data });
  }

  // Update video stream
  updateVideoStream(data) {
    const { droneId, streamUrl, quality, isActive } = data;
    
    this.videoStreams.set(droneId, {
      streamUrl,
      quality: quality || '720p',
      isActive: isActive || false,
      timestamp: new Date()
    });
    
    this.emit('drone:video_updated', { droneId, video: data });
  }

  // Get current drone position
  getDronePosition(droneId) {
    return this.dronePositions.get(droneId) || null;
  }

  // Get all drone positions
  getAllDronePositions() {
    return Object.fromEntries(this.dronePositions);
  }

  // Get flight path for a drone
  getFlightPath(droneId) {
    return this.flightPaths.get(droneId) || null;
  }

  // Get telemetry data for a drone
  getTelemetry(droneId) {
    return this.telemetryData.get(droneId) || null;
  }

  // Get mission data for a drone
  getMission(droneId) {
    return this.missions.get(droneId) || null;
  }

  // Get video stream for a drone
  getVideoStream(droneId) {
    return this.videoStreams.get(droneId) || null;
  }

  // Mission Planning Functions
  async createMission(droneId, waypoints, missionType = 'delivery') {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          waypoints,
          missionType,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to create mission');
      
      const mission = await response.json();
      this.missions.set(droneId, mission);
      this.emit('mission:created', { droneId, mission });
      
      return mission;
    } catch (error) {
      console.error('Failed to create mission:', error);
      throw error;
    }
  }

  async updateMission(droneId, missionId, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update mission');
      
      const mission = await response.json();
      this.missions.set(droneId, mission);
      this.emit('mission:updated', { droneId, mission });
      
      return mission;
    } catch (error) {
      console.error('Failed to update mission:', error);
      throw error;
    }
  }

  async startMission(droneId, missionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to start mission');
      
      this.emit('mission:started', { droneId, missionId });
      return true;
    } catch (error) {
      console.error('Failed to start mission:', error);
      throw error;
    }
  }

  async pauseMission(droneId, missionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to pause mission');
      
      this.emit('mission:paused', { droneId, missionId });
      return true;
    } catch (error) {
      console.error('Failed to pause mission:', error);
      throw error;
    }
  }

  async resumeMission(droneId, missionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to resume mission');
      
      this.emit('mission:resumed', { droneId, missionId });
      return true;
    } catch (error) {
      console.error('Failed to resume mission:', error);
      throw error;
    }
  }

  async cancelMission(droneId, missionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to cancel mission');
      
      this.emit('mission:cancelled', { droneId, missionId });
      return true;
    } catch (error) {
      console.error('Failed to cancel mission:', error);
      throw error;
    }
  }

  // Waypoint management
  async addWaypoint(droneId, missionId, waypoint) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/waypoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(waypoint)
      });

      if (!response.ok) throw new Error('Failed to add waypoint');
      
      const updatedMission = await response.json();
      this.missions.set(droneId, updatedMission);
      this.emit('waypoint:added', { droneId, missionId, waypoint });
      
      return updatedMission;
    } catch (error) {
      console.error('Failed to add waypoint:', error);
      throw error;
    }
  }

  async updateWaypoint(droneId, missionId, waypointId, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/waypoints/${waypointId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update waypoint');
      
      const updatedMission = await response.json();
      this.missions.set(droneId, updatedMission);
      this.emit('waypoint:updated', { droneId, missionId, waypointId, updates });
      
      return updatedMission;
    } catch (error) {
      console.error('Failed to update waypoint:', error);
      throw error;
    }
  }

  async deleteWaypoint(droneId, missionId, waypointId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/drones/${droneId}/mission/${missionId}/waypoints/${waypointId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete waypoint');
      
      const updatedMission = await response.json();
      this.missions.set(droneId, updatedMission);
      this.emit('waypoint:deleted', { droneId, missionId, waypointId });
      
      return updatedMission;
    } catch (error) {
      console.error('Failed to delete waypoint:', error);
      throw error;
    }
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility functions
  getAuthToken() {
    // Get token from cookies or localStorage
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('accessToken='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  }

  // Calculate distance between two coordinates
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Calculate bearing between two coordinates
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.deg2rad(lon2 - lon1);
    const lat1Rad = this.deg2rad(lat1);
    const lat2Rad = this.deg2rad(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    let bearing = Math.atan2(y, x);
    bearing = this.rad2deg(bearing);
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }

  rad2deg(rad) {
    return rad * (180/Math.PI);
  }

  // Disconnect and cleanup
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.dronePositions.clear();
    this.flightPaths.clear();
    this.telemetryData.clear();
    this.videoStreams.clear();
    this.missions.clear();
    this.listeners.clear();
    
    console.log('🚁 Drone Tracking Service disconnected');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const droneTrackingService = new DroneTrackingService();

export default droneTrackingService;
