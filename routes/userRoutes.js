const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  uploadProfilePicture, 
  getUserStats,
  changePassword,
  createUser,
  getUsers
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

// Admin only routes
router.route('/')
  .get(getUsers)
  .post(createUser);

module.exports = router;
