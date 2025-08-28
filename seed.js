const mongoose = require('mongoose');
const User = require('./models/userModel');
const Client = require('./models/clientModel');
const Task = require('./models/taskModel');
const Communication = require('./models/communicationModel');
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
    await Communication.deleteMany({});

    // Create admin user
    const adminUser = await User.create({
      firstName: 'John',
      lastName: 'Anderson',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      phone: '+1 (555) 123-4567',
      bio: 'Experienced CRM administrator with 5+ years in client relationship management.',
      company: 'CRM Platform',
      title: 'Senior Administrator',
      location: 'New York, NY'
    });

    // Create agent users
    const agentUser1 = await User.create({
      firstName: 'Sarah',
      lastName: 'Wilson',
      email: 'agent@example.com',
      password: 'password123',
      role: 'agent',
      phone: '+1 (555) 234-5678',
      bio: 'Dedicated CRM agent specializing in client onboarding and relationship building.',
      company: 'CRM Platform',
      title: 'Senior Agent',
      location: 'Los Angeles, CA'
    });

    const agentUser2 = await User.create({
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'agent2@example.com',
      password: 'password123',
      role: 'agent',
      phone: '+1 (555) 345-6789',
      bio: 'Results-driven agent with expertise in lead generation and conversion.',
      company: 'CRM Platform',
      title: 'Lead Agent',
      location: 'Chicago, IL'
    });

    const agentUser3 = await User.create({
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'agent3@example.com',
      password: 'password123',
      role: 'agent',
      phone: '+1 (555) 456-7890',
      bio: 'Customer-focused agent with strong communication and problem-solving skills.',
      company: 'CRM Platform',
      title: 'Junior Agent',
      location: 'Miami, FL'
    });

    // Create comprehensive test clients
    const clients = await Client.create([
      {
        firstName: 'Michael',
        lastName: 'Johnson',
        email: 'mj.johnson@email.com',
        phone: '+1 555 0123',
        country: 'United States',
        status: 'New Lead',
        assignedAgent: agentUser1._id,
        value: 5000,
        notes: [{
          content: 'Initial contact made. Client showed interest in our services.',
          createdBy: agentUser1._id,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tags: ['high-value', 'tech']
      },
      {
        firstName: 'Emma',
        lastName: 'Martinez',
        email: 'em.martinez@email.com',
        phone: '+1 555 0124',
        country: 'Canada',
        status: 'Call Again',
        assignedAgent: agentUser1._id,
        value: 7500,
        notes: [{
          content: 'Client requested more information about pricing.',
          createdBy: agentUser1._id,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        tags: ['follow-up', 'finance']
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'db.brown@email.com',
        phone: '+1 555 0125',
        country: 'Australia',
        status: 'FTD',
        assignedAgent: agentUser2._id,
        value: 12000,
        notes: [{
          content: 'Client successfully made first deposit.',
          createdBy: agentUser2._id,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        tags: ['ftd', 'premium']
      },
      {
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lg.garcia@email.com',
        phone: '+1 555 0126',
        country: 'United Kingdom',
        status: 'No Answer',
        assignedAgent: agentUser2._id,
        value: 3000,
        notes: [{
          content: 'Called twice, no answer. Will try again tomorrow.',
          createdBy: agentUser2._id,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        tags: ['no-answer', 'retry']
      },
      {
        firstName: 'Robert',
        lastName: 'Taylor',
        email: 'rt.taylor@email.com',
        phone: '+1 555 0127',
        country: 'Germany',
        status: 'Not Interested',
        assignedAgent: agentUser3._id,
        value: 0,
        notes: [{
          content: 'Client declined our offer after detailed discussion.',
          createdBy: agentUser3._id,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        tags: ['declined', 'europe']
      },
      {
        firstName: 'Jennifer',
        lastName: 'White',
        email: 'jw.white@email.com',
        phone: '+1 555 0128',
        country: 'United States',
        status: 'FTD',
        assignedAgent: agentUser3._id,
        value: 8000,
        notes: [{
          content: 'Excellent client, very responsive and professional.',
          createdBy: agentUser3._id,
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        tags: ['ftd', 'responsive']
      },
      {
        firstName: 'James',
        lastName: 'Miller',
        email: 'jm.miller@email.com',
        phone: '+1 555 0129',
        country: 'Canada',
        status: 'Call Again',
        assignedAgent: agentUser1._id,
        value: 4500,
        notes: [{
          content: 'Client needs time to think about the proposal.',
          createdBy: agentUser1._id,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tags: ['considering', 'follow-up']
      },
      {
        firstName: 'Amanda',
        lastName: 'Clark',
        email: 'ac.clark@email.com',
        phone: '+1 555 0130',
        country: 'Australia',
        status: 'New Lead',
        assignedAgent: agentUser2._id,
        value: 6000,
        notes: [{
          content: 'New lead from website contact form.',
          createdBy: agentUser2._id,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        tags: ['new-lead', 'website']
      },
      {
        firstName: 'Christopher',
        lastName: 'Lee',
        email: 'cl.lee@email.com',
        phone: '+1 555 0131',
        country: 'United Kingdom',
        status: 'Hang Up',
        assignedAgent: agentUser3._id,
        value: 0,
        notes: [{
          content: 'Client hung up during the call.',
          createdBy: agentUser3._id,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        tags: ['hang-up', 'unresponsive']
      },
      {
        firstName: 'Maria',
        lastName: 'Rodriguez',
        email: 'mr.rodriguez@email.com',
        phone: '+1 555 0132',
        country: 'Spain',
        status: 'FTD',
        assignedAgent: agentUser1._id,
        value: 9500,
        notes: [{
          content: 'Successful conversion after multiple follow-ups.',
          createdBy: agentUser1._id,
          createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        tags: ['ftd', 'persistent']
      },
      {
        firstName: 'Sarah',
        lastName: 'Anderson',
        email: 'sa.anderson@email.com',
        phone: '+1 555 0133',
        country: 'United States',
        status: 'FTD RETENTION',
        assignedAgent: agentUser2._id,
        value: 15000,
        notes: [{
          content: 'Client made additional deposits after initial FTD. Excellent retention.',
          createdBy: agentUser2._id,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tags: ['ftd-retention', 'high-value']
      },
      {
        firstName: 'Thomas',
        lastName: 'Wilson',
        email: 'tw.wilson@email.com',
        phone: '+1 555 0134',
        country: 'Canada',
        status: 'No Answer',
        assignedAgent: agentUser3._id,
        value: 2000,
        notes: [{
          content: 'Multiple attempts to contact, no response received.',
          createdBy: agentUser3._id,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }],
        lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        tags: ['no-response', 'unreachable']
      }
    ]);

    // Create comprehensive test tasks
    await Task.create([
      {
        title: 'Initial Consultation',
        description: 'Schedule initial consultation call with Michael Johnson',
        client: clients[0]._id,
        assignedTo: agentUser1._id,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Follow-up Meeting',
        description: 'Follow up on previous discussion with Emma Martinez',
        client: clients[1]._id,
        assignedTo: agentUser1._id,
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Document Review',
        description: 'Review submitted documents for David Brown',
        client: clients[2]._id,
        assignedTo: agentUser2._id,
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        completedAt: new Date(),
        createdBy: adminUser._id
      },
      {
        title: 'Retry Call',
        description: 'Retry calling Lisa Garcia - previous attempts unsuccessful',
        client: clients[3]._id,
        assignedTo: agentUser2._id,
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Proposal Preparation',
        description: 'Prepare detailed proposal for James Miller',
        client: clients[6]._id,
        assignedTo: agentUser1._id,
        status: 'in-progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        createdBy: adminUser._id
      },
      {
        title: 'Welcome Call',
        description: 'Welcome call for new client Amanda Clark',
        client: clients[7]._id,
        assignedTo: agentUser2._id,
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        createdBy: adminUser._id
      },
      {
        title: 'Account Review',
        description: 'Monthly account review for Jennifer White',
        client: clients[5]._id,
        assignedTo: agentUser3._id,
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdBy: adminUser._id
      },
      {
        title: 'Follow-up Call',
        description: 'Follow-up call for Maria Rodriguez',
        client: clients[9]._id,
        assignedTo: agentUser1._id,
        status: 'overdue',
        priority: 'high',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdBy: adminUser._id
      }
    ]);

    // Create communication data
    const communications = await Communication.create([
      {
        type: 'call',
        client: clients[0]._id,
        agent: agentUser1._id,
        direction: 'outbound',
        channel: 'voip',
        phoneNumber: clients[0].phone,
        status: 'completed',
        duration: 300, // 5 minutes
        notes: 'Successful initial call. Client interested in premium package.',
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        type: 'message',
        client: clients[1]._id,
        agent: agentUser1._id,
        direction: 'outbound',
        channel: 'whatsapp',
        content: 'Hi Emma! Thanks for your interest. I\'ve sent you our latest brochure. Let me know if you have any questions!',
        status: 'completed',
        completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        type: 'email',
        client: clients[2]._id,
        agent: agentUser2._id,
        direction: 'outbound',
        channel: 'email',
        subject: 'Welcome to Our Platform - David Brown',
        content: 'Dear David, Welcome to our platform! We\'re excited to have you on board. Here\'s your account information...',
        email: clients[2].email,
        status: 'completed',
        completedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        type: 'call',
        client: clients[3]._id,
        agent: agentUser2._id,
        direction: 'outbound',
        channel: 'phone',
        phoneNumber: clients[3].phone,
        status: 'in-progress',
        duration: 120, // 2 minutes
        createdAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      },
      {
        type: 'message',
        client: clients[4]._id,
        agent: agentUser3._id,
        direction: 'outbound',
        channel: 'telegram',
        content: 'Hello Robert! I wanted to follow up on our previous discussion. Are you still interested in our services?',
        status: 'completed',
        completedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        createdAt: new Date(Date.now() - 45 * 60 * 1000)
      },
      {
        type: 'email',
        client: clients[5]._id,
        agent: agentUser3._id,
        direction: 'outbound',
        channel: 'email',
        subject: 'Monthly Report - Jennifer White',
        content: 'Hi Jennifer, Here\'s your monthly activity report. Your account shows excellent engagement...',
        email: clients[5].email,
        status: 'completed',
        completedAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        createdAt: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        type: 'call',
        client: clients[6]._id,
        agent: agentUser1._id,
        direction: 'inbound',
        channel: 'voip',
        phoneNumber: clients[6].phone,
        status: 'completed',
        duration: 450, // 7.5 minutes
        notes: 'Inbound call from James. Discussed pricing options.',
        completedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        createdAt: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        type: 'message',
        client: clients[7]._id,
        agent: agentUser2._id,
        direction: 'outbound',
        channel: 'whatsapp',
        content: 'Welcome Amanda! We\'re thrilled to have you join our platform. Here\'s a quick guide to get you started...',
        status: 'completed',
        completedAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        createdAt: new Date(Date.now() - 20 * 60 * 1000)
      }
    ]);

    console.log('✅ Comprehensive seed data created successfully!');
    console.log('\n📊 Data Summary:');
    console.log(`👥 Users: ${await User.countDocuments()} (1 Admin, 3 Agents)`);
    console.log(`👤 Clients: ${await Client.countDocuments()} (Various statuses)`);
    console.log(`📋 Tasks: ${await Task.countDocuments()} (Various priorities and statuses)`);
    console.log(`📞 Communications: ${await Communication.countDocuments()} (Calls, Messages, Emails)`);
    console.log('\n🔑 Test Login Credentials:');
    console.log('Admin: admin@example.com / password123');
    console.log('Agent 1: agent@example.com / password123');
    console.log('Agent 2: mike@example.com / password123');
    console.log('Agent 3: emma@example.com / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
