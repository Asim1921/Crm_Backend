const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  idNumber: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  documents: {
    selfie: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    idFront: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    idBack: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    paymentProof: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    bankStatement: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    utilityBill: {
      fileName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
kycSchema.index({ userId: 1 });
kycSchema.index({ status: 1 });
kycSchema.index({ createdAt: -1 });

module.exports = mongoose.model('KYC', kycSchema);
