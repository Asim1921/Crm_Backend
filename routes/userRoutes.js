const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  uploadProfilePicture, 
  getUserStats,
  changePassword 
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

router.route('/profile-picture')
  .post(uploadProfilePicture);

router.route('/stats')
  .get(getUserStats);

router.route('/change-password')
  .put(changePassword);

module.exports = router;
