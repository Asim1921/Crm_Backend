const mongoose = require('mongoose');
const Client = require('./models/clientModel');
const User = require('./models/userModel');
require('dotenv').config();

const migrateCampaign = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm');
    console.log('Connected to MongoDB');

    // Update existing clients to have campaign field
    const clientResult = await Client.updateMany(
      { campaign: { $exists: false } },
      { $set: { campaign: 'Data' } }
    );
    console.log(`Updated ${clientResult.modifiedCount} clients with campaign field`);

    // Update existing users to have campaign field
    const userResult = await User.updateMany(
      { campaign: { $exists: false } },
      { $set: { campaign: 'Data' } }
    );
    console.log(`Updated ${userResult.modifiedCount} users with campaign field`);

    // Verify the updates
    const clientsWithoutCampaign = await Client.countDocuments({ campaign: { $exists: false } });
    const usersWithoutCampaign = await User.countDocuments({ campaign: { $exists: false } });
    
    console.log(`Clients without campaign field: ${clientsWithoutCampaign}`);
    console.log(`Users without campaign field: ${usersWithoutCampaign}`);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateCampaign();
