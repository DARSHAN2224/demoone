import { io } from 'socket.io-client';

class ParcelTrackingService {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    connect() {
        if (this.socket && this.isConnected) {
            return;
        }

        const serverUrl = process.env.REACT_APP_WS_URL || 'http://localhost:8000';
        
        this.socket = io(`${serverUrl}/browser`, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            forceNew: true
        });

        this.socket.on('connect', () => {
            console.log('📦 Parcel tracking connected to WebSocket');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('📦 Parcel tracking disconnected:', reason);
            this.isConnected = false;
            this.emit('disconnected', reason);
            
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                return;
            }
            
            this.handleReconnect();
        });

        this.socket.on('connect_error', (error) => {
            console.error('📦 Parcel tracking connection error:', error);
            this.emit('error', error);
            this.handleReconnect();
        });

        // Parcel-specific events
        this.socket.on('parcel:status_updated', (data) => {
            console.log('📦 Parcel status updated:', data);
            this.emit('status_updated', data);
        });

        this.socket.on('parcel:telemetry_update', (data) => {
            console.log('📦 Parcel telemetry updated:', data);
            this.emit('telemetry_update', data);
        });

        this.socket.on('parcel:instructions_updated', (data) => {
            console.log('📦 Parcel instructions updated:', data);
            this.emit('instructions_updated', data);
        });

        this.socket.on('parcel:cancelled', (data) => {
            console.log('📦 Parcel cancelled:', data);
            this.emit('cancelled', data);
        });

        this.socket.on('parcel:status_force_updated', (data) => {
            console.log('📦 Parcel status force updated:', data);
            this.emit('status_force_updated', data);
        });
    }

    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('📦 Max reconnection attempts reached');
            this.emit('max_reconnect_attempts_reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`📦 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.listeners.clear();
        }
    }

    // Subscribe to parcel updates
    subscribeToParcel(orderId, callback) {
        if (!this.socket || !this.isConnected) {
            this.connect();
        }

        this.socket.emit('join_parcel_room', orderId);
        
        const listener = (data) => {
            if (data.orderId === orderId) {
                callback(data);
            }
        };

        this.on('status_updated', listener);
        this.on('telemetry_update', listener);
        this.on('instructions_updated', listener);
        this.on('cancelled', listener);
        this.on('status_force_updated', listener);

        return () => {
            this.socket.emit('leave_parcel_room', orderId);
            this.off('status_updated', listener);
            this.off('telemetry_update', listener);
            this.off('instructions_updated', listener);
            this.off('cancelled', listener);
            this.off('status_force_updated', listener);
        };
    }

    // Subscribe to all parcels for a user
    subscribeToUserParcels(userId, callback) {
        if (!this.socket || !this.isConnected) {
            this.connect();
        }

        this.socket.emit('join_user_parcels', userId);
        
        const listener = (data) => {
            callback(data);
        };

        this.on('status_updated', listener);
        this.on('telemetry_update', listener);
        this.on('instructions_updated', listener);
        this.on('cancelled', listener);
        this.on('status_force_updated', listener);

        return () => {
            this.socket.emit('leave_user_parcels', userId);
            this.off('status_updated', listener);
            this.off('telemetry_update', listener);
            this.off('instructions_updated', listener);
            this.off('cancelled', listener);
            this.off('status_force_updated', listener);
        };
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
                    console.error('📦 Error in parcel tracking listener:', error);
                }
            });
        }
    }

    // API methods
    async updateInstructions(orderId, instructions) {
        try {
            const response = await fetch(`/api/v1/parcel-tracking/user/update-instructions/${orderId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ instructions })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('📦 Error updating instructions:', error);
            throw error;
        }
    }

    async cancelParcel(orderId, reason) {
        try {
            const response = await fetch(`/api/v1/parcel-tracking/user/cancel/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ reason })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('📦 Error cancelling parcel:', error);
            throw error;
        }
    }

    async getParcelDetails(orderId) {
        try {
            const response = await fetch(`/api/v1/parcel-tracking/user/track/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('📦 Error getting parcel details:', error);
            throw error;
        }
    }

    // Utility methods
    isOnline() {
        return this.isConnected;
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts
        };
    }
}

// Create singleton instance
const parcelTrackingService = new ParcelTrackingService();

export default parcelTrackingService;
