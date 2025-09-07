const CallStats = require('../models/callStatsModel');
const User = require('../models/userModel');

// @desc    Track call button click
// @route   POST /api/call-stats/track
// @access  Private
const trackCallClick = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Increment call count for today
    const result = await CallStats.incrementCallCount(userId);
    
    res.json({
      success: true,
      message: 'Call click tracked successfully',
      data: {
        userId: result.userId,
        date: result.date,
        callCount: result.callCount,
        lastCallTime: result.lastCallTime
      }
    });
  } catch (error) {
    console.error('Error tracking call click:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track call click',
      error: error.message
    });
  }
};

// @desc    Get call statistics for current user
// @route   GET /api/call-stats/user
// @access  Private
const getUserCallStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const days = parseInt(req.query.days) || 7;
    
    const stats = await CallStats.getUserCallStats(userId, days);
    
    // Calculate total calls and average per day
    const totalCalls = stats.reduce((sum, stat) => sum + stat.callCount, 0);
    const averagePerDay = days > 0 ? (totalCalls / days).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        stats: stats,
        summary: {
          totalCalls: totalCalls,
          averagePerDay: parseFloat(averagePerDay),
          days: days
        }
      }
    });
  } catch (error) {
    console.error('Error getting user call stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user call statistics',
      error: error.message
    });
  }
};

// @desc    Get today's call statistics for all users (Admin only)
// @route   GET /api/call-stats/today
// @access  Private (Admin only)
const getTodayCallStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const stats = await CallStats.getTodayCallStats();
    
    // Format the data for frontend
    const formattedStats = stats.map(stat => ({
      userId: stat.userId._id,
      userName: `${stat.userId.firstName} ${stat.userId.lastName}`,
      userEmail: stat.userId.email,
      userRole: stat.userId.role,
      callCount: stat.callCount,
      lastCallTime: stat.lastCallTime,
      date: stat.date
    }));
    
    // Calculate total calls today
    const totalCallsToday = stats.reduce((sum, stat) => sum + stat.callCount, 0);
    
    res.json({
      success: true,
      data: {
        stats: formattedStats,
        summary: {
          totalCallsToday: totalCallsToday,
          activeUsers: stats.length,
          averageCallsPerUser: stats.length > 0 ? (totalCallsToday / stats.length).toFixed(1) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting today call stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get today call statistics',
      error: error.message
    });
  }
};

// @desc    Get call statistics for all users (Admin only)
// @route   GET /api/call-stats/all
// @access  Private (Admin only)
const getAllCallStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }
    
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    // Get all users
    const users = await User.find({ role: { $in: ['agent', 'admin'] } });
    
    // Get call stats for all users
    const allStats = await CallStats.find({
      date: { $gte: startDate }
    }).populate('userId', 'firstName lastName email role');
    
    // Group stats by user
    const userStatsMap = new Map();
    
    users.forEach(user => {
      userStatsMap.set(user._id.toString(), {
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userRole: user.role,
        totalCalls: 0,
        days: [],
        averagePerDay: 0
      });
    });
    
    // Aggregate stats by user
    allStats.forEach(stat => {
      const userId = stat.userId._id.toString();
      if (userStatsMap.has(userId)) {
        const userStat = userStatsMap.get(userId);
        userStat.totalCalls += stat.callCount;
        userStat.days.push({
          date: stat.date,
          callCount: stat.callCount
        });
      }
    });
    
    // Calculate averages
    userStatsMap.forEach(userStat => {
      userStat.averagePerDay = days > 0 ? (userStat.totalCalls / days).toFixed(1) : 0;
    });
    
    const formattedStats = Array.from(userStatsMap.values());
    
    // Calculate overall summary
    const totalCalls = formattedStats.reduce((sum, stat) => sum + stat.totalCalls, 0);
    const averageCallsPerUser = formattedStats.length > 0 ? (totalCalls / formattedStats.length).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        stats: formattedStats,
        summary: {
          totalCalls: totalCalls,
          totalUsers: formattedStats.length,
          averageCallsPerUser: parseFloat(averageCallsPerUser),
          days: days
        }
      }
    });
  } catch (error) {
    console.error('Error getting all call stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get all call statistics',
      error: error.message
    });
  }
};

module.exports = {
  trackCallClick,
  getUserCallStats,
  getTodayCallStats,
  getAllCallStats
};
