const express = require('express');
const { 
  getDashboardStats, 
  getAnalytics,
  getUserStats,
  getLeadStatusOverview
} = require('../controllers/reportController');
const { protect, agent, agentOrTeamLead } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', agentOrTeamLead, getDashboardStats);
router.get('/analytics', agentOrTeamLead, getAnalytics);
router.get('/lead-status-overview', agentOrTeamLead, getLeadStatusOverview);
router.get('/users', getUserStats);

module.exports = router;
