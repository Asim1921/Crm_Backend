const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  initializeClick2Call,
  getServiceStatus,
  makeCall,
  endCall,
  testCall
} = require('../controllers/click2CallController');

// Apply authentication middleware to all routes
router.use(protect);

// Initialize Click2Call service
router.post('/initialize', initializeClick2Call);

// Get service status
router.get('/status', getServiceStatus);

// Make a call
router.post('/call', makeCall);

// End a call
router.post('/end-call', endCall);

// Test call (for debugging)
router.post('/test-call', testCall);

module.exports = router;
