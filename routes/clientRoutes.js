const express = require('express');
const { 
  getClients, 
  createClient, 
  updateClient, 
  getClientById 
} = require('../controllers/clientController');
const { protect, admin, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/')
  .get(agent, getClients)
  .post(agent, createClient);

router.route('/:id')
  .get(agent, getClientById)
  .put(agent, updateClient);

module.exports = router;