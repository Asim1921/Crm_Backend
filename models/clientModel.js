
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  clientId: {
    type: String,
    unique: true,
    required: function() {
      // Only require clientId if the document is not new (has been saved before)
      return !this.isNew;
    },
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty for new documents
        return /^\d{6}$/.test(v);
      },
      message: 'Client ID must be exactly 6 digits'
    }
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['New Lead', 'Call Again', 'No Answer', 'Hang Up', 'Not Interested', 'FTD', 'FTD RETENTION', 'NA5UP'],
    default: 'New Lead'
  },
  campaign: {
    type: String,
    enum: ['Data', 'Affiliate'],
    default: 'Data'
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    content: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastContact: {
    type: Date,
    default: Date.now
  },
  value: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Pre-save middleware to generate unique clientId
clientSchema.pre('save', async function(next) {
  try {
    // Only generate clientId if it doesn't exist (new document)
    if (!this.clientId) {
      let clientId;
      let isUnique = false;
      
      // Keep generating until we get a unique ID
      while (!isUnique) {
        clientId = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Check if this ID already exists
        const existingClient = await this.constructor.findOne({ clientId });
        if (!existingClient) {
          isUnique = true;
        }
      }
      
      this.clientId = clientId;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Index for search functionality
clientSchema.index({ 
  clientId: 'text',
  firstName: 'text', 
  lastName: 'text', 
  email: 'text', 
  country: 'text' 
});

module.exports = mongoose.model('Client', clientSchema);