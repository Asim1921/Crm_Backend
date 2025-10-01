const mongoose = require('mongoose');
const User = require('../models/userModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_database');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Update users with default extensions
const updateUserExtensions = async () => {
  try {
    console.log('Updating user extensions...');
    
    // Find all users without extensions
    const usersWithoutExtensions = await User.find({
      $or: [
        { extension: { $exists: false } },
        { extension: null },
        { extension: '' }
      ]
    });
    
    console.log(`Found ${usersWithoutExtensions.length} users without extensions`);
    
    // Update each user with a default extension
    for (let i = 0; i < usersWithoutExtensions.length; i++) {
      const user = usersWithoutExtensions[i];
      const defaultExtension = `100${i + 1}`; // 1001, 1002, 1003, etc.
      
      await User.findByIdAndUpdate(user._id, {
        extension: defaultExtension
      });
      
      console.log(`Updated user ${user.email} with extension ${defaultExtension}`);
    }
    
    console.log('All users updated successfully!');
    
    // Show final count
    const totalUsers = await User.countDocuments();
    const usersWithExtensions = await User.countDocuments({ extension: { $exists: true, $ne: null, $ne: '' } });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with extensions: ${usersWithExtensions}`);
    
  } catch (error) {
    console.error('Error updating user extensions:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
connectDB().then(() => {
  updateUserExtensions();
});
