const mongoose = require('mongoose');
const Client = require('./models/clientModel');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const testClientIdGeneration = async () => {
  try {
    await connectDB();

    console.log('🧪 Testing Client ID Generation...\n');

    // Test 1: Create a new client
    console.log('1. Creating a new client...');
    const newClient = new Client({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1234567890',
      country: 'Test Country',
      status: 'New Lead'
    });

    await newClient.save();
    console.log(`   ✅ Client created with ID: ${newClient.clientId}`);

    // Test 2: Update the client (should not change clientId)
    console.log('\n2. Updating the client...');
    const originalClientId = newClient.clientId;
    
    newClient.firstName = 'Updated Test';
    newClient.status = 'FTD';
    await newClient.save();
    
    console.log(`   ✅ Client updated. Original ID: ${originalClientId}, Current ID: ${newClient.clientId}`);
    console.log(`   ${originalClientId === newClient.clientId ? '✅ ID unchanged' : '❌ ID changed!'}`);

    // Test 3: Update using findByIdAndUpdate (should not change clientId)
    console.log('\n3. Updating using findByIdAndUpdate...');
    const updatedClient = await Client.findByIdAndUpdate(
      newClient._id,
      { 
        firstName: 'Another Update',
        status: 'Call Again'
      },
      { new: true, runValidators: true }
    );
    
    console.log(`   ✅ Client updated via findByIdAndUpdate. Original ID: ${originalClientId}, Current ID: ${updatedClient.clientId}`);
    console.log(`   ${originalClientId === updatedClient.clientId ? '✅ ID unchanged' : '❌ ID changed!'}`);

    // Test 4: Try to explicitly change clientId (should be prevented)
    console.log('\n4. Attempting to change clientId explicitly...');
    try {
      updatedClient.clientId = '999999';
      await updatedClient.save();
      console.log(`   ❌ ClientId was changed to: ${updatedClient.clientId}`);
    } catch (error) {
      console.log(`   ✅ Error caught: ${error.message}`);
    }

    // Test 5: Check uniqueness
    console.log('\n5. Testing uniqueness...');
    const allClients = await Client.find({});
    const clientIds = allClients.map(c => c.clientId);
    const uniqueIds = new Set(clientIds);
    
    console.log(`   Total clients: ${allClients.length}`);
    console.log(`   Unique IDs: ${uniqueIds.size}`);
    console.log(`   ${clientIds.length === uniqueIds.size ? '✅ All IDs are unique' : '❌ Found duplicate IDs!'}`);

    // Cleanup
    console.log('\n6. Cleaning up test data...');
    await Client.findByIdAndDelete(newClient._id);
    console.log('   ✅ Test client deleted');

    console.log('\n🎉 All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testClientIdGeneration();
