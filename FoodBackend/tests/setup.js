/**
 * Jest Test Setup File
 * This file runs before all tests to ensure proper environment configuration
 */

// Ensure NODE_ENV is set to 'test' for all test runs
process.env.NODE_ENV = 'test';

// Set test-specific environment variables
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.PORT = process.env.PORT || '8001'; // Use different port for tests

console.log('🧪 Test Environment Setup:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - Test Database: drone_delivery_db_test');
console.log('  - Test Port:', process.env.PORT);

// Global test timeout
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here if needed
  console.log('🧹 Test cleanup completed');
});
