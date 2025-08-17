


const express = require('express');
const { 
  getTasks, 
  createTask, 
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { protect, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(agent, getTasks)
  .post(agent, createTask);

router.route('/:id')
  .put(agent, updateTask)
  .delete(agent, deleteTask);

module.exports = router;