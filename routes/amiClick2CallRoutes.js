const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  makeAmiCall,
  testAmiConnection,
  getAmiStatus,
  getAmiUserInfo
} = require('../controllers/amiClick2CallController');

// Apply authentication middleware to all routes
router.use(protect);

// Make a call using AMI
router.post('/call', makeAmiCall);

// Test AMI connection
router.post('/test-connection', testAmiConnection);

// Get AMI service status
router.get('/status', getAmiStatus);

// Get user info for AMI debugging
router.get('/user-info', getAmiUserInfo);

module.exports = router;
