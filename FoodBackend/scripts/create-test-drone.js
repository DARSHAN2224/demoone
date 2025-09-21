import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Drone Schema (import from model)
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
  telemetry: {
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

const Drone = mongoose.model('Drone', droneSchema);

async function createTestDrone() {
  try {
    // Connect to MongoDB
    const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/food-drone';
    
    await mongoose.connect(MONGODB_URL, {
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
      console.log('📍 Location:', existingDrone.location.coordinates);
      return;
    }

    // Create test drone
    const testDrone = new Drone({
      droneId: 'DRONE-001',
      name: 'Test Drone',
      model: 'Generic Quadcopter',
      status: 'idle',
      battery: 100,
      location: {
        type: 'Point',
        coordinates: [-122.1401649, 47.6414678] // Seattle coordinates
      },
      altitude: 0,
      speed: 0,
      heading: 0,
      currentOrderId: null,
      telemetry: {
        lastUpdate: new Date()
      }
    });

    await testDrone.save();
    console.log('✅ Test drone created successfully!');
    console.log('🚁 Drone ID: DRONE-001');
    console.log('📊 Status: idle');
    console.log('🔋 Battery: 100%');
    console.log('📍 Location: Seattle (47.6414678, -122.1401649)');
    console.log('\n🎉 You can now test drone commands using the PowerShell script!');

  } catch (error) {
    console.error('❌ Error creating test drone:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the function
createTestDrone();
