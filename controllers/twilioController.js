const twilio = require('twilio');
const Communication = require('../models/communicationModel');
const Client = require('../models/clientModel');
const User = require('../models/userModel');

const config = require('../config/env');

// Twilio configuration
const accountSid = config.TWILIO_ACCOUNT_SID;
const authToken = config.TWILIO_AUTH_TOKEN;
const phoneNumber = config.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// Debug Twilio client initialization
console.log('Twilio client initialized with:');
console.log('Account SID:', accountSid);
console.log('Auth Token:', authToken ? '***' + authToken.slice(-4) : 'NOT SET');
console.log('Phone Number:', phoneNumber);

// @desc    Make a voice call using Twilio
// @route   POST /api/twilio/call
// @access  Private
const makeCall = async (req, res) => {
  try {
    console.log('=== makeCall function started ===');
    const { clientId, phoneNumber: toNumber, agentId } = req.body;

    console.log('makeCall request body:', req.body);

    if (!clientId || !toNumber) {
      console.log('Missing required fields:', { clientId, toNumber });
      return res.status(400).json({ message: 'Client ID and phone number are required' });
    }

    // Get client information (allow demo client for testing)
    let clientData;
    if (clientId === 'demo-client-123') {
      // Create a demo client object for testing
      clientData = {
        _id: 'demo-client-123',
        firstName: 'Demo',
        lastName: 'Client',
        phone: toNumber,
        email: 'demo@example.com'
      };
      console.log('Using demo client for testing');
    } else {
      clientData = await Client.findById(clientId);
      if (!clientData) {
        console.log('Client not found:', clientId);
        return res.status(404).json({ message: 'Client not found' });
      }
    }

    console.log('Original phone number:', toNumber);
    // Validate phone number format
    const validatedNumber = validatePhoneNumber(toNumber);
    console.log('Validated phone number:', validatedNumber);
    
    if (!validatedNumber) {
      console.log('Phone number validation failed for:', toNumber);
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Create communication record (skip for demo client)
    let communication;
    if (clientId === 'demo-client-123') {
      // Create a demo communication record
      communication = {
        _id: 'demo-comm-' + Date.now(),
        type: 'call',
        client: clientId,
        agent: agentId || req.user.id,
        direction: 'outbound',
        channel: 'voip',
        phoneNumber: validatedNumber,
        status: 'pending',
        notes: 'Twilio voice call (demo)',
        metadata: {
          twilioCall: true,
          fromNumber: phoneNumber
        }
      };
      console.log('Created demo communication record');
    } else {
      communication = await Communication.create({
        type: 'call',
        client: clientId,
        agent: agentId || req.user.id,
        direction: 'outbound',
        channel: 'voip',
        phoneNumber: validatedNumber,
        status: 'pending',
        notes: 'Twilio voice call',
        metadata: {
          twilioCall: true,
          fromNumber: phoneNumber
        }
      });
    }

    // Make the call using Twilio
    console.log('About to create Twilio call with:');
    console.log('To:', validatedNumber);
    console.log('From:', phoneNumber);
    
    // Call the target number directly
    const call = await client.calls.create({
      to: validatedNumber,
      from: phoneNumber,
      twiml: `<Response>
        <Say voice="alice" language="en-US">Hello! This is a call from your CRM system.</Say>
        <Pause length="2"/>
        <Say voice="alice" language="en-US">Thank you for using our CRM system. Goodbye!</Say>
      </Response>`
    });
    
    console.log('Twilio call created successfully:', call.sid);

    // Update communication record with Twilio call SID (skip for demo)
    if (clientId !== 'demo-client-123') {
      await Communication.findByIdAndUpdate(communication._id, {
        'metadata.twilioCallSid': call.sid,
        'metadata.twilioStatus': call.status
      });
    } else {
      // Update demo communication record
      communication.metadata.twilioCallSid = call.sid;
      communication.metadata.twilioStatus = call.status;
      console.log('Updated demo communication record with call SID:', call.sid);
    }

    res.json({
      success: true,
      message: 'Call initiated successfully',
      callSid: call.sid,
      status: call.status,
      communicationId: communication._id,
      phoneNumber: validatedNumber
    });

  } catch (error) {
    console.error('Error making Twilio call:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to initiate call',
      error: error.message 
    });
  }
};

// @desc    End a call
// @route   POST /api/twilio/end-call
// @access  Private
const endCall = async (req, res) => {
  try {
    const { callSid } = req.body;

    if (!callSid) {
      return res.status(400).json({ message: 'Call SID is required' });
    }

    // End the call using Twilio
    const call = await client.calls(callSid).update({ status: 'completed' });

    // Update communication record
    await Communication.findOneAndUpdate(
      { 'metadata.twilioCallSid': callSid },
      { 
        status: 'completed',
        'metadata.twilioStatus': call.status,
        'metadata.duration': call.duration
      }
    );

    res.json({
      success: true,
      message: 'Call ended successfully',
      status: call.status,
      duration: call.duration
    });

  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to end call',
      error: error.message 
    });
  }
};

// @desc    Get call status
// @route   GET /api/twilio/call-status/:callSid
// @access  Private
const getCallStatus = async (req, res) => {
  try {
    const { callSid } = req.params;

    const call = await client.calls(callSid).fetch();

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      duration: call.duration,
      direction: call.direction,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime
    });

  } catch (error) {
    console.error('Error getting call status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get call status',
      error: error.message 
    });
  }
};

// @desc    Get recent calls
// @route   GET /api/twilio/recent-calls
// @access  Private
const getRecentCalls = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const calls = await client.calls.list({
      limit: parseInt(limit),
      status: 'completed'
    });

    const callsWithDetails = calls.map(call => ({
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      direction: call.direction,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
      price: call.price,
      priceUnit: call.priceUnit
    }));

    res.json({
      success: true,
      calls: callsWithDetails,
      count: callsWithDetails.length
    });

  } catch (error) {
    console.error('Error getting recent calls:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get recent calls',
      error: error.message 
    });
  }
};

// @desc    Generate TwiML for voice calls
// @route   POST /api/twilio/twiml/voice
// @access  Public (Twilio webhook)
const generateTwiML = async (req, res) => {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const toNumber = req.body.To;
    const fromNumber = req.body.From;

    console.log(`Generating TwiML for call from ${fromNumber} to ${toNumber}`);

    // Say a brief welcome message
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Hello! This is a call from your CRM system. Connecting you now.');
    
    // Add a pause
    twiml.pause({ length: 1 });

    // Connect the call (simplified for localhost)
    const dial = twiml.dial({
      callerId: fromNumber,
      timeout: 30,
      record: 'record-from-answer'
    });

    // Connect to the called number
    dial.number(toNumber);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Error generating TwiML:', error);
    res.status(500).send('Error generating TwiML');
  }
};

// @desc    Handle call status callbacks
// @route   POST /api/twilio/status-callback
// @access  Public (Twilio webhook)
const handleStatusCallback = async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      From,
      To,
      Direction
    } = req.body;

    console.log(`Call status update: ${CallSid} - ${CallStatus}`);

    // Update communication record
    await Communication.findOneAndUpdate(
      { 'metadata.twilioCallSid': CallSid },
      { 
        status: CallStatus === 'completed' ? 'completed' : 'in-progress',
        'metadata.twilioStatus': CallStatus,
        'metadata.duration': CallDuration || 0,
        'metadata.lastUpdate': new Date()
      }
    );

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling status callback:', error);
    res.status(500).send('Error');
  }
};

// @desc    Handle recording callbacks
// @route   POST /api/twilio/recording-callback
// @access  Public (Twilio webhook)
const handleRecordingCallback = async (req, res) => {
  try {
    const {
      RecordingSid,
      RecordingStatus,
      RecordingUrl,
      CallSid
    } = req.body;

    console.log(`Recording callback: ${RecordingSid} - ${RecordingStatus}`);

    if (RecordingStatus === 'completed') {
      // Update communication record with recording URL
      await Communication.findOneAndUpdate(
        { 'metadata.twilioCallSid': CallSid },
        { 
          'metadata.recordingSid': RecordingSid,
          'metadata.recordingUrl': RecordingUrl,
          'metadata.recordingStatus': RecordingStatus
        }
      );
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error handling recording callback:', error);
    res.status(500).send('Error');
  }
};

// @desc    Handle connect action
// @route   POST /api/twilio/connect-action
// @access  Public (Twilio webhook)
const handleConnectAction = async (req, res) => {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const dialCallStatus = req.body.DialCallStatus;

    console.log(`Connect action: ${dialCallStatus}`);

    if (dialCallStatus === 'answered') {
      // Call was answered - allow conversation to continue
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'You are now connected. You can start your conversation.');
      twiml.pause({ length: 300 }); // 5-minute conversation time
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for using our CRM system. Goodbye!');
    } else {
      // Call was not answered
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'The call was not answered. Thank you for using our CRM system.');
    }

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Error handling connect action:', error);
    res.status(500).send('Error');
  }
};

// @desc    Get Twilio account information
// @route   GET /api/twilio/account-info
// @access  Private
const getAccountInfo = async (req, res) => {
  try {
    // Return static account info for localhost development
    res.json({
      success: true,
      accountSid: accountSid,
      accountName: 'CRM Twilio Account',
      status: 'active',
      balance: 'N/A',
      currency: 'USD',
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('Error getting account info:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get account info',
      error: error.message 
    });
  }
};

// Helper function to validate phone number format
const validatePhoneNumber = (phoneNumber) => {
  console.log('validatePhoneNumber input:', phoneNumber);
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  console.log('Cleaned phone number:', cleaned);
  
  // Check if it's a valid US number (10 digits) or international (11+ digits)
  if (cleaned.length === 10) {
    const result = `+1${cleaned}`; // Add US country code
    console.log('US number result:', result);
    return result;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const result = `+${cleaned}`; // Already has US country code
    console.log('US number with country code result:', result);
    return result;
  } else if (cleaned.length >= 10) {
    const result = `+${cleaned}`; // International number
    console.log('International number result:', result);
    return result;
  }
  
  console.log('Invalid phone number length:', cleaned.length);
  return null; // Invalid number
};

module.exports = {
  makeCall,
  endCall,
  getCallStatus,
  getRecentCalls,
  generateTwiML,
  handleStatusCallback,
  handleRecordingCallback,
  handleConnectAction,
  getAccountInfo
};
