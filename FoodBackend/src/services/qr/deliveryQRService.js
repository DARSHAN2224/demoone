import { coreQRService } from './coreQRService.js';
import { DroneOrder } from '../../models/droneOrderModel.js';
import Order from '../../models/ordersModel.js';

class DeliveryQRService {
  constructor() {
    this.coreService = coreQRService;
  }

  /**
   * Generate QR code for delivery verification
   * @param {Object} deliveryData - Delivery information
   * @returns {Object} QR code data and image
   */
  async generateDeliveryQR(deliveryData) {
    try {
      // Create delivery token with expiry
      const deliveryToken = this.coreService.createToken({
        orderId: deliveryData.orderId,
        droneId: deliveryData.droneId,
        deliveryLocation: deliveryData.deliveryLocation,
        recipientPhone: deliveryData.recipientPhone,
        timestamp: Date.now(),
        type: 'delivery_verification'
      });

      // Generate unique delivery code
      const deliveryCode = this.coreService.generateDeliveryCode(deliveryData.orderId);
      
      // Create QR code data
      const qrData = {
        token: deliveryToken,
        code: deliveryCode,
        orderId: deliveryData.orderId,
        droneId: deliveryData.droneId,
        timestamp: Date.now(),
        expiry: this.coreService.generateExpiry(30)
      };

      // Generate QR code image
      const qrResult = await this.coreService.generateQRCode(qrData);

      // Store QR code data in database
      await this.storeQRCodeData(qrData, deliveryData);

      return {
        success: true,
        qrCode: qrResult.qrCode,
        deliveryCode: deliveryCode,
        token: deliveryToken,
        expiry: qrData.expiry,
        data: qrData
      };
    } catch (error) {
      console.error('Error generating delivery QR code:', error);
      throw new Error('Failed to generate delivery QR code');
    }
  }

  /**
   * Verify QR code for delivery completion
   * @param {string} qrData - QR code data or token
   * @param {Object} verificationData - Verification details
   * @returns {Object} Verification result
   */
  async verifyDeliveryQR(qrData, verificationData) {
    try {
      let decodedData;
      
      // Parse QR data if it's a string
      if (typeof qrData === 'string') {
        try {
          decodedData = this.coreService.parseQRData(qrData);
        } catch (parseError) {
          // Try to decode as JWT token
          decodedData = this.coreService.verifyToken(qrData);
        }
      } else {
        decodedData = qrData;
      }

      // Validate token expiry
      if (this.coreService.isExpired(decodedData)) {
        throw new Error('QR code has expired');
      }

      // Verify delivery data
      const verificationResult = await this.validateDeliveryData(decodedData, verificationData);
      
      if (verificationResult.success) {
        // Update delivery status
        await this.updateDeliveryStatus(decodedData.orderId, 'delivered');
        
        // Log delivery completion
        await this.logDeliveryCompletion(decodedData, verificationData);
      }

      return verificationResult;
    } catch (error) {
      console.error('Error verifying delivery QR code:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Store QR code data in database
   * @param {Object} qrData - QR code data
   * @param {Object} deliveryData - Delivery information
   */
  async storeQRCodeData(qrData, deliveryData) {
    try {
      // Update drone order with QR code data
      await DroneOrder.findOneAndUpdate(
        { orderId: deliveryData.orderId },
        {
          qrCodeData: qrData,
          qrGeneratedAt: new Date(),
          qrExpiry: new Date(qrData.expiry)
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error storing QR code data:', error);
    }
  }

  /**
   * Validate delivery data
   * @param {Object} qrData - QR code data
   * @param {Object} verificationData - Verification details
   * @returns {Object} Validation result
   */
  async validateDeliveryData(qrData, verificationData) {
    try {
      // Check if order exists and is assigned to drone
      const droneOrder = await DroneOrder.findOne({
        orderId: qrData.orderId,
        droneId: qrData.droneId,
        status: { $in: ['in_transit', 'approaching_destination'] }
      });

      if (!droneOrder) {
        return {
          success: false,
          error: 'Invalid delivery order or drone assignment',
          code: 'INVALID_ORDER'
        };
      }

      // Verify delivery location (with tolerance)
      const locationVerified = this.verifyDeliveryLocation(
        qrData.deliveryLocation,
        verificationData.currentLocation
      );

      if (!locationVerified) {
        return {
          success: false,
          error: 'Delivery location mismatch',
          code: 'LOCATION_MISMATCH'
        };
      }

      // Verify recipient phone number
      if (verificationData.recipientPhone !== qrData.recipientPhone) {
        return {
          success: false,
          error: 'Recipient phone number mismatch',
          code: 'PHONE_MISMATCH'
        };
      }

      return {
        success: true,
        message: 'Delivery verification successful',
        orderId: qrData.orderId,
        droneId: qrData.droneId,
        deliveryLocation: qrData.deliveryLocation,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error validating delivery data:', error);
      return {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Verify delivery location with tolerance
   * @param {Object} expectedLocation - Expected delivery coordinates
   * @param {Object} currentLocation - Current location coordinates
   * @returns {boolean} Location verification result
   */
  verifyDeliveryLocation(expectedLocation, currentLocation) {
    try {
      const tolerance = 50; // 50 meters tolerance
      
      // Calculate distance between coordinates
      const distance = this.calculateDistance(
        expectedLocation.lat,
        expectedLocation.lng,
        currentLocation.lat,
        currentLocation.lng
      );

      return distance <= tolerance;
    } catch (error) {
      console.error('Error verifying delivery location:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
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
   * Update delivery status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   */
  async updateDeliveryStatus(orderId, status) {
    try {
      // Update drone order status
      await DroneOrder.findOneAndUpdate(
        { orderId },
        { 
          status,
          deliveredAt: new Date(),
          deliveryCompleted: true
        }
      );

      // Update main order status
      await Order.findOneAndUpdate(
        { _id: orderId },
        { 
          status: 'delivered',
          deliveredAt: new Date(),
          deliveryMethod: 'drone'
        }
      );
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }

  /**
   * Log delivery completion
   * @param {Object} qrData - QR code data
   * @param {Object} verificationData - Verification details
   */
  async logDeliveryCompletion(qrData, verificationData) {
    try {
      // Create delivery completion log
      const deliveryLog = {
        orderId: qrData.orderId,
        droneId: qrData.droneId,
        deliveredAt: new Date(),
        verificationMethod: 'qr_code',
        verificationData: verificationData,
        qrCode: qrData.code,
        location: verificationData.currentLocation
      };

      // Store in audit log or delivery log collection
      console.log('Delivery completed:', deliveryLog);
    } catch (error) {
      console.error('Error logging delivery completion:', error);
    }
  }
}

export const deliveryQRService = new DeliveryQRService();
export default deliveryQRService;
