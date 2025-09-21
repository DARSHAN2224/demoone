# 🏗️ FoodApp Project Structure

## 📁 **Root Directory Structure**

```
FoodApp/
├── 📁 FoodBackend/           # Node.js/Express.js Backend
├── 📁 FoodFrontend/          # React/Vite Frontend
├── 📁 drone-bridge/          # Python Drone Bridge
├── 📄 README.md              # Main project overview
├── 📄 UNIFIED_DRONE_DELIVERY_DOCUMENTATION.md  # Complete system guide
├── 📄 PROJECT_STRUCTURE.md   # This file
├── 📄 env.example            # Environment variables template
├── 📄 package.json           # Root package configuration
└── 📄 .gitignore             # Git ignore rules
```

## 🍽️ **FoodBackend Structure**

```
FoodBackend/
├── 📁 src/                   # Main source code
│   ├── 📁 controllers/       # Business logic
│   ├── 📁 routes/            # API endpoints
│   ├── 📁 models/            # Database schemas
│   ├── 📁 middlewares/       # Authentication & validation
│   ├── 📁 services/          # External service integration
│   ├── 📁 utils/             # Helper functions
│   ├── 📁 db/                # Database connection
│   ├── 📁 socket/            # Socket.IO configuration
│   ├── 📁 tests/             # Test files
│   ├── 📄 app.js             # Express app configuration
│   └── 📄 index.js           # Server entry point
├── 📁 scripts/               # Utility scripts
│   ├── 📄 README.md          # Scripts documentation
│   ├── 📄 create-admin.js    # Create default admin user
│   ├── 📄 create-test-drone.js # Create test drone
│   ├── 📄 check-db.js        # Database connection test
│   ├── 📄 check-all-dbs.js   # Comprehensive DB check
│   └── 📄 cleanupTokens.js   # Token cleanup utility
├── 📁 tests/                 # Test files
│   ├── 📄 README.md          # Tests documentation
│   ├── 📄 test-auth.js       # Authentication tests
│   ├── 📄 test-api.js        # API endpoint tests
│   ├── 📄 test-db.js         # Database tests
│   ├── 📄 test-email.js      # Email service tests
│   ├── 📄 test-offers.js     # Business logic tests
│   └── 📁 api/               # API-specific tests
├── 📁 public/                # Static files
├── 📄 README.md              # Backend-specific documentation
└── 📄 package.json           # Backend dependencies
```

## 🎨 **FoodFrontend Structure**

```
FoodFrontend/
├── 📁 src/                   # Main source code
│   ├── 📁 components/        # React components
│   │   ├── 📁 admin/         # Admin-specific components
│   │   ├── 📁 seller/        # Seller-specific components
│   │   ├── 📁 user/          # User-specific components
│   │   ├── 📁 common/        # Shared components
│   │   └── 📁 ui/            # Reusable UI components
│   ├── 📁 services/          # API and external services
│   ├── 📁 stores/            # Zustand state management
│   ├── 📁 hooks/             # Custom React hooks
│   ├── 📁 utils/             # Helper functions
│   ├── 📁 config/            # Configuration files
│   └── 📁 lib/               # Third-party library configs
├── 📁 scripts/               # Build and utility scripts
│   └── 📄 README.md          # Scripts documentation
├── 📁 tests/                 # Test files
│   └── 📄 README.md          # Tests documentation
├── 📁 public/                # Static assets
├── 📄 README.md              # Frontend-specific documentation
├── 📄 vite.config.js         # Vite build configuration
├── 📄 tailwind.config.js     # Tailwind CSS configuration
└── 📄 package.json           # Frontend dependencies
```

## 🚁 **Drone Bridge Structure**

```
drone-bridge/
├── 📁 src/                   # Main source code (if any)
├── 📁 scripts/               # Testing and utility scripts
│   ├── 📄 README.md          # Scripts documentation
│   └── 📄 test_drone_api.ps1 # PowerShell testing script
├── 📁 tests/                 # Python test files
│   └── 📄 README.md          # Tests documentation
├── 📄 drone_bridge_dual_mode.py # Core drone bridge
├── 📄 drone_api.py           # Drone API implementation
├── 📄 start.py               # Simple launcher script
├── 📄 requirements.txt       # Python dependencies
├── 📄 README.md              # Drone bridge documentation
└── 📁 mavsdk-env/            # Python virtual environment
```

## 🧪 **Testing Organization**

### **Backend Testing**
- **Location**: `FoodBackend/tests/`
- **Types**: Unit, Integration, API, Service tests
- **Tools**: Node.js, Jest (if configured)
- **Focus**: Authentication, API endpoints, database operations

### **Frontend Testing**
- **Location**: `FoodFrontend/tests/`
- **Types**: Unit, Component, Integration, E2E tests
- **Tools**: Vitest, React Testing Library, Playwright
- **Focus**: Component rendering, user interactions, API integration

### **DroneBridge Testing**
- **Location**: `DroneBridge/tests/`
- **Types**: Unit, Integration, PX4 communication tests
- **Tools**: pytest, Python testing framework
- **Focus**: Drone control, telemetry, PX4 integration

## 🛠️ **Scripts Organization**

### **Backend Scripts**
- **Location**: `FoodBackend/scripts/`
- **Purpose**: Database setup, admin creation, maintenance
- **Usage**: Run individually for specific tasks

### **Frontend Scripts**
- **Location**: `FoodFrontend/scripts/`
- **Purpose**: Build automation, deployment, utilities
- **Usage**: Integrated with npm scripts

### **DroneBridge Scripts**
- **Location**: `DroneBridge/scripts/`
- **Purpose**: Drone testing, API validation
- **Usage**: PowerShell script for testing drone commands

## 📚 **Documentation Organization**

### **Main Documentation**
- **`README.md`**: Project overview and quick start
- **`UNIFIED_DRONE_DELIVERY_DOCUMENTATION.md`**: Complete system guide
- **`PROJECT_STRUCTURE.md`**: This file - project organization

### **Component Documentation**
- **`FoodBackend/README.md`**: Backend-specific setup and API
- **`FoodFrontend/README.md`**: Frontend-specific components and build
- **`DroneBridge/README.md`**: DroneBridge-specific PX4 integration

### **Script & Test Documentation**
- Each `scripts/` and `tests/` folder has its own `README.md`
- Explains what each file does and how to use it
- Provides troubleshooting and best practices

## 🚀 **Quick Start Commands**

### **Backend Setup**
```bash
cd FoodBackend
npm install
npm start
```

### **Frontend Setup**
```bash
cd FoodFrontend
npm install
npm run dev
```

### **DroneBridge Setup**
```bash
cd DroneBridge
pip install -r requirements.txt
python start.py
```

### **Testing**
```bash
# Backend
cd FoodBackend/scripts
node create-test-drone.js

# Frontend
cd FoodFrontend
npm test

# DroneBridge
cd DroneBridge/scripts
.\test_drone_api.ps1
```

## ✅ **Benefits of This Structure**

1. **Clear Separation**: Each component has its own focused area
2. **Easy Navigation**: Developers know exactly where to find things
3. **Maintainable**: Related files are grouped together
4. **Scalable**: Easy to add new features without cluttering
5. **Documented**: Each folder explains its purpose and contents
6. **Testable**: Organized testing structure for each component
7. **Scriptable**: Utility scripts are easy to find and use

---

**🎯 This organized structure makes the FoodApp project easy to navigate, maintain, and extend! 🚁✨**
