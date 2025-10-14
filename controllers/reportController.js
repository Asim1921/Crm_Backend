


const Client = require('../models/clientModel');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build base query for role-based filtering
    let baseQuery = {};
    if (req.user.role === 'agent') {
      baseQuery.assignedAgent = req.user._id;
    }
    // TL role can see all clients, no additional filtering needed

    // Total clients
    const totalClients = await Client.countDocuments(baseQuery);
    const lastMonthClients = await Client.countDocuments({
      ...baseQuery,
      createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    });
    const thisMonthClients = await Client.countDocuments({
      ...baseQuery,
      createdAt: { $gte: startOfMonth }
    });

    // Active agents (only for admin)
    let activeAgents = 0;
    let newAgentsThisWeek = 0;
    if (req.user.role === 'admin') {
      activeAgents = await User.countDocuments({ role: 'agent', isActive: true });
      newAgentsThisWeek = await User.countDocuments({ 
        role: 'agent', 
        isActive: true,
        createdAt: { $gte: startOfWeek }
      });
    }

    // Tasks statistics
    const pendingTasks = await Task.countDocuments({
      ...baseQuery,
      status: { $in: ['pending', 'in-progress'] }
    });

    const overdueTasks = await Task.countDocuments({
      ...baseQuery,
      status: 'pending',
      dueDate: { $lt: now }
    });

    // FTD (First Time Deposits) this month
    const ftdThisMonth = await Client.countDocuments({
      ...baseQuery,
      status: 'FTD',
      updatedAt: { $gte: startOfMonth }
    });

    const ftdLastMonth = await Client.countDocuments({
      ...baseQuery,
      status: 'FTD',
      updatedAt: { $gte: startOfLastMonth, $lt: startOfMonth }
    });

    // FTD RETENTION count
    const ftdRetentionCount = await Client.countDocuments({
      ...baseQuery,
      status: 'FTD RETENTION'
    });

    // Lead status overview
    const leadStatusOverview = await Client.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Campaign overview
    const campaignOverview = await Client.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$campaign',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent clients
    const recentClients = await Client.find(baseQuery)
      .populate('assignedAgent', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    // Keep all data including phone numbers for agents (they need them for calls)
    // Phone numbers will be hidden in the frontend UI instead
    const filteredRecentClients = recentClients.map(client => {
      if (req.user.role === 'agent') {
        return {
          _id: client._id,
          clientId: client.clientId,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email, // Keep email for agents
          phone: client.phone, // Keep phone for agents to make calls
          country: client.country,
          status: client.status,
          campaign: client.campaign,
          assignedAgent: client.assignedAgent,
          createdAt: client.createdAt
        };
      }
      return client;
    });

    // Calculate percentage changes
    const clientChangePercent = lastMonthClients > 0 
      ? ((thisMonthClients - lastMonthClients) / lastMonthClients * 100).toFixed(1) 
      : 0;
    
    const ftdChangePercent = ftdLastMonth > 0 
      ? ((ftdThisMonth - ftdLastMonth) / ftdLastMonth * 100).toFixed(1) 
      : 0;

    res.json({
      totalClients: {
        value: totalClients,
        change: clientChangePercent > 0 ? `+${clientChangePercent}%` : `${clientChangePercent}%`,
        changeValue: parseFloat(clientChangePercent)
      },
      activeAgents: {
        value: activeAgents,
        change: newAgentsThisWeek > 0 ? `+${newAgentsThisWeek} new this week` : 'No new agents'
      },
      pendingTasks: {
        value: pendingTasks,
        overdue: overdueTasks
      },
      ftdThisMonth: {
        value: ftdThisMonth,
        change: ftdChangePercent > 0 ? `+${ftdChangePercent}%` : `${ftdChangePercent}%`,
        changeValue: parseFloat(ftdChangePercent)
      },
      ftdRetention: {
        value: ftdRetentionCount,
        change: 'Retention clients'
      },
      leadStatusOverview,
      campaignOverview,
      recentClients: filteredRecentClients
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get lead status overview with filters
// @route   GET /api/reports/lead-status-overview
// @access  Private
const getLeadStatusOverview = async (req, res) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || '';
    const country = req.query.country || '';
    const campaign = req.query.campaign || '';
    const agent = req.query.agent || '';
    const registrationDate = req.query.registrationDate || '';
    const endRegistrationDate = req.query.endRegistrationDate || '';
    const commentDate = req.query.commentDate || '';
    const endCommentDate = req.query.endCommentDate || '';
    const dateFilterType = req.query.dateFilterType || 'entry';
    const unassigned = req.query.unassigned === 'true';

    console.log('Lead Status Overview - Query params:', {
      search, status, country, campaign, agent, unassigned, dateFilterType
    });

    // Build query (same logic as getClients)
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (status) {
      // Handle both single value and array
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else if (typeof status === 'string' && status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    
    if (country) {
      // Handle both single value and array
      if (Array.isArray(country)) {
        query.country = { $in: country };
      } else if (typeof country === 'string' && country.includes(',')) {
        query.country = { $in: country.split(',') };
      } else {
        query.country = { $regex: country, $options: 'i' };
      }
    }
    
    if (campaign) {
      // Handle both single value and array
      if (Array.isArray(campaign)) {
        query.campaign = { $in: campaign };
      } else if (typeof campaign === 'string' && campaign.includes(',')) {
        query.campaign = { $in: campaign.split(',') };
      } else {
        query.campaign = campaign;
      }
    }
    
    // Handle agent and unassigned filters
    if (unassigned) {
      query.$or = [
        { assignedAgent: { $exists: false } },
        { assignedAgent: null }
      ];
    } else if (agent) {
      // Handle both single value and array
      if (Array.isArray(agent)) {
        // Convert array of agent IDs to ObjectIds
        const agentIds = agent.map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
        query.assignedAgent = { $in: agentIds };
      } else if (typeof agent === 'string' && agent.includes(',')) {
        // Split comma-separated string and convert to ObjectIds
        const agentIds = agent.split(',').map(id => mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id);
        query.assignedAgent = { $in: agentIds };
      } else {
        // Single agent ID
        if (mongoose.Types.ObjectId.isValid(agent)) {
          query.assignedAgent = new mongoose.Types.ObjectId(agent);
        } else {
          query.assignedAgent = agent;
        }
      }
    }

    // Date filtering
    if (dateFilterType === 'comment') {
      if (commentDate) {
        const startDate = new Date(commentDate);
        startDate.setHours(0, 0, 0, 0);

        if (endCommentDate) {
          const endDate = new Date(endCommentDate);
          endDate.setHours(23, 59, 59, 999);
          query['notes.createdAt'] = {
            $gte: startDate,
            $lte: endDate
          };
        } else {
          const endDate = new Date(commentDate);
          endDate.setHours(23, 59, 59, 999);
          query['notes.createdAt'] = {
            $gte: startDate,
            $lte: endDate
          };
        }
        query.notes = { $exists: true, $ne: [] };
      }
    } else {
      if (registrationDate) {
        const startDate = new Date(registrationDate);
        startDate.setHours(0, 0, 0, 0);

        if (endRegistrationDate) {
          const endDate = new Date(endRegistrationDate);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt = {
            $gte: startDate,
            $lte: endDate
          };
        } else {
          const endDate = new Date(registrationDate);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt = {
            $gte: startDate,
            $lte: endDate
          };
        }
      }
    }

    // Apply role-based filtering
    if (req.user.role === 'agent' && !unassigned) {
      query.assignedAgent = new mongoose.Types.ObjectId(req.user._id);
    }
    // TL role can see all clients, no additional filtering needed

    console.log('Lead Status Overview - Final query:', JSON.stringify(query, null, 2));

    // Get lead status overview for ALL clients matching the filters
    const leadStatusOverview = await Client.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get campaign overview for ALL clients matching the filters
    const campaignOverview = await Client.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$campaign',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get total count for ALL clients matching the filters
    const totalClients = await Client.countDocuments(query);

    console.log('Lead Status Overview - Results:', {
      leadStatusOverview,
      campaignOverview,
      totalClients
    });

    res.json({
      leadStatusOverview,
      campaignOverview,
      totalClients
    });
  } catch (error) {
    console.error('Error fetching lead status overview:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get analytics data
// @route   GET /api/reports/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const now = new Date();
    
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Build base query for role-based filtering
    let baseQuery = {};
    if (req.user.role === 'agent') {
      baseQuery.assignedAgent = req.user._id;
    }
    // TL role can see all clients, no additional filtering needed

    // Lead status distribution
    const leadStatusDistribution = await Client.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Clients by country
    const clientsByCountry = await Client.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Monthly trends
    const monthlyTrends = await Client.aggregate([
      { $match: { ...baseQuery, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Task completion trends
    const taskTrends = await Task.aggregate([
      { $match: { ...baseQuery, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      leadStatusDistribution,
      clientsByCountry,
      monthlyTrends,
      taskTrends
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user statistics
// @route   GET /api/reports/users
// @access  Private (Admin only)
const getUserStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'tl') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all agents with their performance stats
    const agents = await User.find({ role: 'agent' }).select('firstName lastName email isActive createdAt lastLogin');

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Count clients assigned to this agent
        const totalClients = await Client.countDocuments({ assignedAgent: agent._id });
        const ftdClients = await Client.countDocuments({ 
          assignedAgent: agent._id, 
          status: 'FTD' 
        });
        const thisMonthClients = await Client.countDocuments({
          assignedAgent: agent._id,
          createdAt: { $gte: startOfMonth }
        });

        // Count tasks assigned to this agent
        const totalTasks = await Task.countDocuments({ assignedTo: agent._id });
        const completedTasks = await Task.countDocuments({ 
          assignedTo: agent._id, 
          status: 'completed' 
        });
        const pendingTasks = await Task.countDocuments({ 
          assignedTo: agent._id, 
          status: { $in: ['pending', 'in-progress'] } 
        });

        // Calculate total value of clients
        const totalValue = await Client.aggregate([
          { $match: { assignedAgent: agent._id } },
          { $group: { _id: null, total: { $sum: '$value' } } }
        ]);

        return {
          _id: agent._id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          isActive: agent.isActive,
          createdAt: agent.createdAt,
          lastLogin: agent.lastLogin,
          stats: {
            totalClients,
            ftdClients,
            thisMonthClients,
            totalTasks,
            completedTasks,
            pendingTasks,
            totalValue: totalValue.length > 0 ? totalValue[0].total : 0,
            completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
          }
        };
      })
    );

    res.json(agentsWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getAnalytics,
  getLeadStatusOverview,
  getUserStats
};