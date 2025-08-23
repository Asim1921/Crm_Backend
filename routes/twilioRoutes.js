const express = require('express');
const {
  makeCall,
  endCall,
  getCallStatus,
  getRecentCalls,
  generateTwiML,
  handleStatusCallback,
  handleRecordingCallback,
  handleConnectAction,
  getAccountInfo
} = require('../controllers/twilioController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes (require authentication)
router.use('/call', protect);
router.use('/end-call', protect);
router.use('/call-status', protect);
router.use('/recent-calls', protect);
router.use('/account-info', protect);

// Call management routes
router.post('/call', makeCall);
router.post('/end-call', endCall);
router.get('/call-status/:callSid', getCallStatus);
router.get('/recent-calls', getRecentCalls);
router.get('/account-info', getAccountInfo);

// Public routes (Twilio webhooks - no authentication required)
router.post('/twiml/voice', generateTwiML);
router.post('/status-callback', handleStatusCallback);
router.post('/recording-callback', handleRecordingCallback);
router.post('/connect-action', handleConnectAction);

module.exports = router;
