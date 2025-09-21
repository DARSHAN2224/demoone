import mongoose from 'mongoose';
import { DroneOrder } from './src/models/droneOrderModel.js';

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/food-backend');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const testDroneOrderStatus = async () => {
  try {
    await connectDB();
    
    // Find recent drone orders
    const recentOrders = await DroneOrder.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('orderId', 'orderNumber status')
      .populate('sellerId', 'name');
    
    console.log('🔍 Recent Drone Orders:');
    recentOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId?.orderNumber || order.orderId}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Seller: ${order.sellerId?.name || 'Unknown'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log('---');
    });
    
    // Check for pending orders
    const pendingOrders = await DroneOrder.find({ status: 'pending' });
    console.log(`\n📊 Pending Drone Orders: ${pendingOrders.length}`);
    
    // Check for weather blocked orders
    const weatherBlockedOrders = await DroneOrder.find({ status: 'weather_blocked' });
    console.log(`📊 Weather Blocked Orders: ${weatherBlockedOrders.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

testDroneOrderStatus();
