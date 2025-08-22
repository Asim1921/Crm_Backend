const express = require('express');
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Twilio webhook endpoint for voice calls
app.post('/twiml/voice', (request, response) => {
  console.log('Twilio webhook received:', request.body);
  
  // Create TwiML response
  const twiml = new VoiceResponse();
  
  // Get the 'To' number from the request
  const toNumber = request.body.To;
  
  // Say a message and then connect the call
  twiml.say('Hello! This is a call from your CRM system. How are you Mujeeb ');
  
  // Add a pause
  twiml.pause({ length: 1 });
  
  // Say another message
  twiml.say('The call is now connected. You can start your conversation.');
  
  // Add another pause
  twiml.pause({ length: 2 });
  
  // Say goodbye
  twiml.say('Thank you for using our CRM system. Goodbye!');
  
  // Hang up the call
  twiml.hangup();
  
  // Send the TwiML response
  response.type('text/xml');
  response.send(twiml.toString());
});

// Status callback endpoint
app.post('/api/call-status', (request, response) => {
  console.log('Call status update:', request.body);
  
  // You can store call status updates in your database here
  const callSid = request.body.CallSid;
  const callStatus = request.body.CallStatus;
  const callDuration = request.body.CallDuration;
  
  console.log(`Call ${callSid} status: ${callStatus}, duration: ${callDuration}`);
  
  response.status(200).send('OK');
});

// Health check endpoint
app.get('/health', (request, response) => {
  response.json({ status: 'OK', message: 'Twilio webhook server is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Twilio webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/twiml/voice`);
  console.log(`Status callback URL: http://localhost:${PORT}/api/call-status`);
});

module.exports = app;
