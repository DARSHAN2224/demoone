// Database cleanup script to remove multiple refresh tokens
// Run this script to clean up existing multiple tokens in the database

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/userModel.js';
import { Seller } from '../src/models/sellerModel.js';
import { Admin } from '../src/models/adminModel.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const cleanupTokens = async () => {
  try {
    console.log('🧹 Starting token cleanup...');
    
    // Clean up User tokens
    const usersWithMultipleTokens = await User.find({
      $expr: { $gt: [{ $size: "$refreshTokens" }, 1] }
    });
    
    console.log(`📊 Found ${usersWithMultipleTokens.length} users with multiple tokens`);
    
    for (const user of usersWithMultipleTokens) {
      console.log(`🧹 Cleaning up user: ${user.email} (${user.refreshTokens.length} tokens)`);
      await User.findByIdAndUpdate(user._id, { $set: { refreshTokens: [] } });
    }
    
    // Clean up Seller tokens
    const sellersWithMultipleTokens = await Seller.find({
      $expr: { $gt: [{ $size: "$refreshTokens" }, 1] }
    });
    
    console.log(`📊 Found ${sellersWithMultipleTokens.length} sellers with multiple tokens`);
    
    for (const seller of sellersWithMultipleTokens) {
      console.log(`🧹 Cleaning up seller: ${seller.email} (${seller.refreshTokens.length} tokens)`);
      await Seller.findByIdAndUpdate(seller._id, { $set: { refreshTokens: [] } });
    }
    
    // Clean up Admin tokens
    const adminsWithMultipleTokens = await Admin.find({
      $expr: { $gt: [{ $size: "$refreshTokens" }, 1] }
    });
    
    console.log(`📊 Found ${adminsWithMultipleTokens.length} admins with multiple tokens`);
    
    for (const admin of adminsWithMultipleTokens) {
      console.log(`🧹 Cleaning up admin: ${admin.email} (${admin.refreshTokens.length} tokens)`);
      await Admin.findByIdAndUpdate(admin._id, { $set: { refreshTokens: [] } });
    }
    
    console.log('✅ Token cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Token cleanup failed:', error);
  }
};

const main = async () => {
  await connectDB();
  await cleanupTokens();
  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
  process.exit(0);
};

main().catch(console.error);
