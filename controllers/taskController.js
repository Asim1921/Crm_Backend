const Task = require('../models/taskModel');
const Client = require('../models/clientModel');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status || '';
    const assignedTo = req.query.assignedTo || '';

    const skip = (page - 1) * limit;

    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Role-based filtering
    if (req.user.role === 'agent') {
      query.assignedTo = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('client', 'firstName lastName email country')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ dueDate: 1 });

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
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

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      createdBy: req.user._id
    });

    await task.populate([
      { path: 'client', select: 'firstName lastName email country' },
      { path: 'assignedTo', select: 'firstName lastName' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate([
      { path: 'client', select: 'firstName lastName email country' },
      { path: 'assignedTo', select: 'firstName lastName' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask
};