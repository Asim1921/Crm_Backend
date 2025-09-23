const Client = require('../models/clientModel');
const User = require('../models/userModel');

// @desc    Get all clients with pagination and search
// @route   GET /api/clients
// @access  Private
const getClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const country = req.query.country || '';
    const campaign = req.query.campaign || '';
    const agent = req.query.agent || '';
    const registrationDate = req.query.registrationDate || '';
    const endRegistrationDate = req.query.endRegistrationDate || '';
    const commentDate = req.query.commentDate || '';
    const endCommentDate = req.query.endCommentDate || '';
    const dateFilterType = req.query.dateFilterType || 'entry'; // 'entry' or 'comment'
    const unassigned = req.query.unassigned === 'true';

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (status) {
      query.status = status;
    }
    
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    
    if (campaign) {
      query.campaign = campaign;
    }
    
    // Handle agent and unassigned filters
    if (unassigned) {
      // If unassigned filter is active, show only clients without assigned agents
      query.$or = [
        { assignedAgent: { $exists: false } },
        { assignedAgent: null }
      ];
    } else if (agent) {
      // If specific agent filter is active, show only clients assigned to that agent
      query.assignedAgent = agent;
    }

    // Date filtering
    if (dateFilterType === 'comment') {
      // Filter by comment date
      if (commentDate) {
        const startDate = new Date(commentDate);
        startDate.setHours(0, 0, 0, 0);
        
        if (endCommentDate) {
          // Date range filtering for comments
          const endDate = new Date(endCommentDate);
          endDate.setHours(23, 59, 59, 999);
          query['notes.createdAt'] = {
            $gte: startDate,
            $lte: endDate
          };
        } else {
          // Exact date filtering for comments
          const endDate = new Date(commentDate);
          endDate.setHours(23, 59, 59, 999);
          query['notes.createdAt'] = {
            $gte: startDate,
            $lte: endDate
          };
        }
        // Ensure clients have notes
        query.notes = { $exists: true, $ne: [] };
      }
    } else {
      // Filter by CRM entry date (default)
      if (registrationDate) {
        const startDate = new Date(registrationDate);
        startDate.setHours(0, 0, 0, 0);
        
        if (endRegistrationDate) {
          // Date range filtering
          const endDate = new Date(endRegistrationDate);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt = {
            $gte: startDate,
            $lte: endDate
          };
        } else {
          // Exact date filtering
          const endDate = new Date(registrationDate);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt = {
            $gte: startDate,
            $lte: endDate
          };
        }
      }
    }

    // Role-based filtering (only if unassigned filter is not active)
    if (req.user.role === 'agent' && !unassigned) {
      query.assignedAgent = req.user._id;
    }

    // Debug logging for date filtering
    console.log('Date filter debug:', {
      dateFilterType,
      registrationDate,
      endRegistrationDate,
      commentDate,
      endCommentDate,
      unassigned,
      finalQuery: query
    });

    const clients = await Client.find(query)
      .populate('assignedAgent', 'firstName lastName')
      .populate({
        path: 'notes',
        options: { sort: { createdAt: -1 }, limit: 1 },
        populate: {
          path: 'createdBy',
          select: 'firstName lastName'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Client.countDocuments(query);

    // Keep all data including phone numbers for agents (they need them for calls)
    // Phone numbers will be hidden in the frontend UI instead
    const filteredClients = clients.map(client => {
      // Get the last comment/note and its date
      const lastComment = client.notes && client.notes.length > 0 
        ? client.notes[0].content 
        : null;
      const lastCommentDate = client.notes && client.notes.length > 0 
        ? client.notes[0].createdAt 
        : null;

      if (req.user.role === 'agent') {
        return {
          _id: client._id,
          clientId: client.clientId,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email, // Keep email for agents
          phone: client.phone, // Keep phone for agents to make calls
          country: client.country,
          status: client.status,
          campaign: client.campaign,
          assignedAgent: client.assignedAgent,
          lastContact: client.lastContact,
          createdAt: client.createdAt,
          lastComment: lastComment,
          lastCommentDate: lastCommentDate
        };
      }
      
      // For admins, return full client data with last comment and date
      return {
        ...client.toObject(),
        lastComment: lastComment,
        lastCommentDate: lastCommentDate
      };
    });

    res.json({
      clients: filteredClients,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalClients: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create new client
// @route   POST /api/clients
// @access  Private
const createClient = async (req, res) => {
  try {
    // Handle the case where firstName contains the full name
    const clientData = { ...req.body };
    
    // If lastName is not provided, set it to empty string
    if (!clientData.lastName) {
      clientData.lastName = '';
    }

    const client = await Client.create({
      ...clientData,
      assignedAgent: req.body.assignedAgent || null
    });

    await client.populate('assignedAgent', 'firstName lastName');
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update client
// @route   PUT /api/clients/:id
// @access  Private
const updateClient = async (req, res) => {
  try {
    let client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && client.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove clientId from update data to prevent it from being changed
    const updateData = { ...req.body };
    delete updateData.clientId;
    
    client = await Client.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('assignedAgent', 'firstName lastName');

    res.json(client);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get client by ID
// @route   GET /api/clients/:id
// @access  Private
const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id)
      .populate('assignedAgent', 'firstName lastName')
      .populate('notes.createdBy', 'firstName lastName');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && client.assignedAgent._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Keep all data including phone numbers for agents (they need them for calls)
    // Phone numbers will be hidden in the frontend UI instead
    if (req.user.role === 'agent') {
      const filteredClient = {
        _id: client._id,
        clientId: client.clientId,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email, // Keep email for agents
        phone: client.phone, // Keep phone for agents to make calls
        country: client.country,
        status: client.status,
        campaign: client.campaign,
        assignedAgent: client.assignedAgent,
        notes: client.notes,
        lastContact: client.lastContact,
        createdAt: client.createdAt
      };
      return res.json(filteredClient);
    }

    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get unique countries
// @route   GET /api/clients/countries
// @access  Private
const getUniqueCountries = async (req, res) => {
  try {
    // Build base query for role-based filtering
    let query = {};
    if (req.user.role === 'agent') {
      query.assignedAgent = req.user._id;
    }

    const countries = await Client.distinct('country', query);
    const sortedCountries = countries.filter(Boolean).sort();
    
    res.json(sortedCountries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get available agents for assignment
// @route   GET /api/clients/agents
// @access  Private (Admin only)
const getAvailableAgents = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const agents = await User.find({ role: 'agent' })
      .select('_id firstName lastName email')
      .sort({ firstName: 1 });

    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Bulk assign clients to agent
// @route   PUT /api/clients/assign
// @access  Private (Admin only)
const assignClients = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { clientIds, agentId } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: 'Client IDs are required' });
    }

    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    // Verify agent exists
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      return res.status(400).json({ message: 'Invalid agent' });
    }

    // Update all clients
    const result = await Client.updateMany(
      { _id: { $in: clientIds } },
      { assignedAgent: agentId }
    );

    res.json({ 
      message: `Successfully assigned ${result.modifiedCount} clients to ${agent.firstName} ${agent.lastName}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Assign clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export clients to Excel
// @route   GET /api/clients/export
// @access  Private
const exportClients = async (req, res) => {
  try {
    const { format = 'json', clientIds } = req.query;
    
    // Build query
    let query = {};
    
    // If specific client IDs are provided, use them
    if (clientIds) {
      const ids = clientIds.split(',').filter(id => id.trim());
      if (ids.length > 0) {
        query._id = { $in: ids };
      } else {
        // If no valid IDs provided, return empty result
        return res.status(400).json({ message: 'No valid client IDs provided' });
      }
    }
    
    // Role-based filtering (only apply if not filtering by specific IDs)
    if (req.user.role === 'agent' && !clientIds) {
      query.assignedAgent = req.user._id;
    }

    const clients = await Client.find(query)
      .populate('assignedAgent', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Filter sensitive data for agents
    const filteredClients = clients.map(client => {
      if (req.user.role === 'agent') {
        return {
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          country: client.country,
          status: client.status,
          assignedAgent: client.assignedAgent ? `${client.assignedAgent.firstName} ${client.assignedAgent.lastName}` : 'Unassigned',
          lastContact: client.lastContact,
          createdAt: client.createdAt
        };
      }
      return {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        country: client.country,
        status: client.status,
        assignedAgent: client.assignedAgent ? `${client.assignedAgent.firstName} ${client.assignedAgent.lastName}` : 'Unassigned',
        value: client.value,
        notes: client.notes?.length || 0,
        lastContact: client.lastContact,
        createdAt: client.createdAt
      };
    });

    if (format === 'csv') {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
      
      // Create CSV content
      const headers = Object.keys(filteredClients[0] || {}).join(',');
      const rows = filteredClients.map(client => 
        Object.values(client).map(value => 
          typeof value === 'string' ? `"${value}"` : value
        ).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      res.send(csvContent);
    } else {
      res.json(filteredClients);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete client
// @route   DELETE /api/clients/:id
// @access  Private
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && client.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Client.findByIdAndDelete(req.params.id);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Import clients from Excel/CSV
// @route   POST /api/clients/import
// @access  Private (Admin only)
const importClients = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { clients } = req.body;

    if (!clients || !Array.isArray(clients)) {
      return res.status(400).json({ message: 'Clients data is required' });
    }

    const createdClients = [];
    const errors = [];

    for (let i = 0; i < clients.length; i++) {
      const clientData = clients[i];
      
      try {
        // Validate required fields
        if (!clientData.firstName || !clientData.email) {
          errors.push(`Row ${i + 1}: Missing required fields (firstName, email)`);
          continue;
        }

        // Check if client already exists
        const existingClient = await Client.findOne({ email: clientData.email });
        if (existingClient) {
          errors.push(`Row ${i + 1}: Client with email ${clientData.email} already exists`);
          continue;
        }

        // Create client
        const client = await Client.create({
          firstName: clientData.firstName,
          lastName: clientData.lastName || '',
          email: clientData.email,
          phone: clientData.phone || '',
          country: clientData.country || 'Unknown',
          status: clientData.status || 'New Lead',
          value: clientData.value || 0,
          assignedAgent: clientData.assignedAgent || null
        });

        createdClients.push(client);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully imported ${createdClients.length} clients`,
      created: createdClients.length,
      errors: errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Search clients for header search
// @route   GET /api/clients/search
// @access  Private
const searchClients = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    const searchQuery = q.trim();
    
    // Build search query
    let query = {
      $or: [
        { clientId: { $regex: searchQuery, $options: 'i' } },
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { phone: { $regex: searchQuery, $options: 'i' } },
        { country: { $regex: searchQuery, $options: 'i' } }
      ]
    };

    // Role-based filtering
    if (req.user.role === 'agent') {
      query.assignedAgent = req.user._id;
    }

    const clients = await Client.find(query)
      .populate('assignedAgent', 'firstName lastName')
      .limit(10)
      .sort({ createdAt: -1 })
      .select('clientId firstName lastName email phone country status campaign assignedAgent');

    // Keep all data including phone numbers for agents (they need them for calls)
    // Phone numbers will be hidden in the frontend UI instead
    const filteredClients = clients.map(client => {
      if (req.user.role === 'agent') {
        return {
          _id: client._id,
          clientId: client.clientId,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email, // Keep email for agents
          phone: client.phone, // Keep phone for agents to make calls
          country: client.country,
          status: client.status,
          campaign: client.campaign,
          assignedAgent: client.assignedAgent
        };
      }
      return client;
    });

    res.json(filteredClients);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add note to client
// @route   POST /api/clients/:id/notes
// @access  Private
const addNote = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && client.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const note = {
      content: content.trim(),
      createdBy: req.user._id,
      createdAt: new Date()
    };

    client.notes = client.notes || [];
    client.notes.push(note);
    
    await client.save();
    
    // Populate the createdBy field for the new note
    await client.populate('notes.createdBy', 'firstName lastName');
    
    res.status(201).json(client);
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete note from client
// @route   DELETE /api/clients/:id/notes/:noteId
// @access  Private
const deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && client.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const noteIndex = client.notes.findIndex(note => note._id.toString() === noteId);
    
    if (noteIndex === -1) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Only allow deletion by the note creator or admin
    if (req.user.role !== 'admin' && client.notes[noteIndex].createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    client.notes.splice(noteIndex, 1);
    await client.save();
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete multiple clients
// @route   DELETE /api/clients/bulk-delete
// @access  Private (Admin only)
const deleteClients = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { clientIds } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: 'Client IDs array is required' });
    }

    // Validate that all IDs are valid MongoDB ObjectIds
    const validIds = clientIds.filter(id => {
      try {
        return require('mongoose').Types.ObjectId.isValid(id);
      } catch (error) {
        return false;
      }
    });

    if (validIds.length !== clientIds.length) {
      return res.status(400).json({ message: 'Invalid client ID(s) provided' });
    }

    // Delete all clients
    const result = await Client.deleteMany({ _id: { $in: validIds } });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No clients found to delete' });
    }

    res.json({ 
      message: `Successfully deleted ${result.deletedCount} client(s)`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
  deleteNote
};