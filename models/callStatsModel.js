const mongoose = require('mongoose');

const callStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  callCount: {
    type: Number,
    default: 0
  },
  lastCallTime: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
callStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Static method to increment call count for a user on a specific date
callStatsSchema.statics.incrementCallCount = async function(userId, date = new Date()) {
  // Normalize date to start of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const result = await this.findOneAndUpdate(
      { 
        userId: userId,
        date: { $gte: startOfDay, $lte: endOfDay }
      },
      { 
        $inc: { callCount: 1 },
        $set: { lastCallTime: new Date() }
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    return result;
  } catch (error) {
    console.error('Error incrementing call count:', error);
    throw error;
  }
};

// Static method to get call statistics for a user
callStatsSchema.statics.getUserCallStats = async function(userId, days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  try {
    const stats = await this.find({
      userId: userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    return stats;
  } catch (error) {
    console.error('Error getting user call stats:', error);
    throw error;
  }
};

// Static method to get all users' call statistics for today
callStatsSchema.statics.getTodayCallStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const stats = await this.find({
      date: { $gte: today, $lte: endOfDay }
    }).populate('userId', 'firstName lastName email role');

    return stats;
  } catch (error) {
    console.error('Error getting today call stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('CallStats', callStatsSchema);
