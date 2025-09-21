// Export all QR services
export { coreQRService, default as CoreQRService } from './coreQRService.js';
export { deliveryQRService, default as DeliveryQRService } from './deliveryQRService.js';
export { flightPlanQRService, default as FlightPlanQRService } from './flightPlanQRService.js';

// Main QR service that combines all functionality
import { coreQRService } from './coreQRService.js';
import { deliveryQRService } from './deliveryQRService.js';
import { flightPlanQRService } from './flightPlanQRService.js';

class QRService {
  constructor() {
    this.core = coreQRService;
    this.delivery = deliveryQRService;
    this.flightPlan = flightPlanQRService;
  }

  // Core QR functionality
  async generateQRCode(data, options) {
    return this.core.generateQRCode(data, options);
  }

  // Delivery QR functionality
  async generateDeliveryQR(deliveryData) {
    return this.delivery.generateDeliveryQR(deliveryData);
  }

  async verifyDeliveryQR(qrData, verificationData) {
    return this.delivery.verifyDeliveryQR(qrData, verificationData);
  }

  // Flight plan QR functionality
  async generatePX4FlightPlanQR(flightPlan) {
    return this.flightPlan.generatePX4FlightPlanQR(flightPlan);
  }

  async generateRealEngineSimulationQR(simulationData) {
    return this.flightPlan.generateRealEngineSimulationQR(simulationData);
  }

  // Utility methods
  generateDeliveryCode(orderId) {
    return this.core.generateDeliveryCode(orderId);
  }

  createToken(payload, secret, expiresIn) {
    return this.core.createToken(payload, secret, expiresIn);
  }

  verifyToken(token, secret) {
    return this.core.verifyToken(token, secret);
  }

  isExpired(qrData) {
    return this.core.isExpired(qrData);
  }
}

export const qrService = new QRService();
export default qrService;
