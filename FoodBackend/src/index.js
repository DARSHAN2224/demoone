import dotenv from "dotenv"
import connectDB from "./db/index.js";
import {app} from './app.js'
import http from 'http';

import { initSocket, getIo } from './services/socket.js';
import RawWebSocketServer from './services/rawWebSocketServer.js';
import { initializeTelemetryService } from './services/droneTelemetryService.js';
import { droneDiscoveryService } from './services/droneDiscoveryService.js';
import { seedStaticPages } from './utils/seedStaticPages.js';
import Settings from './models/settingsModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the root directory
dotenv.config({ path: path.join(__dirname, '../../.env') })

connectDB()
.then(() => {
    const server = http.createServer(app);
    initSocket(server);
    
    // Initialize raw WebSocket server for drone bridge connections
    const rawWebSocketServer = new RawWebSocketServer(server);
    rawWebSocketServer.initialize();
    
    // Initialize drone telemetry service after Socket.IO
    initializeTelemetryService();
    
    // Start drone discovery service
    const io = getIo();
    droneDiscoveryService.start(io);
    
    // Seed static pages if missing
    seedStaticPages();
    
    // Initialize global settings after database connection
    (async () => {
        try { 
            await Settings.initialize(); 
            console.log('⚙️ Global settings initialized');
        } catch (error) {
            console.error('❌ Failed to initialize settings:', error.message);
        }
    })();
    
    server.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️ Server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
})
