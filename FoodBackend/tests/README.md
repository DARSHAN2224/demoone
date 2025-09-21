# 🧪 Backend Tests

This folder contains test files for validating various backend functionality.

## 📋 Available Tests

### **Authentication Tests**
- **`test-auth.js`** - Tests JWT authentication and user login/logout
- **`test-route-protection.js`** - Tests route protection and middleware

### **API Tests**
- **`test-api.js`** - Basic API endpoint testing
- **`test-db.js`** - Database connection and model testing

### **Service Tests**
- **`test-email.js`** - SMTP email configuration testing
- **`test-smtp-config.js`** - Email service configuration validation
- **`test-udp-services.js`** - UDP service functionality testing

### **Business Logic Tests**
- **`test-offers.js`** - Offer management and validation testing

## 🚀 Running Tests

### **Individual Test Files**
```bash
cd FoodBackend/tests
node test-auth.js
node test-email.js
node test-db.js
```

### **All Tests (if using npm test)**
```bash
cd FoodBackend
npm test
```

## 🔧 Test Configuration

### **Environment Setup**
- Ensure `.env` file is configured
- MongoDB should be running
- Email services configured (for email tests)

### **Test Data**
- Tests may create temporary data
- Some tests require existing database records
- Clean up test data after testing

## ⚠️ Important Notes

- **Database Access**: Tests require database connection
- **External Services**: Email tests require SMTP configuration
- **Test Isolation**: Each test should be independent
- **Cleanup**: Remove test data after testing

## 📊 Test Categories

- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Service Tests**: External service validation
- **Database Tests**: Data persistence testing
