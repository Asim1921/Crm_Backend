const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/userModel');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected...');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Fix admin user
const fixAdminUser = async () => {
  try {
    await connectDB();
    
    console.log('\n🔧 Fixing admin user...\n');
    
    // Delete any existing admin users
    await User.deleteMany({ role: 'admin' });
    console.log('✅ Cleared existing admin users');
    
    // Create new admin user with correct email case
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin123', salt);
    
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'CRM',
      email: 'AdminCrm@gmail.com', // Correct case
      password: hashedPassword,
      role: 'admin'
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminUser.email);
    console.log('🔑 Role:', adminUser.role);
    
    // Test password verification
    const isPasswordValid = await bcrypt.compare('Admin123', adminUser.password);
    console.log('🔒 Password verification test:', isPasswordValid ? '✅ PASSED' : '❌ FAILED');
    
    // Check all users
    const allUsers = await User.find({});
    console.log('\n📊 All users in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n✅ Admin user fixed!');
    console.log('\n🔑 Login Credentials:');
    console.log('📧 Email: AdminCrm@gmail.com');
    console.log('🔒 Password: Admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the fix
fixAdminUser();
