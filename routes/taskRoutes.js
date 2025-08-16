


const express = require('express');
const { 
  getTasks, 
  createTask, 
  updateTask 
} = require('../controllers/taskController');
const { protect, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(agent, getTasks)
  .post(agent, createTask);

router.route('/:id')
  .put(agent, updateTask);

module.exports = router;