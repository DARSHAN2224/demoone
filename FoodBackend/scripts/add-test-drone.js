import { Drone } from '../src/models/droneModel.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function addTestDrone() {
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

    // Create a test drone with port 8001
    const testDrone = new Drone({
      droneId: 'DRONE-001',
      name: 'Test Drone 001',
      model: 'Generic Test Drone',
      serialNumber: 'SN-TEST-001',
      mavsdkPort: 8001,
      wsUrl: 'ws://localhost:8001/drone',
      capabilities: ['takeoff', 'land', 'navigate'],
      status: 'idle',
      is_active: true,
      registeredAt: new Date()
    });

    // Save the drone
    await testDrone.save();
    console.log('✅ Test drone added successfully:', testDrone);

    // Close connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error adding test drone:', error);
    process.exit(1);
  }
}

addTestDrone();
