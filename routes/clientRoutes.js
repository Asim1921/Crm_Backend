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
  deleteClients,
  searchClients,
  addNote,
  markNoteAsViewed,
  deleteNote
} = require('../controllers/clientController');
const { protect, admin, agent, agentOrTeamLead } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Specific routes must come before parameterized routes
router.route('/countries')
  .get(agentOrTeamLead, getUniqueCountries);

router.route('/agents')
  .get(admin, getAvailableAgents);

router.route('/assign')
  .put(admin, assignClients);

router.route('/bulk-delete')
  .delete(admin, deleteClients);

router.route('/export')
  .get(agentOrTeamLead, exportClients);

router.route('/import')
  .post(admin, importClients);

router.route('/search')
  .get(agentOrTeamLead, searchClients);

// General routes
router.route('/')
  .get(agentOrTeamLead, getClients)
  .post(agentOrTeamLead, createClient);

// Parameterized routes must come last
router.route('/:id')
  .get(agentOrTeamLead, getClientById)
  .put(agentOrTeamLead, updateClient)
  .delete(agentOrTeamLead, deleteClient);

// Note routes
router.route('/:id/notes')
  .post(agentOrTeamLead, addNote);

router.route('/:id/notes/:noteId')
  .delete(agentOrTeamLead, deleteNote);

router.route('/:id/notes/:noteId/view')
  .put(agentOrTeamLead, markNoteAsViewed);

module.exports = router;