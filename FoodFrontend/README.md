# 🎨 FoodApp Frontend Documentation

## 🎯 Overview

The **FoodApp Frontend** is a React-based web application featuring:
- **Modern UI/UX** with Tailwind CSS
- **Real-time Updates** via Socket.IO
- **Role-based Interfaces** (User, Seller, Admin)
- **Drone Control Dashboard** with QGroundControl-style features
- **Responsive Design** for all devices
- **State Management** with Zustand

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Components    │    │   Services      │    │   Stores        │
│                 │    │                 │    │                 │
│ • UI Components │    │ • API Calls     │    │ • Auth State    │
│ • Pages        │    │ • Socket.IO     │    │ • App State     │
│ • Layouts      │    │ • File Upload   │    │ • Cart State    │
│ • Forms        │    │ • Notifications │    │ • Order State   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Hooks         │    │   Utils         │    │   Config        │
│                 │    │                 │    │                 │
│ • Custom Hooks │    │ • Helpers       │    │ • API URLs      │
│ • Event Hooks  │    │ • Validators    │    │ • Constants     │
│ • State Hooks  │    │ • Formatters    │    │ • Environment   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Git
- Google Maps API Key (for drone tracking maps)

### **Environment Setup**
Create a `.env` file in the frontend directory:
```bash
# Google Maps API Key (required for drone maps)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000/api/v1

# Socket.IO URL
VITE_SOCKET_URL=http://localhost:8000
```

### **Installation**
```bash
cd FoodFrontend
npm install
npm run dev
# Frontend accessible at http://localhost:5173
```

### VS Code Workspace
For best results in VS Code, align with the root `.vscode/settings.json`. Frontend-specific snippet:

```
{
  "eslint.workingDirectories": [
    "FoodFrontend"
  ],
  "editor.formatOnSave": true
}
```

### **Environment Variables**
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
VITE_APP_NAME=Food & Drone Delivery
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 🧩 Component Structure

### **Core Components**
```
src/
├── components/
│   ├── auth/              # Authentication components
│   │   ├── EnhancedLogin.jsx
│   │   ├── EnhancedRegister.jsx
│   │   └── ProtectedRoute.jsx
│   ├── common/            # Shared components
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Navigation.jsx
│   │   └── UnifiedOrderDashboard.jsx
│   ├── ui/                # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Badge.jsx
│   │   ├── Tabs.jsx
│   │   ├── Checkbox.jsx
│   │   └── Progress.jsx
│   ├── user/              # User-specific components
│   │   ├── Cart/
│   │   ├── Orders/
│   │   ├── Profile/
│   ├── seller/            # Seller-specific components
│   │   ├── ShopManagement/
│   │   ├── ProductManagement/
│   │   ├── OrderManagement/
│   └── admin/             # Admin-specific components
│       ├── Dashboard/
│       ├── UserManagement/
│       ├── AdminDocumentation.jsx
│       ├── DroneFleetManagement.jsx
│       ├── ProductionAutomationDashboard.jsx
│       ├── QGroundControlDashboard.jsx
│       └── MissionPlanningInterface.jsx
```

### **Drone Control Components**

#### **QGroundControl Dashboard**
- **Live Map**: Real-time drone tracking on Google Maps
- **Telemetry Dashboard**: Battery, altitude, speed, heading
- **Video Streaming**: Live camera feeds from drones
- **Mission Planning**: Waypoint-based delivery routes
- **Fleet Status**: Overview of all connected drones

#### **Mission Planning Interface**
- **Mission Controls**: Drone selection and mission settings
- **Interactive Map**: Google Maps integration for waypoints
- **Waypoints List**: Manage and edit mission waypoints
- **Saved Missions**: Load and execute saved missions
- **Mission Statistics**: Performance metrics and analytics

## 🔌 Services & APIs

### **API Service**
```javascript
// src/services/apiService.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### **Socket.IO Service**
```javascript
// src/services/socketService.js
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true
});

// Listen for drone telemetry
socket.on('drone:telemetry', (data) => {
  console.log('Drone telemetry:', data);
  // Update drone state in store
});

// Listen for order updates
socket.on('order:update', (data) => {
  console.log('Order update:', data);
  // Update order state in store
});

export default socket;
```

### **Drone Services**

#### **Drone Automation Service**
```javascript
// src/services/droneAutomationService.js
export class DroneAutomationService {
  // Automated delivery lifecycle
  async startDelivery(orderId, droneId) { ... }
  async monitorDelivery(orderId) { ... }
  async completeDelivery(orderId) { ... }
  async handleDeliveryFailure(orderId, error) { ... }
}
```

#### **Drone Management Service**
```javascript
// src/services/droneManagementService.js
export class DroneManagementService {
  // Manual drone registration and management
  async registerDrone(droneData) { ... }
  async testConnection(droneId) { ... }
  async updateDroneStatus(droneId, status) { ... }
  async getFleetStatus() { ... }
}
```

#### **Drone Tracking Service**
```javascript
// src/services/droneTrackingService.js
export class DroneTrackingService {
  // Real-time drone tracking and telemetry
  async connectToDrone(droneId) { ... }
  async getLiveTelemetry(droneId) { ... }
  async getFlightPath(droneId) { ... }
  async getMissionStatus(droneId) { ... }
}
```

## 🗃 State Management

### **Auth Store**
```javascript
// src/stores/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  login: async (credentials) => { ... },
  logout: async () => { ... },
  register: async (userData) => { ... },
  verifyAuth: async () => { ... }
}));
```

### **App Store**
```javascript
// src/stores/appStore.js
export const useAppStore = create((set, get) => ({
  theme: 'light',
  language: 'en',
  notifications: [],
  
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  addNotification: (notification) => { ... }
}));
```

### **Fleet Store**
```javascript
// src/stores/useFleetStore.js
export const useFleetStore = create((set, get) => ({
  drones: [],
  selectedDrone: null,
  telemetry: {},
  
  setDrones: (drones) => set({ drones }),
  selectDrone: (droneId) => set({ selectedDrone: droneId }),
  updateTelemetry: (droneId, data) => { ... }
}));
```

## 🧪 Testing

### **Run Tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit         # Unit tests
npm run test:component    # Component tests
npm run test:integration  # Integration tests
npm run test:e2e          # E2E tests with Playwright

# Coverage report
npm run test:coverage
```

### **Test Structure**
- **Unit Tests**: Individual functions and utilities
- **Component Tests**: React component rendering and behavior
- **Integration Tests**: Component interactions and API calls
- **E2E Tests**: Complete user workflows

### **Testing Tools**
- **Vitest**: Fast unit testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing
- **MSW**: API mocking for tests

## 🎨 UI Components

### **Button Component**
```jsx
// src/components/ui/Button.jsx
import { cn } from '../../lib/utils';

export const Button = ({ 
  variant = 'default', 
  size = 'default', 
  className, 
  children, 
  ...props 
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        // Variants and sizes...
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
```

### **Input Component**
```jsx
// src/components/ui/Input.jsx
import { cn } from '../../lib/utils';

export const Input = ({ className, type, ...props }) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background file:border-0 file:bg-transparent',
        'file:text-sm file:font-medium placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};
```

## 🚀 Production Build

### **Build Commands**
```bash
# Create production build
npm run build

# Preview production build
npm run preview

# Analyze bundle size
npm run analyze
```

### **Build Output**
```
dist/
├── index.html              # Main HTML file
├── assets/                 # Compiled assets
│   ├── index-[hash].js    # Main JavaScript bundle
│   ├── index-[hash].css   # Main CSS bundle
│   └── [hash].png         # Optimized images
└── _redirects              # Netlify redirects (if using)
```

### **Deployment**
- **Vercel**: Automatic deployment from Git
- **Netlify**: Drag & drop or Git integration
- **GitHub Pages**: Free hosting for static sites
- **AWS S3**: Scalable cloud hosting

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Build Failures**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Clear Vite cache
npm run clean
```

#### **2. Component Not Rendering**
```bash
# Check browser console for errors
# Verify component imports
# Check prop types and required props
# Ensure component is properly exported
```

#### **3. API Calls Failing**
```bash
# Check environment variables
echo $VITE_API_BASE_URL

# Verify backend is running
curl http://localhost:8000/api/v1/health

# Check CORS configuration
# Verify authentication tokens
```

#### **4. Socket.IO Connection Issues**
```bash
# Check Socket.IO URL
echo $VITE_SOCKET_URL

# Verify backend Socket.IO is active
# Check for CORS issues
# Verify authentication on socket connection
```

### **Debug Commands**
```bash
# Start development server with debugging
npm run dev -- --debug

# Run tests with verbose output
npm test -- --verbose

# Check bundle analysis
npm run analyze

# Lint code for issues
npm run lint
```

## 📚 Additional Resources

- **React Documentation**: https://react.dev/
- **Vite Documentation**: https://vitejs.dev/
- **Tailwind CSS Documentation**: https://tailwindcss.com/
- **Zustand Documentation**: https://zustand-demo.pmnd.rs/
- **Socket.IO Client Documentation**: https://socket.io/docs/v4/client-api/

## 🎯 Development Guidelines

### **Code Style**
- Use functional components with hooks
- Implement proper error boundaries
- Follow React best practices
- Use TypeScript for type safety
- Implement proper loading states

### **Performance**
- Lazy load components when possible
- Optimize images and assets
- Use React.memo for expensive components
- Implement proper caching strategies
- Monitor bundle size

### **Accessibility**
- Use semantic HTML elements
- Implement proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Follow WCAG guidelines

---

**🎨 Your FoodApp Frontend is ready to deliver beautiful user experiences with drone control! 🚁✨**
