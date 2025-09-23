const express = require('express');
const { 
  getDashboardStats, 
  getAnalytics,
  getUserStats,
  getLeadStatusOverview
} = require('../controllers/reportController');
const { protect, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', agent, getDashboardStats);
router.get('/analytics', agent, getAnalytics);
router.get('/lead-status-overview', agent, getLeadStatusOverview);
router.get('/users', getUserStats);

module.exports = router;
