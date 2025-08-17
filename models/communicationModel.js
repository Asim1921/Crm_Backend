const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['call', 'message', 'email'],
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending'
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  content: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  channel: {
    type: String,
    enum: ['phone', 'whatsapp', 'telegram', 'email', 'voip'],
    required: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  scheduledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
communicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Communication', communicationSchema);
