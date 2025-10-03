// AMI (Asterisk Manager Interface) Configuration
// This file contains the configuration for connecting to Asterisk PBX

const amiConfig = {
  // Asterisk server configuration
  host: process.env.ASTERISK_HOST || 'localhost',
  port: process.env.ASTERISK_PORT || 5038,
  
  // AMI authentication
  username: process.env.ASTERISK_AMI_USERNAME || 'admin',
  secret: process.env.ASTERISK_AMI_SECRET || 'amp111',
  
  // Call configuration
  context: process.env.ASTERISK_CONTEXT || 'from-internal',
  callerId: process.env.ASTERISK_CALLER_ID || 'Anonymous',
  timeout: process.env.ASTERISK_TIMEOUT || 30000,
  
  // Python script configuration
  pythonScriptPath: process.env.PYTHON_SCRIPT_PATH || '../../Crm_FrontEnd/src/lamda.py',
  pythonCommand: process.env.PYTHON_COMMAND || 'python', // or 'python3' on some systems
  
  // Call flow settings
  callFlow: {
    // The call flow: Asterisk calls user extension first, then connects to destination
    description: 'AMI Click2Call - Calls user extension first, then connects to destination',
    steps: [
      '1. User clicks phone number in CRM',
      '2. CRM sends call request to AMI',
      '3. Asterisk calls user\'s extension',
      '4. User answers their phone',
      '5. Asterisk connects user to destination number'
    ]
  },
  
  // Validation rules
  validation: {
    minPhoneLength: 10,
    maxPhoneLength: 15,
    minExtensionLength: 3,
    maxExtensionLength: 10,
    allowedPhoneFormats: ['+1234567890', '1234567890', '(123) 456-7890', '123-456-7890']
  }
};

module.exports = amiConfig;
