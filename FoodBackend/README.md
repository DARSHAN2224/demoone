# 🍽️ FoodApp Backend Documentation

## 🎯 Overview

The **FoodApp Backend** is a Node.js/Express.js server that handles:
- **User Authentication & Authorization** (JWT-based)
- **RESTful API Endpoints** for food ordering
- **Real-time Communication** via Socket.IO
- **Drone Integration** with telemetry and command handling
- **Database Management** (MongoDB with Mongoose)
- **File Uploads** and media management

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • User Interface│    │ • REST APIs     │    │ • User Data     │
│ • Real-time UI  │    │ • WebSocket     │    │ • Orders        │
│ • State Mgmt    │    │ • Auth          │    │ • Products      │
│ • Notifications │    │ • File Upload   │    │ • Drones        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  External APIs  │
                        │                 │
                        │ • OpenWeather   │
                        │ • Email Service │
                        │ • Cloud Storage │
                        └─────────────────┘
```

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### **Installation**
```bash
cd FoodBackend
npm install
cp ../env.example .env
# Edit .env with your configuration
npm start
```

### VS Code Workspace
If you use VS Code, set the workspace `.vscode/settings.json` per the root README for consistent linting and formatting. Backend-specific suggestions:

```
{
  "eslint.workingDirectories": [
    "FoodBackend"
  ],
  "editor.defaultFormatter": "dbaeumer.vscode-eslint",
  "editor.formatOnSave": true
}
```

### **Environment Variables**
```env
PORT=8000
MONGODB_URL=mongodb://127.0.0.1:27017/food-drone
CORS_ORIGIN=*

# JWT Configuration
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

# External Services
OPENWEATHER_API_KEY=your_openweather_api_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_SECRET=your_cloudinary_secret
CLOUDINARY_KEY=your_cloudinary_key

# Email Configuration
SMTP_MAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465

# API Configuration
BACKEND_URL=http://localhost:8000/api/v1
NODE_ENV=development
```

## 🔌 API Endpoints

### **Authentication**
- `POST /api/v1/users/register` - User registration
- `POST /api/v1/users/login` - User login
- `POST /api/v1/seller/login` - Seller login
- `POST /api/v1/admin/login` - Admin login
- `POST /api/v1/users/verify-email` - Email verification
- `POST /api/v1/users/forgot-password` - Password reset

### **User Management**
- `GET /api/v1/users/me` - Get user profile
- `PATCH /api/v1/users/me` - Update user profile
- `GET /api/v1/users/:id` - Get user by ID (admin only)

### **Shop Management**
- `GET /api/v1/shops` - List all shops
- `GET /api/v1/shops/:id` - Get shop details
- `GET /api/v1/shops/:id/products` - Get shop products
- `POST /api/v1/seller/shops` - Create shop (seller only)
- `PATCH /api/v1/seller/shops/:id` - Update shop (owner only)

### **Product Management**
- `GET /api/v1/products` - List all products
- `GET /api/v1/products/:id` - Get product details
- `POST /api/v1/seller/products` - Add product (seller only)
- `PATCH /api/v1/seller/products/:id` - Update product (owner only)
- `DELETE /api/v1/seller/products/:id` - Delete product (owner only)

### **Order Management**
- `POST /api/v1/orders` - Place order
- `GET /api/v1/orders` - Get user orders
- `GET /api/v1/orders/:id` - Get order details
- `PATCH /api/v1/seller/orders/:id/status` - Update order status (seller only)
- `GET /api/v1/seller/orders` - Get seller orders (seller only)

### **Cart Management**
- `POST /api/v1/cart` - Add to cart
- `GET /api/v1/cart` - Get cart items
- `PATCH /api/v1/cart/:id` - Update cart item
- `DELETE /api/v1/cart/:id` - Remove from cart
- `DELETE /api/v1/cart` - Clear cart

### **Drone Control**
- `POST /api/v1/drone/launch/:droneId` - Launch drone
- `POST /api/v1/drone/land/:droneId` - Land drone
- `POST /api/v1/drone/rtl/:droneId` - Return to launch
- `POST /api/v1/drone/emergency/:droneId` - Emergency stop
- `POST /api/v1/drone/mission/start/:droneId` - Start mission
- `GET /api/v1/drone/status/:droneId` - Get drone status

### **Admin Endpoints**
- `GET /api/v1/admin/dashboard` - Admin dashboard
- `GET /api/v1/admin/users` - List all users
- `POST /api/v1/admin/approve-seller` - Approve seller
- `GET /api/v1/admin/analytics` - System analytics
- `POST /api/v1/admin/pages` - Create static page

## 🗃 Database Schema

### **Users Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (enum: 'user', 'seller', 'admin'),
  phone: String,
  addresses: [{
    type: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    coordinates: [Number, Number]
  }],
  isVerified: Boolean,
  deviceId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### **Shops Collection**
```javascript
{
  _id: ObjectId,
  name: String,
  ownerId: ObjectId (ref: 'User'),
  description: String,
  location: {
    type: String,
    coordinates: [Number, Number]
  },
  categories: [String],
  isOpen: Boolean,
  isApproved: Boolean,
  images: [String],
  rating: Number,
  reviewCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### **Products Collection**
```javascript
{
  _id: ObjectId,
  shopId: ObjectId (ref: 'Shop'),
  name: String,
  description: String,
  price: Number,
  stock: Number,
  images: [String],
  category: String,
  isAvailable: Boolean,
  rating: Number,
  reviewCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### **Orders Collection**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  shopId: ObjectId (ref: 'Shop'),
  items: [{
    productId: ObjectId (ref: 'Product'),
    quantity: Number,
    price: Number,
    name: String
  }],
  total: Number,
  status: String (enum: 'pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'),
  deliveryType: String (enum: 'drone', 'manual'),
  deliveryAddress: Address,
  assignedDroneId: ObjectId (ref: 'Drone'),
  qrCode: String,
  estimatedDelivery: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### **Drones Collection**
```javascript
{
  _id: ObjectId,
  droneId: String (unique),
  status: String (enum: 'idle', 'assigned', 'launching', 'in-flight', 'delivering', 'returning', 'landing', 'maintenance'),
  battery: Number,
  location: {
    type: String,
    coordinates: [Number, Number]
  },
  altitude: Number,
  speed: Number,
  heading: Number,
  currentOrderId: ObjectId (ref: 'Order'),
  lastTelemetry: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔌 Socket.IO Events

### **Connection Events**
```javascript
// Client connects
socket.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
});

// Client disconnects
socket.on('disconnect', () => {
  console.log('Client disconnected:', socket.id);
});
```

### **Drone Telemetry**
```javascript
// Listen for drone telemetry from drone bridge
socket.on('drone:telemetry', (data) => {
  // data: {drone_id, lat, lng, alt, battery, speed, heading, status}
  // Broadcast to all connected frontend clients
  io.emit('drone:telemetry', data);
});
```

### **Drone Commands**
```javascript
// Listen for drone commands from frontend
socket.on('drone:command', (data) => {
  // data: {drone_id, command, parameters}
  // Forward to specific drone bridge
  const droneSocket = connectedDrones.get(data.drone_id);
  if (droneSocket) {
    droneSocket.emit('drone:command', data);
  }
});
```

### **Order Updates**
```javascript
// Emit order status updates
io.emit('order:update', {
  orderId: order._id,
  status: order.status,
  timestamp: new Date()
});
```

## 🧪 Testing

### **Run Tests**
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api          # API tests
npm run test:unit         # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:auth         # Authentication tests
npm run test:drone        # Drone integration tests
npm run test:websocket    # WebSocket tests

# Coverage report
npm run test:coverage
```

### **Test Structure**
- **Unit Tests**: Individual functions and utilities
- **Integration Tests**: API endpoints and database operations
- **WebSocket Tests**: Real-time communication
- **Drone Tests**: Drone control and telemetry
- **Authentication Tests**: JWT and role-based access

## 🚀 Production Deployment

### **Build & Start**
```bash
# Install production dependencies
npm install --production

# Start production server
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### **Environment Setup**
1. **MongoDB Atlas** - Use cloud database
2. **Environment Variables** - Set all required variables
3. **SSL Certificate** - Enable HTTPS
4. **CORS Configuration** - Update allowed origins
5. **Rate Limiting** - Configure appropriate limits
6. **Monitoring** - Set up logging and monitoring

### **Deployment Platforms**
- **Heroku** - Easy deployment with Git integration
- **Railway** - Modern deployment platform
- **Render** - Free tier available
- **DigitalOcean** - Full control over infrastructure

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Database Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URL

# Test connection
node check-db.js
```

#### **2. Port Already in Use**
```bash
# Check what's using port 8000
netstat -an | findstr 8000

# Kill process
taskkill /PID <PID> /F
```

#### **3. JWT Token Issues**
```bash
# Check environment variables
echo $ACCESS_TOKEN_SECRET
echo $REFRESH_TOKEN_SECRET

# Verify token format
# Should be a long, random string
```

#### **4. File Upload Failures**
```bash
# Check Cloudinary configuration
echo $CLOUDINARY_NAME
echo $CLOUDINARY_KEY

# Test file upload endpoint
curl -X POST -F "image=@test.jpg" http://localhost:8000/api/v1/upload
```

### **Debug Commands**
```bash
# Check server logs
npm run dev

# Check database connection
node check-db.js

# Test email configuration
node test-email.js

# Check all databases
node check-all-dbs.js
```

## 📚 Additional Resources

- **Express.js Documentation**: https://expressjs.com/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Socket.IO Documentation**: https://socket.io/docs/
- **JWT Documentation**: https://jwt.io/
- **Mongoose Documentation**: https://mongoosejs.com/docs/

---

**🍽️ Your FoodApp Backend is ready to serve delicious orders with drone delivery! 🚁✨**
