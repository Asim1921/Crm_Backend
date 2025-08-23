const mongoose = require('mongoose');
const Client = require('./models/clientModel');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to generate a unique client ID
const generateClientId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to check if client ID already exists
const isClientIdUnique = async (clientId) => {
  const existingClient = await Client.findOne({ clientId });
  return !existingClient;
};

// Function to generate a unique client ID
const generateUniqueClientId = async () => {
  let clientId;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    clientId = generateClientId();
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Unable to generate unique client ID after maximum attempts');
    }
  } while (!(await isClientIdUnique(clientId)));

  return clientId;
};

// Migration function
const migrateClientIds = async () => {
  try {
    console.log('Starting client ID migration...');

    // Find all clients without clientId
    const clientsWithoutId = await Client.find({ clientId: { $exists: false } });
    console.log(`Found ${clientsWithoutId.length} clients without client ID`);

    if (clientsWithoutId.length === 0) {
      console.log('All clients already have client IDs. Migration complete.');
      return;
    }

    // Update each client with a unique client ID
    for (const client of clientsWithoutId) {
      const clientId = await generateUniqueClientId();
      await Client.findByIdAndUpdate(client._id, { clientId });
      console.log(`Updated client ${client.firstName} ${client.lastName} with ID: ${clientId}`);
    }

    console.log('Client ID migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run migration
migrateClientIds();
