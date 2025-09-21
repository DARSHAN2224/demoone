# 🛠️ Backend Scripts

This folder contains utility scripts for setting up and maintaining the FoodApp backend.

## 📋 Available Scripts

### **Database Management**
- **`create-admin.js`** - Creates the default admin user for the system
- **`create-test-drone.js`** - Creates a test drone in the database for testing
- **`check-db.js`** - Tests database connection and basic functionality
- **`check-all-dbs.js`** - Comprehensive database health check

## 🚀 Usage

### **Create Admin User**
```bash
cd FoodBackend/scripts
node create-admin.js
```
**Default Credentials:**
- Email: `admin@foodhub.com`
- Password: `Admin123!`

### **Create Test Drone**
```bash
cd FoodBackend/scripts
node create-test-drone.js
```
**Creates:**
- Drone ID: `DRONE-001`
- Status: `idle`
- Battery: `100%`
- Location: Seattle coordinates

### **Check Database Connection**
```bash
cd FoodBackend/scripts
node check-db.js
```

### **Comprehensive Database Check**
```bash
cd FoodBackend/scripts
node check-all-dbs.js
```

## ⚠️ Important Notes

- **Environment Variables**: Make sure `.env` file is configured before running scripts
- **Database Access**: Scripts require MongoDB connection
- **Admin Creation**: Only run `create-admin.js` once per environment
- **Test Data**: `create-test-drone.js` is safe to run multiple times

## 🔧 Prerequisites

- Node.js 18+
- MongoDB running locally or accessible via connection string
- Environment variables configured in `.env` file
