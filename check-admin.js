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

// Check admin user and test login
const checkAdminUser = async () => {
  try {
    await connectDB();
    
    console.log('\n🔍 Checking admin user...\n');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'AdminCrm@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      console.log('\n🔄 Creating admin user...');
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Admin123', salt);
      
      // Create admin user
      const newAdmin = await User.create({
        firstName: 'Admin',
        lastName: 'CRM',
        email: 'AdminCrm@gmail.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email:', newAdmin.email);
      console.log('🔑 Role:', newAdmin.role);
      
      // Test password verification
      const isPasswordValid = await bcrypt.compare('Admin123', newAdmin.password);
      console.log('🔒 Password verification test:', isPasswordValid ? '✅ PASSED' : '❌ FAILED');
      
    } else {
      console.log('✅ Admin user found!');
      console.log('📧 Email:', adminUser.email);
      console.log('🔑 Role:', adminUser.role);
      console.log('📅 Created:', adminUser.createdAt);
      
      // Test password verification
      const isPasswordValid = await bcrypt.compare('Admin123', adminUser.password);
      console.log('🔒 Password verification test:', isPasswordValid ? '✅ PASSED' : '❌ FAILED');
      
      if (!isPasswordValid) {
        console.log('\n🔄 Updating admin password...');
        
        // Update password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123', salt);
        
        adminUser.password = hashedPassword;
        await adminUser.save();
        
        console.log('✅ Admin password updated!');
        
        // Test again
        const newPasswordValid = await bcrypt.compare('Admin123', adminUser.password);
        console.log('🔒 New password verification test:', newPasswordValid ? '✅ PASSED' : '❌ FAILED');
      }
    }
    
    // Check all users
    const allUsers = await User.find({});
    console.log('\n📊 All users in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n✅ Admin user check completed!');
    console.log('\n🔑 Login Credentials:');
    console.log('📧 Email: AdminCrm@gmail.com');
    console.log('🔒 Password: Admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the check
checkAdminUser();
