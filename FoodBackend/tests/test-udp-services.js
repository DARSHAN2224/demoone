const dgram = require('dgram');

// Test UDP Command Service (sending commands)
const testCommandService = async () => {
    console.log('🧪 Testing UDP Command Service...');
    
    const client = dgram.createSocket('udp4');
    
    // Test command
    const testCommand = {
        command: 'takeoff',
        droneId: 'DRONE-007',
        altitude: 15
    };
    
    const message = Buffer.from(JSON.stringify(testCommand));
    
    client.send(message, 5006, '127.0.0.1', (err) => {
        if (err) {
            console.error('❌ Error sending test command:', err);
        } else {
            console.log('✅ Test command sent successfully:', testCommand);
        }
        client.close();
    });
};

// Test UDP Telemetry Service (receiving telemetry)
const testTelemetryService = async () => {
    console.log('🧪 Testing UDP Telemetry Service...');
    
    const client = dgram.createSocket('udp4');
    
    // Test telemetry data
    const testTelemetry = {
        droneId: 'DRONE-999',
        lat: 40.7128,
        lng: -74.0060,
        alt: 50,
        battery: 95,
        mode: 'GUIDED',
        armed: false
    };
    
    const message = Buffer.from(JSON.stringify(testTelemetry));
    
    client.send(message, 5005, '127.0.0.1', (err) => {
        if (err) {
            console.error('❌ Error sending test telemetry:', err);
        } else {
            console.log('✅ Test telemetry sent successfully:', testTelemetry);
        }
        client.close();
    });
};

// Run tests
const runTests = async () => {
    console.log('🚀 Starting UDP Services Test...\n');
    
    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testCommandService();
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testTelemetryService();
    
    console.log('\n✅ UDP Services Test completed!');
    console.log('\n📋 Instructions for manual testing:');
    console.log('1. Start your Node.js backend server');
    console.log('2. Open a terminal and run: nc -ul -p 5006 (to listen for commands)');
    console.log('3. Open another terminal and run: echo \'{"droneId": "DRONE-999", "lat": 40.7128, "lng": -74.0060, "alt": 50, "battery": 95, "mode": "GUIDED", "armed": false}\' | nc -u -w0 127.0.0.1 5005');
    console.log('4. Trigger an API endpoint from your frontend to test command sending');
};

runTests().catch(console.error);
