const KYC = require('../models/kycModel');
const User = require('../models/userModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/kyc';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Only images and PDF files are allowed. Got: ${file.mimetype}`));
    }
  }
});

// @desc    Submit KYC documents
// @route   POST /api/kyc/submit
// @access  Private
const submitKyc = async (req, res) => {
  try {
    console.log('=== KYC SUBMIT REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Request headers:', req.headers);
    
    const { fullName, idNumber, country, userId } = req.body;

    // Validate required fields
    if (!fullName || !idNumber || !country || !userId) {
      console.log('Missing required fields:', { fullName, idNumber, country, userId });
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already has a KYC submission
    const existingKyc = await KYC.findOne({ userId });
    if (existingKyc) {
      return res.status(400).json({ message: 'KYC documents already submitted' });
    }

    // Prepare document data
    const documents = {};
    const documentTypes = ['selfie', 'idFront', 'idBack', 'paymentProof', 'bankStatement', 'utilityBill'];

    documentTypes.forEach(docType => {
      if (req.files && req.files[docType]) {
        const file = req.files[docType][0];
        documents[docType] = {
          fileName: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          uploadedAt: new Date()
        };
      }
    });

    // Create KYC record
    const kyc = new KYC({
      userId,
      fullName,
      idNumber,
      country,
      documents
    });

    await kyc.save();

    res.status(201).json({
      message: 'KYC documents submitted successfully',
      kyc: {
        _id: kyc._id,
        fullName: kyc.fullName,
        idNumber: kyc.idNumber,
        country: kyc.country,
        status: kyc.status,
        createdAt: kyc.createdAt
      }
    });
  } catch (error) {
    console.error('Error submitting KYC:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's KYC data
// @route   GET /api/kyc/user/:userId
// @access  Private
const getUserKyc = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is accessing their own data or is admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const kyc = await KYC.findOne({ userId }).populate('userId', 'firstName lastName email');

    if (!kyc) {
      return res.status(404).json({ message: 'KYC data not found' });
    }

    res.json(kyc);
  } catch (error) {
    console.error('Error fetching user KYC:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all KYC submissions (Admin only)
// @route   GET /api/kyc/all
// @access  Private (Admin)
const getAllKyc = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const kycData = await KYC.find()
      .populate('userId', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(kycData);
  } catch (error) {
    console.error('Error fetching all KYC data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Download KYC document
// @route   GET /api/kyc/:kycId/download/:documentType
// @access  Private
const downloadDocument = async (req, res) => {
  try {
    const { kycId, documentType } = req.params;

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    // Check if user has access to this KYC data
    if (req.user._id.toString() !== kyc.userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const document = kyc.documents[documentType];
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Try both old path and new user-specific path
    const oldFilePath = path.join(__dirname, '../uploads/kyc', document.fileName);
    const userFilePath = path.join(__dirname, '../uploads/kyc/user_' + kyc.userId, document.fileName);
    
    let filePath;
    if (fs.existsSync(userFilePath)) {
      filePath = userFilePath;
    } else if (fs.existsSync(oldFilePath)) {
      filePath = oldFilePath;
    } else {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update KYC status (Admin only)
// @route   PUT /api/kyc/:kycId/status
// @access  Private (Admin)
const updateKycStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { kycId } = req.params;
    const { status, reviewNotes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    kyc.status = status;
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    if (reviewNotes) {
      kyc.reviewNotes = reviewNotes;
    }

    await kyc.save();

    res.json({
      message: 'KYC status updated successfully',
      kyc: {
        _id: kyc._id,
        status: kyc.status,
        reviewedBy: kyc.reviewedBy,
        reviewedAt: kyc.reviewedAt,
        reviewNotes: kyc.reviewNotes
      }
    });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete KYC submission (Admin only)
// @route   DELETE /api/kyc/:kycId
// @access  Private (Admin)
const deleteKyc = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { kycId } = req.params;

    const kyc = await KYC.findById(kycId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC record not found' });
    }

    // Delete associated files
    const documentTypes = ['selfie', 'idFront', 'idBack', 'paymentProof', 'bankStatement', 'utilityBill'];
    documentTypes.forEach(docType => {
      const document = kyc.documents[docType];
      if (document && document.fileName) {
        // Try both old path and new user-specific path
        const oldFilePath = path.join(__dirname, '../uploads/kyc', document.fileName);
        const userFilePath = path.join(__dirname, '../uploads/kyc/user_' + kyc.userId, document.fileName);
        
        if (fs.existsSync(userFilePath)) {
          fs.unlinkSync(userFilePath);
        } else if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    });

    await KYC.findByIdAndDelete(kycId);

    res.json({ message: 'KYC submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting KYC:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit KYC documents (JSON with base64)
// @route   POST /api/kyc/submit-json
// @access  Private
const submitKycJson = async (req, res) => {
  try {
    console.log('=== KYC JSON SUBMIT REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('User from auth:', req.user);
    
    const { fullName, idNumber, country } = req.body;
    const userId = req.user._id; // Get userId from authenticated user

    console.log('Extracted fields:', { fullName, idNumber, country, userId });

    // Validate required fields
    if (!fullName || !idNumber || !country) {
      console.log('Missing required fields:', { fullName, idNumber, country });
      return res.status(400).json({ 
        message: 'All fields are required',
        received: { fullName, idNumber, country, userId }
      });
    }

    // Check if user already has a KYC submission
    const existingKyc = await KYC.findOne({ userId });
    if (existingKyc) {
      // If KYC is already approved or rejected, don't allow updates
      if (existingKyc.status === 'approved' || existingKyc.status === 'rejected') {
        return res.status(400).json({ 
          message: 'KYC has already been processed. Cannot update approved/rejected submissions.',
          status: existingKyc.status
        });
      }
      console.log('Updating existing pending KYC submission for user:', userId);
    }

    // Process base64 documents from JSON
    const processedDocuments = {};
    const documentTypes = ['selfie', 'idFront', 'idBack', 'paymentProof', 'bankStatement', 'utilityBill'];

    if (req.body.documents) {
      for (const docType of documentTypes) {
        const base64Data = req.body.documents[docType];
        if (base64Data) {
          console.log(`Processing ${docType} document`);
          const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            const mimeType = matches[1];
            const base64String = matches[2];
            const buffer = Buffer.from(base64String, 'base64');
            
            // Create unique filename
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const extension = mimeType.includes('pdf') ? '.pdf' : '.jpg';
            const fileName = `${docType}-${uniqueSuffix}${extension}`;
            
            // Create user-specific directory
            const userDir = `uploads/kyc/user_${userId}`;
            if (!fs.existsSync(userDir)) {
              fs.mkdirSync(userDir, { recursive: true });
            }
            
            // Save file in user-specific directory
            const filePath = path.join(userDir, fileName);
            fs.writeFileSync(filePath, buffer);
            
            processedDocuments[docType] = {
              fileName: fileName,
              originalName: `${docType}${extension}`,
              mimeType: mimeType,
              size: buffer.length,
              uploadedAt: new Date()
            };
            
            console.log(`Saved ${docType} document: ${fileName}`);
          } else {
            console.log(`Invalid base64 format for ${docType}`);
          }
        }
      }
    }

    // Create or update KYC record
    const kycData = {
      userId,
      fullName,
      idNumber,
      country,
      documents: processedDocuments,
      status: 'pending',
      submittedAt: new Date()
    };

    let kyc;
    if (existingKyc) {
      // Delete old files before updating
      if (existingKyc.documents) {
        for (const [docType, docData] of Object.entries(existingKyc.documents)) {
          if (docData && docData.fileName) {
            // Try both old path (uploads/kyc) and new user-specific path
            const oldFilePath = path.join('uploads/kyc', docData.fileName);
            const userFilePath = path.join('uploads/kyc/user_' + userId, docData.fileName);
            
            try {
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log('Deleted old file:', oldFilePath);
              } else if (fs.existsSync(userFilePath)) {
                fs.unlinkSync(userFilePath);
                console.log('Deleted old file:', userFilePath);
              }
            } catch (error) {
              console.error('Error deleting old file:', error);
            }
          }
        }
      }
      
      // Update existing KYC
      kyc = await KYC.findByIdAndUpdate(
        existingKyc._id,
        { 
          ...kycData,
          updatedAt: new Date()
        },
        { new: true }
      );
      res.status(200).json({ message: 'KYC documents updated successfully', kyc });
    } else {
      // Create new KYC
      kyc = await KYC.create(kycData);
      res.status(201).json({ message: 'KYC documents submitted successfully', kyc });
    }
    
  } catch (error) {
    console.error('Error in submitKycJson:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  submitKyc,
  submitKycJson,
  getUserKyc,
  getAllKyc,
  downloadDocument,
  updateKycStatus,
  deleteKyc,
  upload
};
