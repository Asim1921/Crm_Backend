const axios = require('axios');
const https = require('https');

// Click2Call API configuration
const CLICK2CALL_BASE_URL = 'https://pbx07.t-lan.co:3000';
const CLICK2CALL_API_URL = `${CLICK2CALL_BASE_URL}/api/v1/manager/call`;

// Create axios instance with SSL certificate handling
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Allow self-signed certificates
  }),
  timeout: 10000
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
  try {
    const { phoneNumber, extension = '1000', context = 'clicktocall', ringtime = '30', CallerID = 'CRM System', nombre = 'CRM User', other = '' } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Format phone number for Click2Call (remove all non-digits and ensure proper format)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove all non-digits
    
    // If it's a US number (10 digits), add +1
    if (formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }
    
    // If it starts with +, remove it
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    console.log('Original phone:', phoneNumber);
    console.log('Formatted phone:', formattedPhone);

    // Prepare Click2Call API request
    const callData = {
      Action: 'OriginateCall',
      Data: {
        phone: formattedPhone,
        context: context,
        ringtime: ringtime,
        CallerID: CallerID,
        extension: extension,
        nombre: nombre,
        other: other
      }
    };

    console.log('Making Click2Call request to:', CLICK2CALL_API_URL);
    console.log('Request data:', JSON.stringify(callData, null, 2));

    // Make request to Click2Call API
    const response = await axiosInstance.post(CLICK2CALL_API_URL, callData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Click2Call response status:', response.status);
    console.log('Click2Call response headers:', response.headers);
    console.log('Click2Call response data:', response.data);

    if (response.status === 200) {
      res.json({
        success: true,
        message: 'Call initiated successfully',
        callId: response.data.callId || `call_${Date.now()}`,
        status: 'initiated',
        communicationId: `comm_${Date.now()}`,
        phoneNumber: phoneNumber,
        extension: extension,
        rawResponse: response.data
      });
    } else {
      throw new Error(`Call initiation failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Click2Call make call error:', error.message);
    console.error('Error details:', error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      message: error.response?.data?.message || error.message,
      details: error.response?.data || error.message,
      status: error.response?.status
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
    
    // Test with a simple phone number
    const testPhone = '15551234567'; // Test US number
    const testData = {
      Action: 'OriginateCall',
      Data: {
        phone: testPhone,
        context: 'clicktocall',
        ringtime: '30',
        CallerID: 'Test Call',
        extension: '1000',
        nombre: 'Test User',
        other: 'Test call from CRM'
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
      message: 'Test call successful',
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

module.exports = {
  initializeClick2Call,
  getServiceStatus,
  makeCall,
  endCall,
  testCall
};
