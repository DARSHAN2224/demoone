import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { handleCsrfErrors } from './middlewares/csrfMiddleware.js';
import { sanitizeBody } from './middlewares/inputSanitizationMiddleware.js';
import { attachNotifyFlag } from './middlewares/notificationFlagMiddleware.js';
import { CORS_ORIGIN } from './constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// console.log(process.env.SMTP_MAIL, "hhh");
// Security middleware (Industry Standard)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware
app.use(compression());

// Request logging (Industry Standard)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// CORS configuration (Industry Standard) - Using CORS_ORIGIN constant
app.use(cors({ 
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'x-test-mode'],
  exposedHeaders: ['Set-Cookie']
}));

// Body parsing middleware
app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Reduced from 50mb for security

// Static files
app.use(express.static('public'));
// Persisted uploads (logs and generated reports)
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'uploads')));

// Input sanitization (Industry Standard)
app.use(sanitizeBody);

// Auto-attach notify flag to responses
app.use(attachNotifyFlag);

// CSRF protection
import { csrfProtection, generateCsrfToken } from './middlewares/csrfMiddleware.js';

// Routes
import sellerRouter from './routes/sellerRoutes.js';
import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import deliveryRouter from './routes/deliveryRoutes.js';
import productRouter from './routes/productRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import cartRouter from './routes/cartRoutes.js';
import analyticsRouter from './routes/analyticsRoutes.js';
import droneRouter from './routes/droneRoutes.js';
import droneTestRouter from './routes/droneTestRoutes.js';
import { checkTestingMode } from './middlewares/checkTestingMode.js';
import { droneDiscoveryService } from './services/droneDiscoveryService.js';
import ratingRouter from './routes/ratingRoutes.js';
import commentRouter from './routes/commentRoutes.js';
import likeRouter from './routes/likeRoutes.js';
import favoriteRouter from './routes/favoriteRoutes.js';
import recentHistoryRouter from './routes/recentHistoryRoutes.js';
import Settings from './models/settingsModel.js';
import notificationRouter from './routes/notificationRoutes.js';
import searchRouter from './routes/searchRoutes.js';
import feedbackRouter from './routes/feedbackRoutes.js';
import documentationRouter from './routes/documentationRoutes.js';
import parcelTrackingRouter from './routes/parcelTrackingRoutes.js';

// Apply CSRF protection to all routes (Industry Standard)
// Note: Authentication routes are excluded from CSRF protection to allow login/register
app.use("/api/v1/users", userRouter);
app.use("/api/v1/seller", sellerRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/delivery", csrfProtection, deliveryRouter);
app.use("/api/v1/products", csrfProtection, productRouter);
app.use("/api/v1/orders", csrfProtection, orderRouter);
app.use("/api/v1/cart", csrfProtection, cartRouter);
app.use("/api/v1/analytics", csrfProtection, analyticsRouter);
app.use("/api/v1/drone", csrfProtection, droneRouter);
app.use("/api/v1/test/drone", checkTestingMode, droneTestRouter);
app.use("/api/v1/ratings", csrfProtection, ratingRouter);
app.use("/api/v1/comments", csrfProtection, commentRouter);
app.use("/api/v1/likes", csrfProtection, likeRouter);
app.use("/api/v1/favorites", csrfProtection, favoriteRouter);
app.use("/api/v1/history", csrfProtection, recentHistoryRouter);
app.use("/api/v1/notifications", csrfProtection, notificationRouter);
app.use("/api/v1/search", csrfProtection, searchRouter);
app.use("/api/v1/feedback", csrfProtection, feedbackRouter);
app.use("/api/v1/documentation", csrfProtection, documentationRouter);
app.use("/api/v1/parcel-tracking", csrfProtection, parcelTrackingRouter);

// CSRF token endpoint (Industry Standard) - Must be after CSRF middleware is applied
app.get('/api/v1/csrf-token', csrfProtection, generateCsrfToken);

// Health check endpoint for testing
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'FoodApp Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});
console.log( process.env.SMTP_MAIL, "hhh");
// Testing endpoints for drone control (bypass CSRF protection)
app.get('/api/v1/test/drone/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        droneId: drone.droneId,
        status: drone.status,
        battery: drone.battery || 100,
        altitude: drone.altitude || 0,
        latitude: drone.location?.coordinates?.[1] || 47.6414678,
        longitude: drone.location?.coordinates?.[0] || -122.1401649,
        speed: drone.speed || 0,
        heading: drone.heading || 0
      },
      message: `Drone ${droneId} status retrieved successfully`
    });
  } catch (error) {
    console.error('Get drone status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get drone status',
      error: error.message
    });
  }
});

app.post('/api/v1/test/drone/launch/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    const { altitude = 20 } = req.body;
    
    console.log(`🚁 Testing: Launch drone ${droneId} to altitude ${altitude}m`);
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    // Send command to drone bridge
    try {
      console.log(`📡 Sending takeoff command to drone bridge...`);
      const response = await fetch(`http://127.0.0.1:8001/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId: droneId,
          command: 'takeoff',
          parameters: { altitude: altitude }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Drone bridge response:`, result);
        
        // Update drone status
        await Drone.findOneAndUpdate(
          { droneId },
          { 
            status: 'in_flight',
            altitude: altitude,
            'telemetry.lastUpdate': new Date()
          }
        );
        
        res.status(200).json({
          success: true,
          message: `Drone ${droneId} launched to ${altitude}m altitude`,
          data: { droneId, altitude, status: 'in_flight' },
          droneBridgeResponse: result
        });
      } else {
        console.log(`❌ Drone bridge error: ${response.status} ${response.statusText}`);
        res.status(500).json({
          success: false,
          message: `Failed to send command to drone bridge: ${response.statusText}`,
          suggestion: "Make sure drone bridge is running on port 8001"
        });
      }
    } catch (fetchError) {
      console.log(`❌ Network error connecting to drone bridge:`, fetchError.message);
      res.status(500).json({
        success: false,
        message: `Cannot connect to drone bridge: ${fetchError.message}`,
        suggestion: "Make sure drone bridge is running on port 8001"
      });
    }
  } catch (error) {
    console.error('Launch drone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to launch drone',
      error: error.message
    });
  }
});

app.post('/api/v1/test/drone/land/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    
    console.log(`🛬 Testing: Land drone ${droneId}`);
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    // Send command to drone bridge
    try {
      console.log(`📡 Sending land command to drone bridge...`);
      const response = await fetch(`http://127.0.0.1:8001/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId: droneId,
          command: 'land',
          parameters: {}
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Drone bridge response:`, result);
        
        // Update drone status
        await Drone.findOneAndUpdate(
          { droneId },
          { 
            status: 'landing',
            altitude: 0,
            'telemetry.lastUpdate': new Date()
          }
        );
        
        res.status(200).json({
          success: true,
          message: `Drone ${droneId} landing initiated`,
          data: { droneId, status: 'landing' },
          droneBridgeResponse: result
        });
      } else {
        console.log(`❌ Drone bridge error: ${response.status} ${response.statusText}`);
        res.status(500).json({
          success: false,
          message: `Failed to send command to drone bridge: ${response.statusText}`,
          suggestion: "Make sure drone bridge is running on port 8001"
        });
      }
    } catch (fetchError) {
      console.log(`❌ Network error connecting to drone bridge:`, fetchError.message);
      res.status(500).json({
        success: false,
        message: `Cannot connect to drone bridge: ${fetchError.message}`,
        suggestion: "Make sure drone bridge is running on port 8001"
      });
    }
  } catch (error) {
    console.error('Land drone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to land drone',
      error: error.message
    });
  }
});

app.post('/api/v1/test/drone/rtl/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    
    console.log(`🏠 Testing: Return to launch for drone ${droneId}`);
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    // Send command to drone bridge
    try {
      console.log(`📡 Sending RTL command to drone bridge...`);
      const response = await fetch(`http://127.0.0.1:8001/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId: droneId,
          command: 'return_to_launch',
          parameters: {}
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Drone bridge response:`, result);
        
        // Update drone status
        await Drone.findOneAndUpdate(
          { droneId },
          { 
            status: 'returning',
            'telemetry.lastUpdate': new Date()
          }
        );
        
        res.status(200).json({
          success: true,
          message: `Drone ${droneId} returning to launch`,
          data: { droneId, status: 'returning' },
          droneBridgeResponse: result
        });
      } else {
        console.log(`❌ Drone bridge error: ${response.status} ${response.statusText}`);
        res.status(500).json({
          success: false,
          message: `Failed to send command to drone bridge: ${response.statusText}`,
          suggestion: "Make sure drone bridge is running on port 8001"
        });
      }
    } catch (fetchError) {
      console.log(`❌ Network error connecting to drone bridge:`, fetchError.message);
      res.status(500).json({
        success: false,
        message: `Cannot connect to drone bridge: ${fetchError.message}`,
        suggestion: "Make sure drone bridge is running on port 8001"
      });
    }
  } catch (error) {
    console.error('RTL drone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate RTL',
      error: error.message
    });
  }
});

app.post('/api/v1/test/drone/emergency/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    
    console.log(`🛑 Testing: Emergency stop for drone ${droneId}`);
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    // Send command to drone bridge
    try {
      console.log(`📡 Sending emergency stop command to drone bridge...`);
      const response = await fetch(`http://127.0.0.1:8001/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId: droneId,
          command: 'emergency_stop',
          parameters: {}
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Drone bridge response:`, result);
        
        // Update drone status
        await Drone.findOneAndUpdate(
          { droneId },
          { 
            status: 'emergency_stop',
            'telemetry.lastUpdate': new Date()
          }
        );
        
        res.status(200).json({
          success: true,
          message: `Emergency stop initiated for drone ${droneId}`,
          data: { droneId, status: 'emergency_stop' },
          droneBridgeResponse: result
        });
      } else {
        console.log(`❌ Drone bridge error: ${response.status} ${response.statusText}`);
        res.status(500).json({
          success: false,
          message: `Failed to send command to drone bridge: ${response.statusText}`,
          suggestion: "Make sure drone bridge is running on port 8001"
        });
      }
    } catch (fetchError) {
      console.log(`❌ Network error connecting to drone bridge:`, fetchError.message);
      res.status(500).json({
        success: false,
        message: `Cannot connect to drone bridge: ${fetchError.message}`,
        suggestion: "Make sure drone bridge is running on port 8001"
      });
    }
  } catch (error) {
    console.error('Emergency stop drone error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate emergency stop',
      error: error.message
    });
  }
});

app.post('/api/v1/test/drone/mission/start/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;
    const { mission_id, waypoints } = req.body;
    
    console.log(`🎯 Testing: Start mission for drone ${droneId}`, { mission_id, waypoints });
    
    // Import required models
    const { Drone } = await import('./models/droneModel.js');
    
    // Find drone
    const drone = await Drone.findOne({ droneId });
    if (!drone) {
      return res.status(404).json({
        success: false,
        message: `Drone ${droneId} not found`
      });
    }
    
    // Send command to drone bridge
    try {
      console.log(`📡 Sending mission start command to drone bridge...`);
      const response = await fetch(`http://127.0.0.1:8001/drone/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId: droneId,
          command: 'start_mission',
          parameters: { waypoints: waypoints }
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Drone bridge response:`, result);
        
        // Update drone status
        await Drone.findOneAndUpdate(
          { droneId },
          { 
            status: 'mission',
            'telemetry.lastUpdate': new Date()
          }
        );
        
        res.status(200).json({
          success: true,
          message: `Mission started for drone ${droneId}`,
          data: { 
            droneId, 
            mission_id, 
            waypoints,
            status: 'mission' 
          },
          droneBridgeResponse: result
        });
      } else {
        console.log(`❌ Drone bridge error: ${response.status} ${response.statusText}`);
        res.status(500).json({
          success: false,
          message: `Failed to send command to drone bridge: ${response.statusText}`,
          suggestion: "Make sure drone bridge is running on port 8001"
        });
      }
    } catch (fetchError) {
      console.log(`❌ Network error connecting to drone bridge:`, fetchError.message);
      res.status(500).json({
        success: false,
        message: `Cannot connect to drone bridge: ${fetchError.message}`,
        suggestion: "Make sure drone bridge is running on port 8001"
      });
    }
  } catch (error) {
    console.error('Start mission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start mission',
      error: error.message
    });
  }
});

// Socket.IO health check endpoint
app.get('/socket.io/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Socket.IO server is running',
    timestamp: new Date().toISOString()
  });
});

// Global error handler (Industry Standard)
app.use((err, req, res, next) => {
  console.error('🔴 Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'Invalid resource identifier',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      error: 'Please login again',
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.stack,
    timestamp: new Date().toISOString()
  });
});

// CSRF error handling
app.use(handleCsrfErrors);

// Start drone discovery service (will be initialized after server starts)
// droneDiscoveryService.start(io); // Moved to index.js after server initialization

export { app };

// Initialize global settings (moved to index.js after database connection)

