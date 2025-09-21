// Route Protection Test Script
import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

// Test users for different roles
const testUsers = {
  user: {
    email: 'user@example.com',
    password: 'password123',
    deviceId: 'test-device-user'
  },
  seller: {
    email: 'seller@example.com',
    password: 'password123',
    deviceId: 'test-device-seller'
  },
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    deviceId: 'test-device-admin'
  }
};

// Test endpoints for different roles
const testEndpoints = {
  user: [
    '/users/profile',
    '/orders',
    '/order-history'
  ],
  seller: [
    '/seller/profile',
    '/seller/products',
    '/seller/orders',
    '/seller/shop',
    '/seller/offers'
  ],
  admin: [
    '/admin/profile',
    '/admin/pending-products',
    '/admin/pending-shops',
    '/admin/sellers'
  ]
};

async function testRouteProtection() {
  console.log('🧪 Testing Route Protection System...\n');
  
  const results = {};
  
  // Test each role
  for (const [role, credentials] of Object.entries(testUsers)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔐 Testing ${role.toUpperCase()} Role`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      // 1. Test Login
      console.log(`\n1️⃣ Testing ${role} login...`);
      const loginResponse = await axios.post(`${BASE_URL}/${role === 'user' ? 'users' : role}/login`, credentials);
      
      if (loginResponse.data.success) {
        console.log(`✅ ${role} login successful`);
        const { accessToken, refreshToken } = loginResponse.data.data;
        
        // 2. Test authorized endpoints
        console.log(`\n2️⃣ Testing ${role} authorized endpoints...`);
        for (const endpoint of testEndpoints[role]) {
          try {
            const response = await axios.get(`${BASE_URL}${endpoint}`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            console.log(`✅ ${endpoint} - Access granted (${response.status})`);
          } catch (error) {
            console.log(`❌ ${endpoint} - Access denied (${error.response?.status})`);
          }
        }
        
        // 3. Test unauthorized endpoints (should be denied)
        console.log(`\n3️⃣ Testing ${role} unauthorized endpoints...`);
        const otherRoles = Object.keys(testEndpoints).filter(r => r !== role);
        for (const otherRole of otherRoles) {
          for (const endpoint of testEndpoints[otherRole]) {
            try {
              const response = await axios.get(`${BASE_URL}${endpoint}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              console.log(`⚠️ ${endpoint} - Unexpected access granted (${response.status})`);
            } catch (error) {
              if (error.response?.status === 401 || error.response?.status === 403) {
                console.log(`✅ ${endpoint} - Properly denied (${error.response.status})`);
              } else {
                console.log(`❌ ${endpoint} - Unexpected error (${error.response?.status})`);
              }
            }
          }
        }
        
        // 4. Test token refresh
        console.log(`\n4️⃣ Testing ${role} token refresh...`);
        try {
          const refreshResponse = await axios.post(`${BASE_URL}/${role === 'user' ? 'users' : role}/refresh-token`, {
            refreshToken,
            deviceId: credentials.deviceId
          });
          console.log(`✅ Token refresh successful`);
        } catch (error) {
          console.log(`❌ Token refresh failed: ${error.response?.data?.message || error.message}`);
        }
        
        // 5. Test logout
        console.log(`\n5️⃣ Testing ${role} logout...`);
        try {
          const logoutResponse = await axios.post(`${BASE_URL}/${role === 'user' ? 'users' : role}/logout`, {
            deviceId: credentials.deviceId
          }, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          console.log(`✅ Logout successful`);
        } catch (error) {
          console.log(`❌ Logout failed: ${error.response?.data?.message || error.message}`);
        }
        
        results[role] = 'PASSED';
        
      } else {
        console.log(`❌ ${role} login failed: ${loginResponse.data.message}`);
        results[role] = 'FAILED';
      }
      
    } catch (error) {
      console.log(`❌ ${role} test failed: ${error.response?.data?.message || error.message}`);
      results[role] = 'FAILED';
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 ROUTE PROTECTION TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  for (const [role, result] of Object.entries(results)) {
    console.log(`${role.toUpperCase()}: ${result}`);
  }
  
  const passedCount = Object.values(results).filter(r => r === 'PASSED').length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedCount}/${totalCount} roles passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 All route protection tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above.');
  }
}

// Run the test
testRouteProtection().catch(console.error);
