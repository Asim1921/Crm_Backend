const express = require('express');
const { 
  getDashboardStats, 
  getAnalytics,
  getUserStats
} = require('../controllers/reportController');
const { protect, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', agent, getDashboardStats);
router.get('/analytics', agent, getAnalytics);
router.get('/users', getUserStats);

module.exports = router;
