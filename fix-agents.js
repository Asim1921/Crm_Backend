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

// Fix agent users
const fixAgentUsers = async () => {
  try {
    await connectDB();
    
    console.log('\n🔧 Fixing agent users...\n');
    
    const agentEmails = [
      'agent1@crm.com',
      'agent2@crm.com',
      'agent3@crm.com',
      'agent4@crm.com',
      'agent5@crm.com'
    ];

    // Delete existing agent users
    await User.deleteMany({ role: 'agent' });
    console.log('✅ Cleared existing agent users');
    
    const agents = [];
    
    for (let i = 0; i < agentEmails.length; i++) {
      // Create agent user with proper password
      const agent = await User.create({
        firstName: `Agent${i + 1}`,
        lastName: 'CRM',
        email: agentEmails[i],
        password: 'Agent123', // Will be hashed by pre-save hook
        role: 'agent'
      });
      
      agents.push(agent);
      console.log(`✅ Created ${agent.email}`);
    }
    
    console.log(`\n✅ ${agents.length} agent users created successfully!`);
    
    // Test password verification for each agent
    console.log('\n🔒 Testing password verification:');
    for (const agent of agents) {
      const isPasswordValid = await agent.matchPassword('Agent123');
      console.log(`${agent.email}: ${isPasswordValid ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    // Check all users
    const allUsers = await User.find({});
    console.log('\n📊 All users in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role})`);
    });
    
    console.log('\n✅ Agent users fixed!');
    console.log('\n🔑 Agent Login Credentials:');
    agents.forEach((agent, index) => {
      console.log(`📧 Email: ${agent.email}`);
      console.log(`🔒 Password: Agent123`);
      if (index < agents.length - 1) console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
};

// Run the fix
fixAgentUsers();
