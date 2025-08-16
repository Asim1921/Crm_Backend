const mongoose = require('mongoose');
const User = require('./models/userModel');
const Client = require('./models/clientModel');
const Task = require('./models/taskModel');
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

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await Task.deleteMany({});

    // Create test users
    const adminUser = await User.create({
      firstName: 'John',
      lastName: 'Anderson',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin'
    });

    const agentUser = await User.create({
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'agent@example.com',
      password: 'password123',
      role: 'agent'
    });

    // Create test clients
    const clients = await Client.create([
      {
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'mj.johnson@email.com',
        phone: '+1 555 0123',
        country: 'United States',
        status: 'New Lead',
        assignedAgent: agentUser._id,
        value: 5000
      },
      {
        firstName: 'Emma',
        lastName: 'Martinez',
        email: 'em.martinez@email.com',
        phone: '+1 555 0124',
        country: 'Canada',
        status: 'Call Again',
        assignedAgent: agentUser._id,
        value: 7500
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'db.brown@email.com',
        phone: '+1 555 0125',
        country: 'Australia',
        status: 'FTD',
        assignedAgent: agentUser._id,
        value: 12000
      },
      {
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lg.garcia@email.com',
        phone: '+1 555 0126',
        country: 'United Kingdom',
        status: 'No Answer',
        assignedAgent: agentUser._id,
        value: 3000
      }
    ]);

    // Create test tasks
    await Task.create([
      {
        title: 'Initial Consultation',
        description: 'Schedule initial consultation call',
        client: clients[0]._id,
        assignedTo: agentUser._id,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Follow-up Meeting',
        description: 'Follow up on previous discussion',
        client: clients[1]._id,
        assignedTo: agentUser._id,
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Document Review',
        description: 'Review submitted documents',
        client: clients[2]._id,
        assignedTo: agentUser._id,
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(),
        createdBy: adminUser._id
      }
    ]);

    console.log('Seed data created successfully!');
    console.log('Test users:');
    console.log('Admin: admin@example.com / password123');
    console.log('Agent: agent@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
