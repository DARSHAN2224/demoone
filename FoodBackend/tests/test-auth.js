// Simple authentication test script
import axios from 'axios';

const BASE_URL = 'http://localhost:8000/api/v1';

// Test data
const testData = {
  user: {
    email: 'test@example.com',
    password: 'password123',
    deviceId: 'test-device-123'
  },
  seller: {
    email: 'seller@example.com', 
    password: 'password123',
    deviceId: 'test-device-456'
  },
  admin: {
    email: 'admin@example.com',
    password: 'password123', 
    deviceId: 'test-device-789'
  }
};

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');
  
  // Test User Login
  try {
    console.log('1️⃣ Testing User Login...');
    const userResponse = await axios.post(`${BASE_URL}/users/login`, testData.user);
    console.log('✅ User login successful:', userResponse.data.success);
    console.log('   - Has accessToken:', !!userResponse.data.data.accessToken);
    console.log('   - Has refreshToken:', !!userResponse.data.data.refreshToken);
    console.log('   - Has user data:', !!userResponse.data.data.user);
  } catch (error) {
    console.log('❌ User login failed:', error.response?.data?.message || error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test Seller Login
  try {
    console.log('2️⃣ Testing Seller Login...');
    const sellerResponse = await axios.post(`${BASE_URL}/seller/login`, testData.seller);
    console.log('✅ Seller login successful:', sellerResponse.data.success);
    console.log('   - Has accessToken:', !!sellerResponse.data.data.accessToken);
    console.log('   - Has refreshToken:', !!sellerResponse.data.data.refreshToken);
    console.log('   - Has seller data:', !!sellerResponse.data.data.seller);
  } catch (error) {
    console.log('❌ Seller login failed:', error.response?.data?.message || error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test Admin Login
  try {
    console.log('3️⃣ Testing Admin Login...');
    const adminResponse = await axios.post(`${BASE_URL}/admin/login`, testData.admin);
    console.log('✅ Admin login successful:', adminResponse.data.success);
    console.log('   - Has accessToken:', !!adminResponse.data.data.accessToken);
    console.log('   - Has refreshToken:', !!adminResponse.data.data.refreshToken);
    console.log('   - Has admin data:', !!adminResponse.data.data.user);
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test Profile Endpoints
  console.log('4️⃣ Testing Profile Endpoints...');
  
  // Test User Profile
  try {
    const userProfileResponse = await axios.get(`${BASE_URL}/users/profile`);
    console.log('✅ User profile accessible');
  } catch (error) {
    console.log('❌ User profile failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  // Test Seller Profile
  try {
    const sellerProfileResponse = await axios.get(`${BASE_URL}/seller/profile`);
    console.log('✅ Seller profile accessible');
  } catch (error) {
    console.log('❌ Seller profile failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  // Test Admin Profile
  try {
    const adminProfileResponse = await axios.get(`${BASE_URL}/admin/profile`);
    console.log('✅ Admin profile accessible');
  } catch (error) {
    console.log('❌ Admin profile failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  
  console.log('\n🎯 Authentication System Test Complete!');
}

// Run the test
testAuth().catch(console.error);
