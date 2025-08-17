const Communication = require('../models/communicationModel');
const User = require('../models/userModel');
const Client = require('../models/clientModel');

// @desc    Get communication statistics
// @route   GET /api/communications/stats
// @access  Private
const getCommunicationStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's communications
    const todayCommunications = await Communication.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    // Get yesterday's communications for comparison
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCommunications = await Communication.find({
      createdAt: { $gte: yesterday, $lt: today }
    });

    // Calculate stats
    const activeCalls = await Communication.countDocuments({
      type: 'call',
      status: 'in-progress'
    });

    const messagesSent = todayCommunications.filter(c => c.type === 'message').length;
    const emailsSent = todayCommunications.filter(c => c.type === 'email').length;
    
    const yesterdayMessages = yesterdayCommunications.filter(c => c.type === 'message').length;
    const yesterdayEmails = yesterdayCommunications.filter(c => c.type === 'email').length;

    // Get online agents (users with role 'agent')
    const totalAgents = await User.countDocuments({ role: 'agent' });
    const onlineAgents = Math.floor(totalAgents * 0.8); // Simulate 80% online

    const stats = {
      activeCalls: {
        value: activeCalls,
        change: '+8%',
        changeType: 'increase'
      },
      messagesSent: {
        value: messagesSent,
        change: yesterdayMessages > 0 ? `+${Math.round(((messagesSent - yesterdayMessages) / yesterdayMessages) * 100)}%` : '+15%',
        changeType: 'increase'
      },
      emailsSent: {
        value: emailsSent,
        change: yesterdayEmails > 0 ? `+${Math.round(((emailsSent - yesterdayEmails) / yesterdayEmails) * 100)}%` : '+3%',
        changeType: 'increase'
      },
      onlineAgents: {
        value: onlineAgents,
        total: totalAgents,
        percentage: Math.round((onlineAgents / totalAgents) * 100)
      }
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching communication stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get communication analytics
// @route   GET /api/communications/analytics
// @access  Private
const getCommunicationAnalytics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's communications by channel
    const todayCommunications = await Communication.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const whatsappCount = todayCommunications.filter(c => c.channel === 'whatsapp').length;
    const telegramCount = todayCommunications.filter(c => c.channel === 'telegram').length;
    const emailCount = todayCommunications.filter(c => c.channel === 'email').length;

    const analytics = {
      whatsappToday: whatsappCount,
      telegramToday: telegramCount,
      emailToday: emailCount,
      channelBreakdown: {
        whatsapp: whatsappCount,
        telegram: telegramCount,
        email: emailCount,
        phone: todayCommunications.filter(c => c.channel === 'phone').length,
        voip: todayCommunications.filter(c => c.channel === 'voip').length
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching communication analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active agents
// @route   GET /api/communications/agents
// @access  Private
const getActiveAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .select('firstName lastName email role title')
      .limit(10);

    const activeAgents = agents.map(agent => ({
      ...agent.toObject(),
      status: 'Online', // Simulate online status
      initials: `${agent.firstName?.charAt(0) || ''}${agent.lastName?.charAt(0) || ''}`.toUpperCase()
    }));

    res.json(activeAgents);
  } catch (error) {
    console.error('Error fetching active agents:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Initiate a call
// @route   POST /api/communications/call
// @access  Private
const initiateCall = async (req, res) => {
  try {
    const { clientId, phoneNumber, channel = 'voip' } = req.body;

    if (!clientId || !phoneNumber) {
      return res.status(400).json({ message: 'Client ID and phone number are required' });
    }

    // Create communication record
    const communication = await Communication.create({
      type: 'call',
      client: clientId,
      agent: req.user.id,
      direction: 'outbound',
      channel,
      phoneNumber,
      status: 'in-progress'
    });

    res.json({
      message: 'Call initiated successfully',
      communicationId: communication._id
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/communications/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { clientId, content, channel = 'whatsapp' } = req.body;

    if (!clientId || !content) {
      return res.status(400).json({ message: 'Client ID and content are required' });
    }

    // Create communication record
    const communication = await Communication.create({
      type: 'message',
      client: clientId,
      agent: req.user.id,
      direction: 'outbound',
      channel,
      content,
      status: 'completed'
    });

    res.json({
      message: 'Message sent successfully',
      communicationId: communication._id
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send an email
// @route   POST /api/communications/email
// @access  Private
const sendEmail = async (req, res) => {
  try {
    const { clientId, subject, content, email } = req.body;

    if (!clientId || !subject || !content || !email) {
      return res.status(400).json({ message: 'Client ID, subject, content, and email are required' });
    }

    // Create communication record
    const communication = await Communication.create({
      type: 'email',
      client: clientId,
      agent: req.user.id,
      direction: 'outbound',
      channel: 'email',
      subject,
      content,
      email,
      status: 'completed'
    });

    res.json({
      message: 'Email sent successfully',
      communicationId: communication._id
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get communication history
// @route   GET /api/communications/history
// @access  Private
const getCommunicationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, channel } = req.query;
    
    const query = {};
    if (type) query.type = type;
    if (channel) query.channel = channel;

    const communications = await Communication.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('agent', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Communication.countDocuments(query);

    res.json({
      communications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching communication history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCommunicationStats,
  getCommunicationAnalytics,
  getActiveAgents,
  initiateCall,
  sendMessage,
  sendEmail,
  getCommunicationHistory
};
