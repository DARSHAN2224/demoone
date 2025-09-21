import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

class CoreQRService {
  constructor() {
    this.secretKey = process.env.QR_SECRET_KEY || 'qr-secret-key';
    this.expiryTime = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Generate QR code image from data
   * @param {Object} data - Data to encode
   * @param {Object} options - QR code options
   * @returns {string} QR code data URL
   */
  async generateQRCode(data, options = {}) {
    try {
      const defaultOptions = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      };

      const qrOptions = { ...defaultOptions, ...options };
      const qrImage = await QRCode.toDataURL(JSON.stringify(data), qrOptions);

      return {
        success: true,
        qrCode: qrImage,
        data: data,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate unique delivery code
   * @param {string} orderId - Order ID
   * @returns {string} Unique delivery code
   */
  generateDeliveryCode(orderId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const hash = crypto.createHash('md5').update(orderId + timestamp).digest('hex').substr(0, 6);
    
    return `DEL-${timestamp.toUpperCase()}-${random.toUpperCase()}-${hash.toUpperCase()}`;
  }

  /**
   * Create JWT token with expiry
   * @param {Object} payload - Token payload
   * @param {string} secret - Secret key
   * @param {string} expiresIn - Expiry time
   * @returns {string} JWT token
   */
  createToken(payload, secret = this.secretKey, expiresIn = '30m') {
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @param {string} secret - Secret key
   * @returns {Object} Decoded token
   */
  verifyToken(token, secret = this.secretKey) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Parse QR data from string
   * @param {string} qrData - QR code data
   * @returns {Object} Parsed data
   */
  parseQRData(qrData) {
    try {
      if (typeof qrData === 'string') {
        return JSON.parse(qrData);
      }
      return qrData;
    } catch (error) {
      throw new Error('Invalid QR data format');
    }
  }

  /**
   * Check if QR code has expired
   * @param {Object} qrData - QR code data
   * @returns {boolean} True if expired
   */
  isExpired(qrData) {
    if (!qrData.expiry) return false;
    return Date.now() > qrData.expiry;
  }

  /**
   * Generate timestamp for expiry
   * @param {number} minutes - Minutes from now
   * @returns {number} Timestamp
   */
  generateExpiry(minutes = 30) {
    return Date.now() + (minutes * 60 * 1000);
  }
}

export const coreQRService = new CoreQRService();
export default coreQRService;
