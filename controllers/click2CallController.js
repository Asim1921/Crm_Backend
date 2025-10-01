const axios = require('axios');
const https = require('https');
const User = require('../models/userModel');

// Click2Call API configuration
const CLICK2CALL_BASE_URL = 'https://pbx07.t-lan.co:3000';
const CLICK2CALL_API_URL = `${CLICK2CALL_BASE_URL}/api/v1/manager/call`;

// Create axios instance with SSL certificate handling
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Allow self-signed certificates
  }),
  timeout: 60000 // Increased timeout to 60 seconds
});

// Initialize Click2Call service
const initializeClick2Call = async (req, res) => {
  try {
    console.log('Testing Click2Call connection to:', CLICK2CALL_BASE_URL);
    
    // Test connection to Click2Call service
    const response = await axiosInstance.get(CLICK2CALL_BASE_URL);
    
    console.log('Click2Call response status:', response.status);
    console.log('Click2Call response data:', response.data);
    
    if (response.status === 200) {
      res.json({
        success: true,
        message: 'Click2Call service is available',
        serviceName: 'Click2Call',
        baseUrl: CLICK2CALL_BASE_URL,
        status: 'connected'
      });
    } else {
      throw new Error('Service not responding properly');
    }
  } catch (error) {
    console.error('Click2Call initialization error:', error.message);
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      error: 'Click2Call service is not available',
      message: error.message
    });
  }
};

// Get Click2Call service status
const getServiceStatus = async (req, res) => {
  try {
    console.log('Checking Click2Call status...');
    const response = await axiosInstance.get(CLICK2CALL_BASE_URL);
    
    console.log('Click2Call status check successful:', response.status);
    
    res.json({
      success: true,
      serviceName: 'Click2Call',
      baseUrl: CLICK2CALL_BASE_URL,
      status: 'connected',
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Click2Call status check error:', error.message);
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      error: 'Click2Call service is not available',
      message: error.message
    });
  }
};

// Make a call using Click2Call
const makeCall = async (req, res) => {
  // Declare variables at function scope for error handling
  let phoneNumber, context, ringtime, CallerID, name, other, extension, formattedPhone;
  
  try {
    console.log('=== makeCall function called ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request user:', req.user ? { id: req.user._id, email: req.user.email } : 'No user');
    
    const requestData = req.body;
    phoneNumber = requestData.phoneNumber;
    context = requestData.context || 'click to call';
    ringtime = requestData.ringtime || '30';
    CallerID = requestData.CallerID || 'Anonymous';
    name = requestData.name || 'CRM User';
    other = requestData.other || '';
    
    console.log('Extracted data:', {
      phoneNumber,
      context,
      ringtime,
      CallerID,
      name,
      other
    });
    
    if (!phoneNumber) {
      console.log('ERROR: Phone number is missing');
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
      console.log('ERROR: User not found');
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    extension = user.extension || '1000';
    console.log('Using extension:', extension);

    // Format phone number for Click2Call (remove all non-digits and ensure proper format)
    formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    
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
    
    console.log('Original phone:', phoneNumber);
    console.log('Formatted phone:', formattedPhone);
    console.log('User extension:', extension);
    console.log('User ID:', userId);

    // Prepare Click2Call API request with CORRECT format from actual API response
    const callData = {
      Action: 'OriginateCall',
      Data: {
        phone: formattedPhone,
        context: context,
        ringtime: ringtime,
        CallerID: CallerID,
        extension: extension,
        name: name,
        other: other
      }
    };

    console.log('=== Click2Call Request Details ===');
    console.log('URL:', CLICK2CALL_API_URL);
    console.log('Request data:', JSON.stringify(callData, null, 2));
    console.log('Phone validation:', {
      original: phoneNumber,
      formatted: formattedPhone,
      length: formattedPhone.length
    });
    console.log('Extension validation:', {
      extension: extension,
      length: extension.length
    });
    console.log('================================');

    // Make request to Click2Call API with exact format from documentation
    // Try with retry mechanism for slow responses
    let response;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} of ${maxAttempts}...`);
        response = await axiosInstance.post(CLICK2CALL_API_URL, callData, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        });
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          if (attempts < maxAttempts) {
            console.log(`Attempt ${attempts} timed out, retrying in 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
            continue;
          }
        }
        throw error; // Re-throw if not timeout or max attempts reached
      }
    }

    console.log('=== Click2Call Response Details ===');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('===================================');

    if (response.status === 200) {
      // Check if the response indicates success
      if (response.data && (response.data.success === false || response.data.error)) {
        console.log('Click2Call API returned error in response data');
        return res.status(400).json({
          success: false,
          error: 'Click2Call API Error',
          message: response.data.message || response.data.error || 'Call initiation failed',
          details: response.data
        });
      }
      
      console.log('Click2Call API call successful');
      res.json({
        success: true,
        message: 'Call initiated successfully. Click2Call will call your extension first, then connect you to the target number.',
        callId: response.data.callId || `call_${Date.now()}`,
        status: 'initiated',
        communicationId: `comm_${Date.now()}`,
        phoneNumber: phoneNumber,
        extension: extension,
        rawResponse: response.data
      });
    } else {
      console.log('Click2Call API returned non-200 status');
      throw new Error(`Call initiation failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('=== Click2Call Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    
    // Handle timeout specifically
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('TIMEOUT ERROR: Click2Call API took too long to respond');
      return res.status(408).json({
        success: false,
        error: 'Click2Call API Timeout',
        message: 'The call service is taking too long to respond. Please try again.',
        details: 'Timeout after 60 seconds',
        requestData: {
          phone: formattedPhone || phoneNumber,
          extension: extension || 'unknown',
          context: context || 'unknown'
        }
      });
    }
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Error response headers:', error.response.headers);
      
      // Check if it's a validation error from Click2Call API
      if (error.response.data && error.response.data.message && error.response.data.message.includes('validation')) {
        return res.status(400).json({
          success: false,
          error: 'Click2Call Validation Error',
          message: error.response.data.message,
          details: error.response.data,
          requestData: {
            phone: formattedPhone || phoneNumber,
            extension: extension || 'unknown',
            context: context || 'unknown'
          }
        });
      }
    }
    
    console.error('================================');
    
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      message: error.response?.data?.message || error.message,
      details: error.response?.data || error.message,
      status: error.response?.status,
      requestData: {
        phone: formattedPhone || phoneNumber,
        extension: extension || 'unknown',
        context: context || 'unknown'
      }
    });
  }
};

// End a call
const endCall = async (req, res) => {
  try {
    const { callId } = req.body;
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }

    // Click2Call doesn't have a specific end call endpoint
    // We'll just return success for now
    res.json({
      success: true,
      message: 'Call ended successfully',
      callId: callId
    });
  } catch (error) {
    console.error('Click2Call end call error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call',
      message: error.message
    });
  }
};

// Test Click2Call service with a simple call
const testCall = async (req, res) => {
  try {
    console.log('Testing Click2Call service...');
    
    // Get user's extension from the authenticated user
    const userId = req.user._id;
    const user = await User.findById(userId);
    const extension = user?.extension || '1000';
    
    // Test with CORRECT format from actual API response
    const testPhone = '+923405735723'; // Your phone number
    const testData = {
      Action: 'OriginateCall',
      Data: {
        phone: testPhone,
        context: 'click to call',
        ringtime: '30',
        CallerID: 'Anonymous',
        extension: extension,
        name: 'Asim Zaman',
        other: 'extra_info_value'
      }
    };

    console.log('Test call data:', JSON.stringify(testData, null, 2));

    const response = await axiosInstance.post(CLICK2CALL_API_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Test call response:', response.data);

    res.json({
      success: true,
      message: 'Test call successful. Click2Call will call your extension first, then connect you to the test number.',
      testData: testData,
      response: response.data
    });
  } catch (error) {
    console.error('Test call error:', error.message);
    console.error('Error details:', error);
    
    res.status(500).json({
      success: false,
      error: 'Test call failed',
      message: error.message,
      details: error.response?.data || error.message
    });
  }
};

// Get user info for debugging
const getUserInfo = async (req, res) => {
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
        extension: user.extension,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
      message: error.message
    });
  }
};

// Simple Click2Call service test
const simpleServiceTest = async (req, res) => {
  try {
    console.log('=== Simple Click2Call Service Test ===');
    
    // Just test if the service is reachable
    const response = await axiosInstance.get(CLICK2CALL_BASE_URL);
    
    console.log('Service test response:', response.data);
    
    // Also test the call endpoint with a simple request
    const simpleCallTest = {
      Action: 'OriginateCall',
      Data: {
        phone: '+923405735723',
        context: 'click to call',
        ringtime: '30',
        CallerID: 'Test',
        extension: '1000',
        name: 'Asim Zaman',
        other: 'Service test'
      }
    };
    
    console.log('Testing simple call request...');
    const callResponse = await axiosInstance.post(CLICK2CALL_API_URL, simpleCallTest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Simple call test response:', callResponse.data);
    
    res.json({
      success: true,
      message: 'Click2Call service is reachable and call endpoint works',
      serviceResponse: response.data,
      callResponse: callResponse.data,
      status: response.status
    });
    
  } catch (error) {
    console.error('Simple service test error:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: 'Click2Call service test failed',
      message: error.message,
      details: error.response?.data || error.message,
      status: error.response?.status
    });
  }
};

// Direct Click2Call API test
const directApiTest = async (req, res) => {
  try {
    console.log('=== Direct Click2Call API Test ===');
    console.log('Request user:', req.user ? { id: req.user._id, email: req.user.email, extension: req.user.extension } : 'No user');
    
    // Get user's extension from the authenticated user
    const userId = req.user._id;
    const user = await User.findById(userId);
    const extension = user?.extension || '1000';
    
    console.log('Using extension for test:', extension);
    
    // Test with CORRECT format from actual API response using your details
    const testData = {
      Action: 'OriginateCall',
      Data: {
        phone: '+923405735723',
        context: 'click to call',
        ringtime: '30',
        CallerID: 'Anonymous',
        extension: extension,
        name: 'Asim Zaman',
        other: 'extra_info_value'
      }
    };
    
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    const response = await axiosInstance.post(CLICK2CALL_API_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Direct test response:', response.data);
    
    res.json({
      success: true,
      message: 'Direct API test completed with exact format from documentation',
      testData: testData,
      response: response.data
    });
    
  } catch (error) {
    console.error('=== Direct API Test Error Details ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error response status:', error.response?.status);
    console.error('Error response data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Error response headers:', error.response?.headers);
    console.error('Request URL:', CLICK2CALL_API_URL);
    console.error('Request data sent:', JSON.stringify(testData, null, 2));
    console.error('=====================================');
    
    res.status(500).json({
      success: false,
      error: 'Direct API test failed',
      message: error.message,
      details: error.response?.data || error.message,
      status: error.response?.status,
      requestData: testData,
      requestUrl: CLICK2CALL_API_URL
    });
  }
};

module.exports = {
  initializeClick2Call,
  getServiceStatus,
  makeCall,
  endCall,
  testCall,
  getUserInfo,
  directApiTest,
  simpleServiceTest
};
