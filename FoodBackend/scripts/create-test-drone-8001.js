import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Drone Schema (complete with all required fields)
const droneSchema = new mongoose.Schema({
  droneId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true
  },
  mavsdkPort: {
    type: Number,
    required: true
  },
  wsUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['idle', 'assigned', 'launching', 'in_flight', 'delivering', 'returning', 'landing', 'maintenance', 'emergency_stop'],
    default: 'idle'
  },
  battery: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  batteryLevel: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  altitude: {
    type: Number,
    default: 0,
    min: 0
  },
  speed: {
    type: Number,
    default: 0,
    min: 0
  },
  heading: {
    type: Number,
    default: 0,
    min: 0,
    max: 360
  },
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  capabilities: [{
    type: String,
    enum: ['takeoff', 'land', 'navigate', 'hover', 'return_to_launch', 'emergency_stop']
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  telemetry: {
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

const Drone = mongoose.model('Drone', droneSchema);

async function createTestDrone8001() {
  try {
    // Connect to MongoDB - respect NODE_ENV
    const MONGODB_URL = 'mongodb://127.0.0.1:27017';
    const DB_NAME = process.env.NODE_ENV === 'test' ? 'drone_delivery_db_test' : 'food-backend';
    
    console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`🔍 Using database: ${DB_NAME}`);
    
    await mongoose.connect(`${MONGODB_URL}/${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');

    // Check if test drone already exists
    const existingDrone = await Drone.findOne({ droneId: 'DRONE-001' });
    if (existingDrone) {
      console.log('⚠️ Test drone DRONE-001 already exists');
      console.log('🚁 Drone ID: DRONE-001');
      console.log('📊 Status:', existingDrone.status);
      console.log('🔋 Battery:', existingDrone.battery + '%');
      console.log('🔌 MAVSDK Port:', existingDrone.mavsdkPort);
      console.log('🌐 WebSocket URL:', existingDrone.wsUrl);
      return;
    }

    // Create test drone with port 8001
    const testDrone = new Drone({
      droneId: 'DRONE-001',
      name: 'Test Drone Alpha',
      model: 'Generic Quadcopter v2.0',
      serialNumber: 'SN-TEST-001-ALPHA',
      mavsdkPort: 8001,
      wsUrl: 'ws://localhost:8001/drone',
      status: 'idle',
      battery: 100,
      batteryLevel: 100,
      location: {
        type: 'Point',
        coordinates: [-122.1401649, 47.6414678] // Seattle coordinates
      },
      altitude: 0,
      speed: 0,
      heading: 0,
      currentOrderId: null,
      capabilities: ['takeoff', 'land', 'navigate', 'hover', 'return_to_launch', 'emergency_stop'],
      is_active: true,
      registeredAt: new Date(),
      telemetry: {
        lastUpdate: new Date()
      }
    });

    await testDrone.save();
    console.log('✅ Test drone created successfully!');
    console.log('🚁 Drone ID: DRONE-001');
    console.log('📊 Status: idle');
    console.log('🔋 Battery: 100%');
    console.log('🔌 MAVSDK Port: 8001');
    console.log('🌐 WebSocket URL: ws://localhost:8001/drone');
    console.log('📍 Location: Seattle (47.6414678, -122.1401649)');
    console.log('🎯 Capabilities: takeoff, land, navigate, hover, return_to_launch, emergency_stop');
    console.log('\n🎉 Test drone is ready for testing with port 8001!');

  } catch (error) {
    console.error('❌ Error creating test drone:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createTestDrone8001();
