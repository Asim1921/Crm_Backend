


const express = require('express');
const { 
  getTasks, 
  createTask, 
  updateTask,
  deleteTask
} = require('../controllers/taskController');
const { protect, agent, agentOrTeamLead } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(agentOrTeamLead, getTasks)
  .post(agentOrTeamLead, createTask);

router.route('/:id')
  .put(agentOrTeamLead, updateTask)
  .delete(agentOrTeamLead, deleteTask);

module.exports = router;