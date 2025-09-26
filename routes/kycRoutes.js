const express = require('express');
const router = express.Router();
const { 
  submitKyc, 
  submitKycJson,
  getUserKyc, 
  getAllKyc, 
  downloadDocument, 
  updateKycStatus, 
  deleteKyc,
  upload 
} = require('../controllers/kycController');
const { protect } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/kyc/submit
// @desc    Submit KYC documents
// @access  Private
router.post('/submit', (req, res, next) => {
  upload.fields([
    { name: 'selfie', maxCount: 1 },
    { name: 'idFront', maxCount: 1 },
    { name: 'idBack', maxCount: 1 },
    { name: 'paymentProof', maxCount: 1 },
    { name: 'bankStatement', maxCount: 1 },
    { name: 'utilityBill', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, submitKyc);

// @route   POST /api/kyc/submit-json
// @desc    Submit KYC documents (JSON with base64)
// @access  Private
router.post('/submit-json', submitKycJson);

// @route   GET /api/kyc/user/:userId
// @desc    Get user's KYC data
// @access  Private
router.get('/user/:userId', getUserKyc);

// @route   GET /api/kyc/all
// @desc    Get all KYC submissions (Admin only)
// @access  Private (Admin)
router.get('/all', getAllKyc);

// @route   GET /api/kyc/:kycId/download/:documentType
// @desc    Download KYC document
// @access  Private
router.get('/:kycId/download/:documentType', downloadDocument);

// @route   PUT /api/kyc/:kycId/status
// @desc    Update KYC status (Admin only)
// @access  Private (Admin)
router.put('/:kycId/status', updateKycStatus);

// @route   DELETE /api/kyc/:kycId
// @desc    Delete KYC submission (Admin only)
// @access  Private (Admin)
router.delete('/:kycId', deleteKyc);

module.exports = router;
