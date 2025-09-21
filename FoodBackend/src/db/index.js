import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        // Use the test database name if NODE_ENV is 'test', otherwise use the main DB_NAME
        const dbNameToUse = process.env.NODE_ENV === 'test' 
            ? 'drone_delivery_db_test' // Dedicated test database
            : DB_NAME; // Main application database

        // Get MongoDB URL from environment or use default
        let mongoUrl = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017';
        
        // Clean up the URL - remove any trailing slashes and invalid characters
        mongoUrl = mongoUrl.replace(/\/$/, ''); // Remove trailing slash
        
        // Check if URL already contains a database name (has a path after the port)
        const urlParts = mongoUrl.split('/');
        const hasDatabase = urlParts.length > 3 && urlParts[3] && !urlParts[3].includes('?');
        
        // If no database specified, append our chosen database name
        if (!hasDatabase) {
            mongoUrl = `${mongoUrl}/${dbNameToUse}`;
        }
        
        const environment = process.env.NODE_ENV === 'test' ? 'TEST' : 'MAIN';
        console.log(`🔌 Connecting to MongoDB (${environment}): ${mongoUrl.replace(/\/\/.*@/, '//***:***@')}`); // Mask credentials in logs
        
        const connectionInstance = await mongoose.connect(mongoUrl);
        console.log(`✅ Connected to MongoDB ${connectionInstance.connection.host} (${environment} DB: ${dbNameToUse})`);
    } catch (error) {
        console.error('❌ MONGODB connection FAILED:', error);
        console.error('❌ MONGODB_URL:', process.env.MONGODB_URL);
        console.error('❌ NODE_ENV:', process.env.NODE_ENV);
        process.exit(1);
    }
}

export default connectDB;
