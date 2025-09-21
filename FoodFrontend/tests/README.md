# 🎨 Frontend Tests

This folder contains test files for the FoodApp React frontend.

## 📋 Test Structure

### **Unit Tests**
- **Component Tests** - Individual React component testing
- **Hook Tests** - Custom React hooks validation
- **Utility Tests** - Helper function testing

### **Integration Tests**
- **API Integration** - Backend communication testing
- **State Management** - Zustand store testing
- **Routing** - React Router functionality

### **E2E Tests**
- **User Workflows** - Complete user journey testing
- **Drone Control** - Drone management interface testing
- **Order Flow** - Food ordering process testing

## 🚀 Running Tests

### **All Tests**
```bash
cd FoodFrontend
npm test
```

### **Specific Test Suites**
```bash
npm run test:unit         # Unit tests only
npm run test:component    # Component tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end tests
```

### **Test Coverage**
```bash
npm run test:coverage
```

## 🧪 Testing Tools

### **Framework**
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **Playwright** - E2E testing framework

### **Utilities**
- **MSW** - API mocking for tests
- **Testing Library** - User-centric testing utilities
- **Jest DOM** - DOM testing matchers

## 🔧 Test Configuration

### **Environment Setup**
- Ensure backend is running for integration tests
- Configure test environment variables
- Set up test database if needed

### **Mock Data**
- Use consistent test data across tests
- Mock external API calls
- Simulate user interactions

## 📊 Test Categories

- **Unit Tests**: Fast, isolated function testing
- **Component Tests**: React component rendering and behavior
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Complete user workflow validation

## ⚠️ Best Practices

- **Test Isolation**: Each test should be independent
- **Realistic Data**: Use realistic test data
- **User Behavior**: Test from user perspective
- **Performance**: Keep tests fast and efficient
