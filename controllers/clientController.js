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

    // Role-based filtering
    if (req.user.role === 'agent') {
      query.assignedAgent = req.user._id;
    }

    const clients = await Client.find(query)
      .populate('assignedAgent', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Client.countDocuments(query);

    // Filter sensitive data for agents
    const filteredClients = clients.map(client => {
      if (req.user.role === 'agent') {
        return {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          country: client.country,
          status: client.status,
          assignedAgent: client.assignedAgent,
          lastContact: client.lastContact,
          createdAt: client.createdAt
        };
      }
      return client;
    });

    res.json({
      clients: filteredClients,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
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
    const client = await Client.create({
      ...req.body,
      assignedAgent: req.body.assignedAgent || req.user._id
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

    client = await Client.findByIdAndUpdate(req.params.id, req.body, {
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

    // Filter sensitive data for agents
    if (req.user.role === 'agent') {
      const filteredClient = {
        _id: client._id,
        firstName: client.firstName,
        lastName: client.lastName,
        country: client.country,
        status: client.status,
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
    const { format = 'json' } = req.query;
    
    // Build query
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'agent') {
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
        if (!clientData.firstName || !clientData.lastName || !clientData.email) {
          errors.push(`Row ${i + 1}: Missing required fields (firstName, lastName, email)`);
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
          lastName: clientData.lastName,
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

module.exports = {
  getClients,
  createClient,
  updateClient,
  getClientById,
  getUniqueCountries,
  getAvailableAgents,
  assignClients,
  exportClients,
  importClients
};