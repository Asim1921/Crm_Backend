const express = require('express');
const router = express.Router();
const { trackCallClick, getUserCallStats, getTodayCallStats, getAllCallStats } = require('../controllers/callStatsController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

// Track call button click
router.post('/track', trackCallClick);

// Get current user's call statistics
router.get('/user', getUserCallStats);

// Get today's call statistics for all users (Admin only)
router.get('/today', getTodayCallStats);

// Get call statistics for all users (Admin only)
router.get('/all', getAllCallStats);

module.exports = router;
