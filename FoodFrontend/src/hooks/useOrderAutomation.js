import { useEffect, useCallback, useRef } from 'react';
import droneAutomationService from '../services/droneAutomationService';

// Hook for integrating order automation with the existing order system
// This hook automatically triggers drone automation when orders are placed
export const useOrderAutomation = () => {
  const automationEnabled = useRef(true);
  const activeOrders = useRef(new Set());

  // Initialize automation service
  useEffect(() => {
    console.log('🚀 Initializing order automation hook');
    
    // Listen for order placement events
    const handleOrderPlacement = (event) => {
      const { orderData } = event.detail;
      if (orderData && automationEnabled.current) {
        handleNewOrder(orderData);
      }
    };

    // Listen for seller preparation events
    const handleSellerPreparation = (event) => {
      const { orderId, shopId } = event.detail;
      if (orderId && shopId && automationEnabled.current) {
        handleFoodReady(orderId, shopId);
      }
    };

    // Listen for pickup completion events
    const handlePickupComplete = (event) => {
      const { orderId, droneId } = event.detail;
      if (orderId && droneId && automationEnabled.current) {
        handlePickupDone(orderId, droneId);
      }
    };

    // Listen for QR verification events
    const handleQRVerification = (event) => {
      const { orderId, qrCode } = event.detail;
      if (orderId && qrCode && automationEnabled.current) {
        handleQRVerified(orderId, qrCode);
      }
    };

    // Add event listeners
    window.addEventListener('order:placed', handleOrderPlacement);
    window.addEventListener('seller:food-ready', handleSellerPreparation);
    window.addEventListener('drone:pickup-complete', handlePickupComplete);
    window.addEventListener('delivery:qr-verified', handleQRVerification);

    // Cleanup
    return () => {
      window.removeEventListener('order:placed', handleOrderPlacement);
      window.removeEventListener('seller:food-ready', handleSellerPreparation);
      window.removeEventListener('drone:pickup-complete', handlePickupComplete);
      window.removeEventListener('delivery:qr-verified', handleQRVerification);
    };
  }, []);

  // Handle new order placement
  const handleNewOrder = useCallback(async (orderData) => {
    try {
      console.log('🛒 New order detected, initiating automation:', orderData.orderId);
      
      // Check if order is for drone delivery
      if (orderData.deliveryType === 'drone') {
        // Add to active orders
        activeOrders.current.add(orderData.orderId);
        
        // Trigger automation
        await droneAutomationService.handleOrderPlacement(orderData);
        
        console.log('✅ Order automation initiated successfully');
      } else {
        console.log('ℹ️ Order is not for drone delivery, skipping automation');
      }
    } catch (error) {
      console.error('❌ Failed to handle new order:', error);
    }
  }, []);

  // Handle seller marking food as ready
  const handleFoodReady = useCallback(async (orderId, shopId) => {
    try {
      console.log('🍽️ Food ready event detected for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        // Trigger seller preparation automation
        await droneAutomationService.handleSellerPreparation(orderId, shopId);
        
        console.log('✅ Seller preparation automation completed');
      } else {
        console.log('⚠️ Order not found in active orders:', orderId);
      }
    } catch (error) {
      console.error('❌ Failed to handle food ready:', error);
    }
  }, []);

  // Handle pickup completion
  const handlePickupDone = useCallback(async (orderId, droneId) => {
    try {
      console.log('📦 Pickup complete event detected for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        // Trigger pickup completion automation
        await droneAutomationService.handlePickupComplete(orderId, droneId);
        
        console.log('✅ Pickup completion automation completed');
      } else {
        console.log('⚠️ Order not found in active orders:', orderId);
      }
    } catch (error) {
      console.error('❌ Failed to handle pickup completion:', error);
    }
  }, []);

  // Handle QR verification
  const handleQRVerified = useCallback(async (orderId, qrCode) => {
    try {
      console.log('🔐 QR verification event detected for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        // Trigger QR verification automation
        await droneAutomationService.handleQRVerification(orderId, qrCode);
        
        // Remove from active orders after completion
        activeOrders.current.delete(orderId);
        
        console.log('✅ QR verification automation completed');
      } else {
        console.log('⚠️ Order not found in active orders:', orderId);
      }
    } catch (error) {
      console.error('❌ Failed to handle QR verification:', error);
    }
  }, []);

  // Manual order automation trigger (for testing integration)
  const triggerOrderAutomation = useCallback(async (orderData) => {
    try {
      console.log('🔧 Manually triggering order automation for:', orderData.orderId);
      
      if (orderData.deliveryType === 'drone') {
        activeOrders.current.add(orderData.orderId);
        await droneAutomationService.handleOrderPlacement(orderData);
        return true;
      } else {
        console.log('ℹ️ Order is not for drone delivery');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual automation trigger failed:', error);
      return false;
    }
  }, []);

  // Manual seller preparation trigger
  const triggerSellerPreparation = useCallback(async (orderId, shopId) => {
    try {
      console.log('🔧 Manually triggering seller preparation for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        await droneAutomationService.handleSellerPreparation(orderId, shopId);
        return true;
      } else {
        console.log('⚠️ Order not found in active orders');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual seller preparation trigger failed:', error);
      return false;
    }
  }, []);

  // Manual pickup completion trigger
  const triggerPickupComplete = useCallback(async (orderId, droneId) => {
    try {
      console.log('🔧 Manually triggering pickup completion for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        await droneAutomationService.handlePickupComplete(orderId, droneId);
        return true;
      } else {
        console.log('⚠️ Order not found in active orders');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual pickup completion trigger failed:', error);
      return false;
    }
  }, []);

  // Manual QR verification trigger
  const triggerQRVerification = useCallback(async (orderId, qrCode) => {
    try {
      console.log('🔧 Manually triggering QR verification for order:', orderId);
      
      if (activeOrders.current.has(orderId)) {
        await droneAutomationService.handleQRVerification(orderId, qrCode);
        return true;
      } else {
        console.log('⚠️ Order not found in active orders');
        return false;
      }
    } catch (error) {
      console.error('❌ Manual QR verification trigger failed:', error);
      return false;
    }
  }, []);

  // Control automation
  const enableAutomation = useCallback(() => {
    automationEnabled.current = true;
    droneAutomationService.setAutomationEnabled(true);
    console.log('✅ Order automation enabled');
  }, []);

  const disableAutomation = useCallback(() => {
    automationEnabled.current = false;
    droneAutomationService.setAutomationEnabled(false);
    console.log('⏸️ Order automation disabled');
  }, []);

  // Emergency functions
  const emergencyStop = useCallback(async () => {
    try {
      console.log('🚨 Emergency stop triggered');
      await droneAutomationService.emergencyStopAllDeliveries();
      disableAutomation();
    } catch (error) {
      console.error('❌ Emergency stop failed:', error);
    }
  }, [disableAutomation]);

  const resumeAutomation = useCallback(async () => {
    try {
      console.log('🔄 Resuming automation');
      await droneAutomationService.resumeAutomation();
      enableAutomation();
    } catch (error) {
      console.error('❌ Resume automation failed:', error);
    }
  }, [enableAutomation]);

  // Get automation status
  const getAutomationStatus = useCallback(() => ({
    enabled: automationEnabled.current,
    activeOrders: Array.from(activeOrders.current),
    activeDeliveries: droneAutomationService.getAllActiveDeliveries()
  }), []);

  // Get delivery status for specific order
  const getDeliveryStatus = useCallback((orderId) => {
    return droneAutomationService.getDeliveryStatus(orderId);
  }, []);

  return {
    // Automation control
    enableAutomation,
    disableAutomation,
    emergencyStop,
    resumeAutomation,
    
    // Manual triggers (for testing integration)
    triggerOrderAutomation,
    triggerSellerPreparation,
    triggerPickupComplete,
    triggerQRVerification,
    
    // Status queries
    getAutomationStatus,
    getDeliveryStatus,
    
    // Current state
    isAutomationEnabled: automationEnabled.current,
    activeOrdersCount: activeOrders.current.size
  };
};

export default useOrderAutomation;
