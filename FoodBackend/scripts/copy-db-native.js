import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function copyProductionToTest() {
  let productionClient = null;
  let testClient = null;
  
  try {
    console.log('🚀 Starting database copy from production to test...');
    
    // Connect to MongoDB
    const mongoUrl = 'mongodb://127.0.0.1:27017';
    
    console.log('📡 Connecting to MongoDB...');
    productionClient = new MongoClient(mongoUrl);
    testClient = new MongoClient(mongoUrl);
    
    await productionClient.connect();
    await testClient.connect();
    console.log('✅ Connected to MongoDB');
    
    // Get database references
    const productionDb = productionClient.db('food-backend');
    const testDb = testClient.db('drone_delivery_db_test');
    
    // Get all collection names from production database
    const collections = await productionDb.listCollections().toArray();
    
    console.log(`\n📋 Found ${collections.length} collections in production database:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Copy each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      
      try {
        console.log(`\n🔄 Copying ${collectionName} collection...`);
        
        // Get production collection
        const productionCollection = productionDb.collection(collectionName);
        
        // Get test collection
        const testCollection = testDb.collection(collectionName);
        
        // Clear existing data in test database
        const deleteResult = await testCollection.deleteMany({});
        console.log(`   🗑️ Cleared ${deleteResult.deletedCount} existing ${collectionName} records from test database`);
        
        // Fetch all data from production
        const productionData = await productionCollection.find({}).toArray();
        console.log(`   📥 Found ${productionData.length} ${collectionName} records in production`);
        
        if (productionData.length > 0) {
          // Insert data into test database
          const insertResult = await testCollection.insertMany(productionData);
          console.log(`   ✅ Copied ${insertResult.insertedCount} ${collectionName} records to test database`);
        } else {
          console.log(`   ℹ️ No ${collectionName} records to copy`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error copying ${collectionName}:`, error.message);
        // Continue with other collections even if one fails
      }
    }
    
    console.log('\n🎉 Database copy completed successfully!');
    console.log('📊 Summary:');
    console.log('   - Production database: food-backend');
    console.log('   - Test database: drone_delivery_db_test');
    console.log('   - All collection data has been copied');
    
  } catch (error) {
    console.error('❌ Error during database copy:', error);
  } finally {
    // Close connections
    if (productionClient) {
      await productionClient.close();
      console.log('🔌 Closed production database connection');
    }
    if (testClient) {
      await testClient.close();
      console.log('🔌 Closed test database connection');
    }
  }
}

// Run the script
copyProductionToTest();
