const express = require('express');
const {
  getCommunicationStats,
  getCommunicationAnalytics,
  getActiveAgents,
  initiateCall,
  sendMessage,
  sendEmail,
  getCommunicationHistory
} = require('../controllers/communicationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// GET routes
router.get('/stats', getCommunicationStats);
router.get('/analytics', getCommunicationAnalytics);
router.get('/agents', getActiveAgents);
router.get('/history', getCommunicationHistory);

// POST routes
router.post('/call', initiateCall);
router.post('/message', sendMessage);
router.post('/email', sendEmail);

module.exports = router;
