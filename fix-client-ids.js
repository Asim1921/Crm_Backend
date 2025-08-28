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

const generateUniqueClientId = async () => {
  let clientId;
  let isUnique = false;
  
  while (!isUnique) {
    clientId = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if this ID already exists
    const existingClient = await Client.findOne({ clientId });
    if (!existingClient) {
      isUnique = true;
    }
  }
  
  return clientId;
};

const fixClientIds = async () => {
  try {
    await connectDB();

    // Find all clients
    const clients = await Client.find({});
    console.log(`Found ${clients.length} clients to check`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      // Check if client has a valid clientId
      if (!client.clientId || client.clientId.length !== 6 || isNaN(client.clientId)) {
        // Generate a new unique clientId
        const newClientId = await generateUniqueClientId();
        
        // Update the client with the new ID
        await Client.findByIdAndUpdate(client._id, { clientId: newClientId });
        
        console.log(`Fixed client ${client.firstName} ${client.lastName} (${client._id}): ${client.clientId || 'MISSING'} -> ${newClientId}`);
        fixedCount++;
      } else {
        // Check if this clientId is unique
        const duplicateClients = await Client.find({ clientId: client.clientId });
        if (duplicateClients.length > 1) {
          // This clientId is duplicated, generate a new one
          const newClientId = await generateUniqueClientId();
          
          // Update this specific client with the new ID
          await Client.findByIdAndUpdate(client._id, { clientId: newClientId });
          
          console.log(`Fixed duplicate clientId for ${client.firstName} ${client.lastName} (${client._id}): ${client.clientId} -> ${newClientId}`);
          fixedCount++;
        } else {
          console.log(`Client ${client.firstName} ${client.lastName} (${client._id}) has valid clientId: ${client.clientId}`);
          skippedCount++;
        }
      }
    }

    console.log(`\nMigration completed:`);
    console.log(`- Fixed: ${fixedCount} clients`);
    console.log(`- Skipped: ${skippedCount} clients`);
    console.log(`- Total: ${clients.length} clients`);

    // Verify all clients now have unique IDs
    const allClients = await Client.find({});
    const clientIds = allClients.map(c => c.clientId);
    const uniqueIds = new Set(clientIds);
    
    if (clientIds.length === uniqueIds.size) {
      console.log(`✅ All clients have unique IDs!`);
    } else {
      console.log(`❌ Found ${clientIds.length - uniqueIds.size} duplicate IDs!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

fixClientIds();
