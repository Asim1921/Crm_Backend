
const mongoose = require('mongoose');
const User = require('./models/userModel');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-system');
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'asimzaman2000@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists with this email');
      console.log('User ID:', existingAdmin._id);
      console.log('Role:', existingAdmin.role);
      process.exit(0);
    }

    // Create new admin user
    const adminUser = new User({
      firstName: 'Asim',
      lastName: 'Zaman',
      email: 'asimzaman2000@gmail.com',
      password: 'Akinator@123',
      role: 'admin',
      campaign: 'Data',
      isActive: true
    });

    // Save the user (password will be automatically hashed)
    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('User ID:', adminUser._id);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

createAdmin();
