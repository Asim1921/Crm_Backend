const mongoose = require('mongoose');
const Client = require('./models/clientModel');
const User = require('./models/userModel');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected for seeding...');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Generate random phone number
const generatePhoneNumber = () => {
  const countryCodes = ['+1', '+44', '+91', '+86', '+81', '+49', '+33', '+39', '+34', '+7'];
  const countryCode = countryCodes[Math.floor(Math.random() * countryCodes.length)];
  const phoneNumber = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${countryCode}${phoneNumber}`;
};

// Generate random email
const generateEmail = (firstName, lastName) => {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}@${domain}`;
};

// Sample data arrays
const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Jessica', 'Robert', 'Amanda',
  'William', 'Ashley', 'Christopher', 'Stephanie', 'Daniel', 'Nicole', 'Matthew', 'Elizabeth', 'Anthony', 'Helen',
  'Mark', 'Deborah', 'Donald', 'Lisa', 'Steven', 'Nancy', 'Paul', 'Karen', 'Andrew', 'Betty',
  'Joshua', 'Sandra', 'Kenneth', 'Donna', 'Kevin', 'Carol', 'Brian', 'Ruth', 'George', 'Sharon',
  'Timothy', 'Michelle', 'Ronald', 'Laura', 'Jason', 'Emily', 'Edward', 'Deborah', 'Jeffrey', 'Dorothy',
  'Ryan', 'Lisa', 'Jacob', 'Nancy', 'Gary', 'Karen', 'Nicholas', 'Betty', 'Eric', 'Helen',
  'Jonathan', 'Sandra', 'Stephen', 'Donna', 'Larry', 'Carol', 'Justin', 'Ruth', 'Scott', 'Sharon',
  'Brandon', 'Michelle', 'Benjamin', 'Laura', 'Frank', 'Sarah', 'Gregory', 'Deborah', 'Raymond', 'Dorothy',
  'Samuel', 'Lisa', 'Patrick', 'Nancy', 'Alexander', 'Karen', 'Jack', 'Betty', 'Dennis', 'Helen',
  'Jerry', 'Sandra', 'Tyler', 'Donna', 'Aaron', 'Carol', 'Jose', 'Ruth', 'Adam', 'Sharon'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
];

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Japan', 'India', 'China', 'Brazil',
  'Mexico', 'Italy', 'Spain', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria',
  'Belgium', 'Portugal', 'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Ireland', 'New Zealand', 'South Korea', 'Singapore',
  'Malaysia', 'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar',
  'Cambodia', 'Laos', 'Mongolia', 'Kazakhstan', 'Uzbekistan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Azerbaijan', 'Georgia',
  'Armenia', 'Turkey', 'Iran', 'Iraq', 'Syria', 'Lebanon', 'Jordan', 'Israel', 'Palestine', 'Saudi Arabia',
  'Yemen', 'Oman', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Egypt', 'Libya', 'Tunisia', 'Algeria',
  'Morocco', 'Sudan', 'South Sudan', 'Ethiopia', 'Somalia', 'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi',
  'DR Congo', 'Congo', 'Gabon', 'Cameroon', 'Nigeria', 'Niger', 'Chad', 'Central African Republic', 'South Africa', 'Namibia',
  'Botswana', 'Zimbabwe', 'Zambia', 'Malawi', 'Mozambique', 'Madagascar', 'Mauritius', 'Seychelles', 'Comoros', 'Mayotte'
];

const statuses = [
  'New Lead', 'FTD', 'FTD RETENTION', 'Call Again', 'No Answer', 'NA5UP', 'Not Interested', 'Hang Up'
];

const campaigns = ['Data', 'Affiliate'];

// Generate unique client ID
const generateUniqueClientId = async () => {
  let clientId;
  let isUnique = false;
  
  while (!isUnique) {
    clientId = Math.floor(100000 + Math.random() * 900000).toString();
    const existingClient = await Client.findOne({ clientId });
    if (!existingClient) {
      isUnique = true;
    }
  }
  
  return clientId;
};

// Create admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'AdminCrm@gmail.com' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return existingAdmin;
    }

    // Create admin user (password will be auto-hashed by the model)
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'CRM',
      email: 'AdminCrm@gmail.com',
      password: 'Admin123',
      role: 'admin'
    });

    console.log('✅ Admin user created successfully');
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }
};

// Create agent users
const createAgentUsers = async () => {
  try {
    const agentEmails = [
      'agent1@crm.com',
      'agent2@crm.com',
      'agent3@crm.com',
      'agent4@crm.com',
      'agent5@crm.com'
    ];

    const agents = [];
    
    for (let i = 0; i < agentEmails.length; i++) {
      const existingAgent = await User.findOne({ email: agentEmails[i] });
      if (existingAgent) {
        agents.push(existingAgent);
        continue;
      }

      const agent = await User.create({
        firstName: `Agent${i + 1}`,
        lastName: 'CRM',
        email: agentEmails[i],
        password: 'Agent123',
        role: 'agent'
      });

      agents.push(agent);
    }

    console.log(`✅ ${agents.length} agent users created/verified`);
    return agents;
  } catch (error) {
    console.error('❌ Error creating agent users:', error.message);
    throw error;
  }
};

// Create dummy clients
const createDummyClients = async (agents) => {
  try {
    console.log('🔄 Creating 100 dummy clients...');
    
    const clients = [];
    const batchSize = 10; // Process in batches to avoid memory issues
    
    for (let i = 0; i < 100; i += batchSize) {
      const batch = [];
      
      for (let j = 0; j < batchSize && (i + j) < 100; j++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const email = generateEmail(firstName, lastName);
        const phone = generatePhoneNumber();
        const country = countries[Math.floor(Math.random() * countries.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
        const assignedAgent = agents[Math.floor(Math.random() * agents.length)]._id;
        
        // Generate unique client ID
        const clientId = await generateUniqueClientId();
        
        const clientData = {
          clientId,
          firstName,
          lastName,
          email,
          phone,
          country,
          status,
          campaign,
          assignedAgent,
          value: Math.floor(Math.random() * 10000) + 100, // Random value between 100-10100
          lastContact: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          notes: [
            {
              content: `Initial contact made with ${firstName} ${lastName}. ${status === 'FTD' ? 'First time deposit completed.' : 'Follow-up required.'}`,
              createdBy: assignedAgent,
              createdAt: new Date()
            }
          ]
        };
        
        batch.push(clientData);
      }
      
      // Create batch of clients
      const createdClients = await Client.insertMany(batch);
      clients.push(...createdClients);
      
      console.log(`✅ Created clients ${i + 1} to ${Math.min(i + batchSize, 100)}`);
    }
    
    console.log(`✅ Successfully created ${clients.length} dummy clients`);
    return clients;
  } catch (error) {
    console.error('❌ Error creating dummy clients:', error.message);
    throw error;
  }
};

// Clear existing data (optional)
const clearExistingData = async () => {
  try {
    console.log('🔄 Clearing existing data...');
    
    // Clear all clients
    await Client.deleteMany({});
    console.log('✅ Cleared existing clients');
    
    // Clear all users except admin
    await User.deleteMany({ email: { $ne: 'AdminCrm@gmail.com' } });
    console.log('✅ Cleared existing users (except admin)');
    
  } catch (error) {
    console.error('❌ Error clearing existing data:', error.message);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    await connectDB();
    
    console.log('\n🚀 Starting database seeding...\n');
    
    // Clear existing data
    await clearExistingData();
    
    // Create admin user
    const admin = await createAdminUser();
    
    // Create agent users
    const agents = await createAgentUsers();
    
    // Create dummy clients
    const clients = await createDummyClients(agents);
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👤 Admin users: 1`);
    console.log(`   👥 Agent users: ${agents.length}`);
    console.log(`   👨‍💼 Clients: ${clients.length}`);
    console.log('\n🔑 Admin Login:');
    console.log(`   📧 Email: AdminCrm@gmail.com`);
    console.log(`   🔒 Password: Admin123`);
    console.log('\n🔑 Agent Logins:');
    agents.forEach((agent, index) => {
      console.log(`   📧 Email: agent${index + 1}@crm.com`);
      console.log(`   🔒 Password: Agent123`);
    });
    
    console.log('\n✅ All clients have phone numbers and can be called by agents!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

// Run the seeding
seedDatabase();
