#!/usr/bin/env node
/**
 * Test script to verify enhanced logging is working
 * Run this to test the backend logging functionality
 */
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8000/api/v1/test/drone';

async function testLogging() {
    console.log('🧪 Testing Enhanced Backend Logging');
    console.log('=' * 50);
    
    try {
        // Test 1: Health Check
        console.log('\n📋 Test 1: Health Check');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('Health Response:', healthData);
        
        // Test 2: Launch Command (will fail if drone bridge not running)
        console.log('\n📋 Test 2: Launch Command');
        try {
            const launchResponse = await fetch(`${BASE_URL}/test/launch/TEST-ORDER-001`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-admin-token', // You'll need a real token
                    'X-Test-Mode': 'true'
                },
                body: JSON.stringify({
                    droneId: 'DRONE-001',
                    altitude: 20,
                    useRealOrder: false
                })
            });
            
            const launchData = await launchResponse.json();
            console.log('Launch Response:', launchData);
        } catch (error) {
            console.log('Launch Test (Expected to fail):', error.message);
        }
        
        // Test 3: Land Command
        console.log('\n📋 Test 3: Land Command');
        try {
            const landResponse = await fetch(`${BASE_URL}/test/land/DRONE-001`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-admin-token',
                    'X-Test-Mode': 'true'
                }
            });
            
            const landData = await landResponse.json();
            console.log('Land Response:', landData);
        } catch (error) {
            console.log('Land Test (Expected to fail):', error.message);
        }
        
        console.log('\n✅ Logging test completed!');
        console.log('Check the backend terminal for enhanced logs with colors and emojis.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testLogging();
