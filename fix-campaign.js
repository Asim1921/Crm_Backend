const mongoose = require('mongoose');
const Client = require('./models/clientModel');
const User = require('./models/userModel');

// Simple script to add campaign field to existing records
async function fixCampaign() {
  try {
    // Connect to your database
    await mongoose.connect('mongodb://localhost:27017/crm');
    console.log('Connected to database');

    // Update all clients that don't have campaign field
    const clientResult = await Client.updateMany(
      { campaign: { $exists: false } },
      { $set: { campaign: 'Data' } }
    );
    console.log(`Updated ${clientResult.modifiedCount} clients`);

    // Update all users that don't have campaign field
    const userResult = await User.updateMany(
      { campaign: { $exists: false } },
      { $set: { campaign: 'Data' } }
    );
    console.log(`Updated ${userResult.modifiedCount} users`);

    console.log('Campaign field fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixCampaign();
