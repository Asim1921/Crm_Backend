const User = require('../models/userModel');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, bio, company, title, location } = req.body;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        firstName,
        lastName,
        email,
        phone,
        bio,
        company,
        title,
        location
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res) => {
  try {
    // For now, we'll accept a base64 image or URL
    // In production, you'd want to use a service like AWS S3 or Cloudinary
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({ message: 'Profile picture is required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePicture },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's tasks count
    const Task = require('../models/taskModel');
    const Client = require('../models/clientModel');
    
    const [totalTasks, completedTasks, pendingTasks, totalClients, assignedClients] = await Promise.all([
      Task.countDocuments({ assignedTo: userId }),
      Task.countDocuments({ assignedTo: userId, status: 'completed' }),
      Task.countDocuments({ assignedTo: userId, status: 'pending' }),
      Client.countDocuments({}),
      req.user.role === 'agent' ? Client.countDocuments({ assignedAgent: userId }) : Client.countDocuments({})
    ]);

    // Calculate achievements based on performance
    let achievements = 0;
    if (completedTasks >= 10) achievements += 2; // Task completion badge
    if (completedTasks >= 25) achievements += 2; // Task master badge
    if (assignedClients >= 5) achievements += 2; // Client manager badge
    if (assignedClients >= 15) achievements += 2; // Client expert badge

    const stats = {
      totalTasks,
      completedTasks,
      pendingTasks,
      totalClients: req.user.role === 'admin' ? totalClients : assignedClients,
      achievements,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfilePicture,
  getUserStats,
  changePassword
};
