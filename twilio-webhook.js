const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const twilio = require('twilio');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Twilio webhook endpoint for voice calls (POST for actual webhooks)
app.post('/twiml/voice', (request, response) => {
  console.log('Twilio webhook received:', request.body);

  // Create TwiML response
  const twiml = new VoiceResponse();

  // Get the 'To' number from the request
  const toNumber = request.body.To;

  // Connect the call directly for real-time conversation (no recorded message)
  const dial = twiml.dial({
    callerId: request.body.From,
    timeout: 30,
    record: 'record-from-answer',
    recordingStatusCallback: 'https://2a152400c10e.ngrok-free.app/api/recording-status'
  });

  // Connect to the called number
  dial.number(toNumber);

  // Send the TwiML response
  response.type('text/xml');
  response.send(twiml.toString());
});

// GET endpoint for testing/debugging
app.get('/twiml/voice', (request, response) => {
  console.log('GET request to /twiml/voice - creating test TwiML');

  // Create TwiML response for testing
  const twiml = new VoiceResponse();
  twiml.say('Test TwiML endpoint is working. This is a GET request.');
  twiml.hangup();

  response.type('text/xml');
  response.send(twiml.toString());
});

// Connect action endpoint - Direct connection only
app.post('/twiml/connect-action', (request, response) => {
  console.log('Connect action received:', request.body);

  // Create TwiML response
  const twiml = new VoiceResponse();

  // Check if the call was answered
  const dialCallStatus = request.body.DialCallStatus;

  if (dialCallStatus === 'answered') {
    // Call was answered - allow conversation to continue immediately
    // NO recorded messages - just let the conversation flow naturally
    twiml.pause({ length: 300 }); // 5-minute conversation time
  } else {
    // Call was not answered - just hang up
    twiml.hangup();
  }

  // Send the TwiML response
  response.type('text/xml');
  response.send(twiml.toString());
});

// Status callback endpoint (POST for actual callbacks)
app.post('/api/call-status', (request, response) => {
  console.log('Call status update:', request.body);

  // You can store call status updates in your database here
  const callSid = request.body.CallSid;
  const callStatus = request.body.CallStatus;
  const callDuration = request.body.CallDuration;

  console.log(`Call ${callSid} status: ${callStatus}, duration: ${callDuration}`);

  response.status(200).send('OK');
});

// GET endpoint for testing/debugging
app.get('/api/call-status', (request, response) => {
  console.log('GET request to /api/call-status - endpoint is working');
  response.json({
    status: 'OK',
    message: 'Call status endpoint is working',
    method: 'GET'
  });
});

// Recording status callback endpoint
app.post('/api/recording-status', (request, response) => {
  console.log('Recording status update:', request.body);

  const recordingSid = request.body.RecordingSid;
  const recordingStatus = request.body.RecordingStatus;
  const recordingUrl = request.body.RecordingUrl;

  console.log(`Recording ${recordingSid} status: ${recordingStatus}, URL: ${recordingUrl}`);

  response.status(200).send('OK');
});

// Health check endpoint
app.get('/health', (request, response) => {
  response.json({ status: 'OK', message: 'Twilio webhook server is running' });
});

// Generate Twilio Client token for browser-based calling
app.post('/api/token', (request, response) => {
  try {
    console.log('Token request received:', request.body);
    
    const accountSid = 'AC2e749f3b25fc86afa0dd6937206d95ec';
    const authToken = 'fd74dacc077f671da704bf0570b50041';
    const apiKeySid = 'SK8f332404eee9c47bf39777429b450eee';
    const apiKeySecret = 'fd74dacc077f671da704bf0570b50041';

    // Get identity from request body or use default
    const identity = request.body?.identity || 'crm-agent';

    // Create an access token with identity
    const token = new twilio.jwt.AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { identity: identity }
    );

    // Add Voice grant for browser-based calling
    const voiceGrant = new twilio.jwt.AccessToken.VoiceGrant({
      outgoingApplicationSid: 'AP32523e109f0ac488a4b54407092b7ab3', // TwiML App SID for browser calls
      incomingAllow: true
    });

    token.addGrant(voiceGrant);

    const tokenResponse = {
      token: token.toJwt(),
      accountSid: accountSid
    };

    console.log('Token generated successfully for identity:', identity);
    response.json(tokenResponse);
  } catch (error) {
    console.error('Error generating token:', error);
    response.status(500).json({ error: 'Failed to generate token' });
  }
});

// TwiML endpoint for browser-based calls
app.post('/twiml/browser-call', (request, response) => {
  console.log('Browser call TwiML request:', request.body);

  const twiml = new VoiceResponse();
  const toNumber = request.body.To;
  const fromNumber = request.body.From;

  console.log(`Connecting browser call from ${fromNumber} to ${toNumber}`);

  // Direct connection - NO recorded messages, NO delays, just immediate two-way communication
  const dial = twiml.dial({
    callerId: fromNumber,
    timeout: 30,
    record: 'record-from-answer',
    recordingStatusCallback: 'https://2a152400c10e.ngrok-free.app/api/recording-status'
  });

  // Direct dial - immediate connection for real-time conversation
  dial.number(toNumber);

  // Send the TwiML response
  response.type('text/xml');
  response.send(twiml.toString());
});

// Start the server
app.listen(PORT, () => {
  console.log(`Twilio webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/twiml/voice`);
  console.log(`Status callback URL: http://localhost:${PORT}/api/call-status`);
});

module.exports = app;
