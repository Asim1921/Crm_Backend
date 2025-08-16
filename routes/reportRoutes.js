const express = require('express');
const { 
  getDashboardStats, 
  getAnalytics 
} = require('../controllers/reportController');
const { protect, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/dashboard', agent, getDashboardStats);
router.get('/analytics', agent, getAnalytics);

module.exports = router;
