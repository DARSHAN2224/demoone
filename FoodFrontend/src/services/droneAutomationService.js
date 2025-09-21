import { api } from '../stores/api';

// Production Drone Automation Service
// This service handles automatic drone operations for real customer orders
// It operates independently from the testing interfaces

class DroneAutomationService {
  constructor() {
    this.isAutomationEnabled = true;
    this.activeDeliveries = new Map(); // Track active deliveries
    this.deliveryStatusCallbacks = new Map(); // Callbacks for status updates
  }

  // Enable/Disable automation (for emergency situations)
  setAutomationEnabled(enabled) {
    this.isAutomationEnabled = enabled;
    console.log(`🚁 Drone automation ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ===== ORDER PLACEMENT TRIGGER =====
  // Called automatically when a user places a drone delivery order
  async handleOrderPlacement(orderData) {
    if (!this.isAutomationEnabled) {
      console.log('⚠️ Automation disabled, skipping order placement handling');
      return;
    }

    try {
      console.log('🚀 Order placement detected, initiating drone delivery automation:', orderData.orderId);
      
      // 1. Create delivery record
      const delivery = await this.createDeliveryRecord(orderData);
      
      // 2. Notify seller about the order
      await this.notifySeller(orderData.shopId, orderData.orderId);
      
      // 3. Initialize delivery tracking
      this.initializeDeliveryTracking(orderData.orderId, delivery);
      
      console.log('✅ Order placement automation completed for:', orderData.orderId);
      
      return delivery;
    } catch (error) {
      console.error('❌ Order placement automation failed:', error);
      throw error;
    }
  }

  // ===== SELLER PREPARATION HOOK =====
  // Called when seller marks food as ready
  async handleSellerPreparation(orderId, shopId) {
    if (!this.isAutomationEnabled) {
      console.log('⚠️ Automation disabled, skipping seller preparation handling');
      return;
    }

    try {
      console.log('🍽️ Seller preparation detected, initiating drone dispatch for order:', orderId);
      
      // 1. Update order status
      await this.updateOrderStatus(orderId, 'ready_for_delivery');
      
      // 2. Find nearest available drone
      const assignedDrone = await this.findAndAssignNearestDrone(orderId, shopId);
      
      // 3. Send drone to restaurant for pickup
      await this.dispatchDroneToRestaurant(assignedDrone.droneId, orderId, shopId);
      
      // 4. Start real-time tracking
      this.startRealTimeTracking(orderId, assignedDrone.droneId);
      
      console.log('✅ Seller preparation automation completed for order:', orderId);
      
      return assignedDrone;
    } catch (error) {
      console.error('❌ Seller preparation automation failed:', error);
      throw error;
    }
  }

  // ===== AUTOMATIC DRONE ASSIGNMENT =====
  async findAndAssignNearestDrone(orderId, shopId) {
    try {
      console.log('🔍 Finding nearest available drone for order:', orderId);
      
      // Get shop location
      const shopLocation = await this.getShopLocation(shopId);
      
      // Find available drones near the shop
      const response = await api.get('/drone/available', {
        params: {
          latitude: shopLocation.lat,
          longitude: shopLocation.lng,
          maxDistance: 5000 // 5km radius
        }
      });
      
      if (!response.data.success || response.data.data.length === 0) {
        throw new Error('No available drones found near the shop');
      }
      
      // Assign the nearest drone
      const nearestDrone = response.data.data[0];
      await this.assignDroneToOrder(nearestDrone.droneId, orderId);
      
      console.log('✅ Drone assigned:', nearestDrone.droneId, 'to order:', orderId);
      
      return nearestDrone;
    } catch (error) {
      console.error('❌ Drone assignment failed:', error);
      throw error;
    }
  }

  // ===== DRONE DISPATCH TO RESTAURANT =====
  async dispatchDroneToRestaurant(droneId, orderId, shopId) {
    try {
      console.log('🚁 Dispatching drone', droneId, 'to restaurant for order:', orderId);
      
      // 1. Send takeoff command
      await api.post(`/drone/launch/${droneId}`, {
        orderId,
        destination: 'restaurant',
        shopId
      });
      
      // 2. Update delivery status
      await this.updateDeliveryStatus(orderId, 'drone_en_route_to_restaurant');
      
      // 3. Start route tracking
      this.startRouteTracking(orderId, droneId, 'restaurant');
      
      console.log('✅ Drone dispatched to restaurant successfully');
      
    } catch (error) {
      console.error('❌ Drone dispatch failed:', error);
      throw error;
    }
  }

  // ===== PICKUP & FLIGHT TO CUSTOMER =====
  async handlePickupComplete(orderId, droneId) {
    try {
      console.log('📦 Pickup completed, drone', droneId, 'flying to customer for order:', orderId);
      
      // 1. Update delivery status
      await this.updateDeliveryStatus(orderId, 'out_for_delivery');
      
      // 2. Get customer location
      const customerLocation = await this.getCustomerLocation(orderId);
      
      // 3. Send drone to customer
      await api.post(`/drone/navigate/${droneId}`, {
        orderId,
        destination: 'customer',
        coordinates: customerLocation
      });
      
      // 4. Generate QR code for delivery verification
      const qrCode = await this.generateDeliveryQRCode(orderId);
      
      // 5. Notify customer about incoming delivery
      await this.notifyCustomer(orderId, qrCode);
      
      // 6. Start customer route tracking
      this.startRouteTracking(orderId, droneId, 'customer');
      
      console.log('✅ Pickup automation completed, drone en route to customer');
      
      return qrCode;
    } catch (error) {
      console.error('❌ Pickup automation failed:', error);
      throw error;
    }
  }

  // ===== QR CODE VERIFICATION =====
  async handleQRVerification(orderId, qrCode) {
    try {
      console.log('🔐 QR verification initiated for order:', orderId);
      
      // 1. Verify QR code
      const verification = await api.post('/delivery/verify-qr', {
        orderId,
        qrCode
      });
      
      if (!verification.data.success) {
        throw new Error('QR verification failed');
      }
      
      // 2. Complete delivery
      await this.completeDelivery(orderId);
      
      // 3. Release package
      await this.releasePackage(orderId);
      
      // 4. Send drone back to home base
      await this.returnDroneToHome(orderId);
      
      console.log('✅ QR verification and delivery completion successful');
      
      return verification.data.data;
    } catch (error) {
      console.error('❌ QR verification failed:', error);
      throw error;
    }
  }

  // ===== DELIVERY COMPLETION =====
  async completeDelivery(orderId) {
    try {
      console.log('🎉 Completing delivery for order:', orderId);
      
      // 1. Update order status
      await this.updateOrderStatus(orderId, 'delivered');
      
      // 2. Update delivery status
      await this.updateDeliveryStatus(orderId, 'delivered');
      
      // 3. Record delivery completion time
      await this.recordDeliveryCompletion(orderId);
      
      // 4. Send delivery completion notification
      await this.sendDeliveryCompletionNotification(orderId);
      
      // 5. Clean up tracking
      this.cleanupDeliveryTracking(orderId);
      
      console.log('✅ Delivery completion automation successful');
      
    } catch (error) {
      console.error('❌ Delivery completion failed:', error);
      throw error;
    }
  }

  // ===== REAL-TIME TRACKING =====
  startRealTimeTracking(orderId, droneId) {
    if (this.activeDeliveries.has(orderId)) {
      console.log('⚠️ Tracking already active for order:', orderId);
      return;
    }

    console.log('📍 Starting real-time tracking for order:', orderId);
    
    // Initialize tracking data
    this.activeDeliveries.set(orderId, {
      droneId,
      startTime: new Date(),
      status: 'tracking_active',
      lastUpdate: new Date()
    });

    // Set up periodic location updates
    const trackingInterval = setInterval(async () => {
      try {
        const location = await this.getDroneLocation(droneId);
        await this.updateDeliveryLocation(orderId, location);
        
        // Update tracking data
        const delivery = this.activeDeliveries.get(orderId);
        if (delivery) {
          delivery.lastUpdate = new Date();
          delivery.currentLocation = location;
        }
        
        // Emit tracking update event
        this.emitTrackingUpdate(orderId, location);
        
      } catch (error) {
        console.error('❌ Tracking update failed:', error);
      }
    }, 10000); // Update every 10 seconds

    // Store interval for cleanup
    this.activeDeliveries.get(orderId).trackingInterval = trackingInterval;
  }

  // ===== HELPER FUNCTIONS =====
  async createDeliveryRecord(orderData) {
    const response = await api.post('/delivery', {
      orderId: orderData.orderId,
      shopId: orderData.shopId,
      customerId: orderData.customerId,
      deliveryMode: 'drone',
      status: 'pending'
    });
    
    return response.data.data;
  }

  async updateOrderStatus(orderId, status) {
    await api.put(`/orders/${orderId}/status`, { status });
  }

  async updateDeliveryStatus(orderId, status) {
    await api.put(`/delivery/${orderId}/status`, { status });
  }

  async assignDroneToOrder(droneId, orderId) {
    await api.post(`/drone/assign/${droneId}`, { orderId });
  }

  async getShopLocation(shopId) {
    const response = await api.get(`/shops/${shopId}/location`);
    return response.data.data;
  }

  async getCustomerLocation(orderId) {
    const response = await api.get(`/orders/${orderId}/customer-location`);
    return response.data.data;
  }

  async generateDeliveryQRCode(orderId) {
    const response = await api.post(`/delivery/${orderId}/qr-code`);
    return response.data.data.qrCode;
  }

  async getDroneLocation(droneId) {
    const response = await api.get(`/drone/${droneId}/location`);
    return response.data.data;
  }

  async updateDeliveryLocation(orderId, location) {
    await api.put(`/delivery/${orderId}/location`, location);
  }

  async releasePackage(orderId) {
    await api.post(`/drone/release-package/${orderId}`);
  }

  async returnDroneToHome(orderId) {
    const delivery = this.activeDeliveries.get(orderId);
    if (delivery) {
      await api.post(`/drone/return-home/${delivery.droneId}`);
    }
  }

  async recordDeliveryCompletion(orderId) {
    await api.post(`/delivery/${orderId}/complete`);
  }

  async sendDeliveryCompletionNotification(orderId) {
    await api.post(`/notifications/delivery-complete`, { orderId });
  }

  async notifySeller(shopId, orderId) {
    await api.post(`/notifications/seller/new-order`, { shopId, orderId });
  }

  async notifyCustomer(orderId, qrCode) {
    await api.post(`/notifications/customer/delivery-incoming`, { orderId, qrCode });
  }

  // ===== EVENT EMITTERS =====
  emitTrackingUpdate(orderId, location) {
    // Emit custom event for real-time updates
    const event = new CustomEvent('delivery:tracking-update', {
      detail: { orderId, location, timestamp: new Date() }
    });
    window.dispatchEvent(event);
  }

  // ===== CLEANUP =====
  cleanupDeliveryTracking(orderId) {
    const delivery = this.activeDeliveries.get(orderId);
    if (delivery && delivery.trackingInterval) {
      clearInterval(delivery.trackingInterval);
    }
    this.activeDeliveries.delete(orderId);
    console.log('🧹 Delivery tracking cleaned up for order:', orderId);
  }

  // ===== STATUS QUERIES =====
  getDeliveryStatus(orderId) {
    return this.activeDeliveries.get(orderId);
  }

  getAllActiveDeliveries() {
    return Array.from(this.activeDeliveries.entries());
  }

  // ===== EMERGENCY FUNCTIONS =====
  async emergencyStopAllDeliveries() {
    console.log('🚨 EMERGENCY STOP: Stopping all active deliveries');
    
    for (const [orderId, delivery] of this.activeDeliveries) {
      try {
        await api.post(`/drone/emergency-stop/${delivery.droneId}`);
        console.log('✅ Emergency stop sent to drone:', delivery.droneId);
      } catch (error) {
        console.error('❌ Emergency stop failed for drone:', delivery.droneId, error);
      }
    }
    
    // Disable automation
    this.setAutomationEnabled(false);
  }

  async resumeAutomation() {
    console.log('🔄 Resuming drone automation');
    this.setAutomationEnabled(true);
  }
}

// Create singleton instance
const droneAutomationService = new DroneAutomationService();

export default droneAutomationService;
