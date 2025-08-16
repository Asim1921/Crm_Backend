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

module.exports = {
  getClients,
  createClient,
  updateClient,
  getClientById
};