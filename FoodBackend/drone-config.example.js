// Drone Bridge Configuration Examples
// Copy this file to drone-config.js and modify as needed

export const droneConfig = {
  // Environment settings
  environments: {
    development: {
      httpUrl: 'http://localhost:8001',
      wsUrl: 'ws://localhost:8002',
      simulationMode: false,
      testMode: false
    },
    test: {
      httpUrl: 'http://localhost:8001',
      wsUrl: 'ws://localhost:8002',
      simulationMode: true,
      testMode: true
    },
    production: {
      httpUrl: 'http://drone-bridge:8001',
      wsUrl: 'ws://drone-bridge:8002',
      simulationMode: false,
      testMode: false
    }
  },

  // Command simulation settings for test mode
  simulation: {
    commandDelay: 100, // milliseconds
    defaultAltitude: 100, // meters
    defaultLocation: {
      lat: 12.9716,
      lng: 77.5946,
      alt: 0
    }
  },

  // Production settings
  production: {
    timeout: 10000, // milliseconds
    retryAttempts: 3,
    emergencyContacts: [
      {
        name: 'Drone Operations',
        phone: '+1234567890',
        email: 'ops@company.com'
      }
    ]
  }
};

// Usage examples:
// 
// For testing (simulation mode):
// NODE_ENV=test DRONE_TEST_MODE=true npm start
//
// For development with real drone bridge:
// NODE_ENV=development npm start
//
// For production:
// NODE_ENV=production npm start
