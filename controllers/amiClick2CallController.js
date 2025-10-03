const { spawn } = require('child_process');
const path = require('path');
const User = require('../models/userModel');
const amiConfig = require('../config/amiConfig');

// AMI Click2Call Controller
// This controller integrates the Python AMI script for direct Asterisk calling

/**
 * Make a call using the Python AMI script
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const makeAmiCall = async (req, res) => {
  try {
    console.log('=== AMI Click2Call - makeAmiCall function called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request user:', req.user ? { id: req.user._id, email: req.user.email } : 'No user');
    
    const { phoneNumber, context, ringtime, CallerID, name, other } = req.body;
    
    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Get user's extension from the authenticated user
    const userId = req.user._id;
    console.log('Looking up user with ID:', userId);
    
    const user = await User.findById(userId);
    console.log('User found:', user ? { id: user._id, email: user.email, extension: user.extension } : 'No user found');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const extension = user.extension || '1000';
    console.log('Using extension:', extension);

    // Format phone number (remove all non-digits)
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // Validate phone number length
    if (formattedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number. Must be at least 10 digits.'
      });
    }
    
    // If it's a US number (10 digits), add +1
    if (formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }
    
    // If it starts with +, remove it
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Validate extension
    if (!extension || extension.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Invalid extension. Please contact administrator to set up your extension.'
      });
    }
    
    console.log('Call parameters:', {
      originalPhone: phoneNumber,
      formattedPhone: formattedPhone,
      extension: extension,
      context: context || 'click to call',
      ringtime: ringtime || '30',
      CallerID: CallerID || 'Anonymous'
    });

    // Path to the Python script
    const pythonScriptPath = path.join(__dirname, amiConfig.pythonScriptPath);
    
    // Execute the Python script with phone number and extension as arguments
    const pythonProcess = spawn(amiConfig.pythonCommand, [pythonScriptPath, formattedPhone, extension], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Collect output from Python script
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Python stdout:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Python stderr:', data.toString());
    });

    let responseSent = false;

    // Handle process completion
    pythonProcess.on('close', (code) => {
      if (responseSent) return;
      responseSent = true;
      
      console.log(`Python script exited with code ${code}`);
      
      if (code === 0) {
        // Success
        console.log('AMI call initiated successfully');
        res.json({
          success: true,
          message: 'Call initiated successfully. Asterisk will call your extension first, then connect you to the target number.',
          callId: `ami_call_${Date.now()}`,
          status: 'initiated',
          communicationId: `comm_${Date.now()}`,
          phoneNumber: phoneNumber,
          extension: extension,
          output: stdout,
          method: 'AMI'
        });
      } else {
        // Error
        console.error('AMI call failed:', stderr);
        res.status(500).json({
          success: false,
          error: 'Failed to initiate AMI call',
          message: stderr || 'Unknown error occurred',
          output: stdout,
          errorCode: code
        });
      }
    });

    // Handle process errors
    pythonProcess.on('error', (error) => {
      if (responseSent) return;
      responseSent = true;
      
      console.error('Failed to start Python process:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute AMI script',
        message: error.message,
        details: 'Python script could not be executed. Please ensure Python is installed and the script path is correct.'
      });
    });

    // Set timeout for the Python process (30 seconds)
    const timeoutId = setTimeout(() => {
      if (!pythonProcess.killed && !responseSent) {
        responseSent = true;
        pythonProcess.kill();
        console.log('Python process timed out and was killed');
        res.status(408).json({
          success: false,
          error: 'AMI call timeout',
          message: 'The call initiation took too long to complete',
          details: 'Process timed out after 30 seconds'
        });
      }
    }, 30000);

    // Clear timeout if process completes normally
    pythonProcess.on('close', () => {
      clearTimeout(timeoutId);
    });

  } catch (error) {
    console.error('=== AMI Click2Call Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error details:', error);
    console.error('================================');
    
    // Check if response has already been sent
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to initiate AMI call',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : 'Internal server error'
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
};

/**
 * Test AMI connection and configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const testAmiConnection = async (req, res) => {
  try {
    console.log('=== Testing AMI Connection ===');
    
    // Get user's extension for testing
    const userId = req.user._id;
    const user = await User.findById(userId);
    const extension = user?.extension || '1000';
    
    // Path to the Python script
    const pythonScriptPath = path.join(__dirname, amiConfig.pythonScriptPath);
    
    // Test with a dummy number
    const testPhone = '1234567890';
    
    console.log('Testing with:', { testPhone, extension, scriptPath: pythonScriptPath });
    
    // Execute the Python script in test mode
    const pythonProcess = spawn(amiConfig.pythonCommand, [pythonScriptPath, testPhone, extension], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    let testResponseSent = false;

    pythonProcess.on('close', (code) => {
      if (testResponseSent) return;
      testResponseSent = true;
      
      console.log(`AMI test completed with code ${code}`);
      
      res.json({
        success: code === 0,
        message: code === 0 ? 'AMI connection test successful' : 'AMI connection test failed',
        exitCode: code,
        output: stdout,
        error: stderr,
        testData: {
          phone: testPhone,
          extension: extension,
          scriptPath: pythonScriptPath
        }
      });
    });

    pythonProcess.on('error', (error) => {
      if (testResponseSent) return;
      testResponseSent = true;
      
      console.error('Failed to start Python process for test:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute AMI test script',
        message: error.message,
        details: 'Python script could not be executed. Please ensure Python is installed and the script path is correct.'
      });
    });

    // Set timeout for the test (10 seconds)
    const testTimeoutId = setTimeout(() => {
      if (!pythonProcess.killed && !testResponseSent) {
        testResponseSent = true;
        pythonProcess.kill();
        res.status(408).json({
          success: false,
          error: 'AMI test timeout',
          message: 'The AMI connection test took too long to complete'
        });
      }
    }, 10000);

    // Clear timeout if process completes normally
    pythonProcess.on('close', () => {
      clearTimeout(testTimeoutId);
    });

  } catch (error) {
    console.error('AMI connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test AMI connection',
      message: error.message
    });
  }
};

/**
 * Get AMI service status and configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAmiStatus = async (req, res) => {
  try {
    console.log('=== Getting AMI Status ===');
    
    // Get user info
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Path to the Python script
    const pythonScriptPath = path.join(__dirname, amiConfig.pythonScriptPath);
    
    res.json({
      success: true,
      serviceName: 'AMI Click2Call',
      method: 'Asterisk Manager Interface',
      user: {
        id: user._id,
        email: user.email,
        extension: user.extension || '1000'
      },
      configuration: {
        scriptPath: pythonScriptPath,
        host: amiConfig.host,
        port: amiConfig.port,
        username: amiConfig.username,
        context: amiConfig.context,
        callerId: amiConfig.callerId,
        timeout: amiConfig.timeout,
        protocol: 'AMI'
      },
      status: 'ready',
      lastChecked: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get AMI status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AMI status',
      message: error.message
    });
  }
};

/**
 * Get user info for AMI debugging
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAmiUserInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        extension: user.extension || '1000',
        role: user.role
      },
      amiInfo: {
        extension: user.extension || '1000',
        channel: `Local/${user.extension || '1000'}@from-internal`,
        callerId: 'Anonymous'
      }
    });
  } catch (error) {
    console.error('Get AMI user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get AMI user info',
      message: error.message
    });
  }
};

module.exports = {
  makeAmiCall,
  testAmiConnection,
  getAmiStatus,
  getAmiUserInfo
};
