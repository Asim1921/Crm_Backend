# AMI Click2Call Integration Guide

This guide explains how to integrate the Python AMI script (`lamda.py`) into your CRM system for direct Asterisk PBX calling.

## Overview

The AMI (Asterisk Manager Interface) integration allows your CRM to make calls directly through your Asterisk PBX system using a Python script that connects to the AMI interface.

## Architecture

```
CRM Frontend → Node.js Backend → Python Script → Asterisk AMI → PBX → Phone System
```

## Files Created/Modified

### Backend Files
- `controllers/amiClick2CallController.js` - Main controller for AMI calls
- `routes/amiClick2CallRoutes.js` - API routes for AMI functionality
- `config/amiConfig.js` - Configuration for AMI settings
- `server.js` - Updated to include AMI routes

### Frontend Files
- `components/AMIClick2CallTest.jsx` - Test component for AMI calls
- `pages/AMITest.jsx` - Test page for AMI functionality
- `utils/api.js` - Updated with AMI API functions

### Python Script
- `Crm_FrontEnd/src/lamda.py` - Updated with proper configuration

## Configuration

### 1. Asterisk AMI Configuration

First, ensure your Asterisk PBX has AMI enabled:

```ini
# /etc/asterisk/manager.conf
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[admin]
secret = amp111
permit = 0.0.0.0/0.0.0.0
read = system,call,log,verbose,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,agent,user,config,command,reporting,originate
```

### 2. Environment Variables

Create a `.env` file in your backend directory:

```env
# AMI Configuration
ASTERISK_HOST=localhost
ASTERISK_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=amp111
ASTERISK_CONTEXT=from-internal
ASTERISK_CALLER_ID=Anonymous
ASTERISK_TIMEOUT=30000

# Python Configuration
PYTHON_SCRIPT_PATH=../../Crm_FrontEnd/src/lamda.py
PYTHON_COMMAND=python
```

### 3. Python Script Configuration

Update the `lamda.py` file with your Asterisk server details:

```python
# Datos AMI - Configuration for Asterisk Manager Interface
HOST = 'your-asterisk-server-ip'  # Change to your Asterisk server IP
PORT = 5038
USERNAME = 'your-ami-username'    # Change to your AMI username
SECRET = 'your-ami-password'      # Change to your AMI password
```

## API Endpoints

### Make a Call
```
POST /api/ami-click2call/call
```

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "context": "click to call",
  "ringtime": "30",
  "CallerID": "Anonymous",
  "name": "CRM User",
  "other": "Additional info"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call initiated successfully. Asterisk will call your extension first, then connect you to the target number.",
  "callId": "ami_call_1234567890",
  "status": "initiated",
  "communicationId": "comm_1234567890",
  "phoneNumber": "+1234567890",
  "extension": "1000",
  "method": "AMI"
}
```

### Test Connection
```
POST /api/ami-click2call/test-connection
```

### Get Status
```
GET /api/ami-click2call/status
```

### Get User Info
```
GET /api/ami-click2call/user-info
```

## How It Works

1. **User Action**: User clicks a phone number in the CRM
2. **API Call**: Frontend sends call request to Node.js backend
3. **Python Execution**: Backend spawns Python script with phone number and user extension
4. **AMI Connection**: Python script connects to Asterisk AMI
5. **Call Origination**: AMI sends originate command to Asterisk
6. **Call Flow**: 
   - Asterisk calls user's extension first
   - User answers their phone
   - Asterisk connects user to destination number

## Call Flow Diagram

```
User Extension (1000) ←→ Asterisk PBX ←→ Destination Number (+1234567890)
```

## Testing

### 1. Test the Python Script Directly

```bash
cd Crm_FrontEnd/src
python lamda.py +1234567890 1000
```

### 2. Test via API

Use the test component at `/ami-test` or make direct API calls:

```bash
curl -X POST http://localhost:5000/api/ami-click2call/call \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"phoneNumber": "+1234567890"}'
```

### 3. Test Connection

```bash
curl -X POST http://localhost:5000/api/ami-click2call/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Common Issues

1. **Python Script Not Found**
   - Check the `PYTHON_SCRIPT_PATH` in configuration
   - Ensure the script exists at the specified path

2. **AMI Connection Failed**
   - Verify Asterisk AMI is enabled
   - Check username/password in configuration
   - Ensure firewall allows port 5038

3. **Call Not Working**
   - Verify user has a valid extension in the database
   - Check Asterisk dialplan for the context
   - Ensure extensions are properly configured

4. **Permission Denied**
   - Check AMI user permissions in `manager.conf`
   - Ensure user has `originate` permission

### Debug Steps

1. **Check Python Script Output**:
   ```bash
   python lamda.py +1234567890 1000
   ```

2. **Test AMI Connection**:
   ```bash
   telnet your-asterisk-server 5038
   ```

3. **Check Asterisk Logs**:
   ```bash
   tail -f /var/log/asterisk/full
   ```

4. **Verify User Extension**:
   - Check user profile in CRM
   - Ensure extension is set in database

## Security Considerations

1. **AMI Access**: Restrict AMI access to trusted IPs only
2. **User Permissions**: Limit AMI user permissions to minimum required
3. **Call Validation**: Validate phone numbers before making calls
4. **Rate Limiting**: Implement rate limiting for call requests
5. **Logging**: Log all call attempts for audit purposes

## Performance Considerations

1. **Python Process**: Each call spawns a new Python process
2. **AMI Connection**: Connections are established per call
3. **Timeout**: Set appropriate timeouts for call operations
4. **Error Handling**: Implement proper error handling and retry logic

## Integration with Existing Click2Call

The AMI integration runs alongside your existing Click2Call service:

- **External Service**: `/api/click2call/*` - Uses external Click2Call API
- **AMI Service**: `/api/ami-click2call/*` - Uses direct Asterisk AMI

You can choose which service to use based on your needs:
- Use AMI for direct PBX control and better integration
- Use external service for managed calling service

## Next Steps

1. **Configure Asterisk**: Set up AMI and user permissions
2. **Update Configuration**: Modify settings in `amiConfig.js` and `lamda.py`
3. **Test Integration**: Use the test component to verify functionality
4. **Deploy**: Deploy to production environment
5. **Monitor**: Set up monitoring and logging for call operations

## Support

For issues with this integration:
1. Check the troubleshooting section above
2. Review Asterisk and AMI documentation
3. Check server logs for detailed error messages
4. Verify network connectivity between CRM and Asterisk server
