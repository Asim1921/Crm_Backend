const express = require('express');
const { 
  getClients, 
  createClient, 
  updateClient, 
  getClientById,
  getUniqueCountries,
  getAvailableAgents,
  assignClients,
  exportClients,
  importClients,
  deleteClient,
  searchClients,
  addNote,
  deleteNote
} = require('../controllers/clientController');
const { protect, admin, agent } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Specific routes must come before parameterized routes
router.route('/countries')
  .get(agent, getUniqueCountries);

router.route('/agents')
  .get(admin, getAvailableAgents);

router.route('/assign')
  .put(admin, assignClients);

router.route('/export')
  .get(agent, exportClients);

router.route('/import')
  .post(admin, importClients);

router.route('/search')
  .get(agent, searchClients);

// General routes
router.route('/')
  .get(agent, getClients)
  .post(agent, createClient);

// Parameterized routes must come last
router.route('/:id')
  .get(agent, getClientById)
  .put(agent, updateClient)
  .delete(agent, deleteClient);

// Note routes
router.route('/:id/notes')
  .post(agent, addNote);

router.route('/:id/notes/:noteId')
  .delete(agent, deleteNote);

module.exports = router;