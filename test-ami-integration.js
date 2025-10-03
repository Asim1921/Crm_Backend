#!/usr/bin/env node

/**
 * Test script for AMI Click2Call integration
 * This script tests the Python AMI script integration without requiring the full server
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing AMI Click2Call Integration...\n');

// Test configuration
const testConfig = {
  pythonScriptPath: path.join(__dirname, '../Crm_FrontEnd/src/lamda.py'),
  pythonCommand: 'python', // or 'python3' on some systems
  testPhone: '1234567890',
  testExtension: '1000'
};

console.log('📋 Test Configuration:');
console.log(`   Python Script: ${testConfig.pythonScriptPath}`);
console.log(`   Python Command: ${testConfig.pythonCommand}`);
console.log(`   Test Phone: ${testConfig.testPhone}`);
console.log(`   Test Extension: ${testConfig.testExtension}\n`);

// Test 1: Check if Python script exists
console.log('🔍 Test 1: Checking if Python script exists...');
const fs = require('fs');
if (fs.existsSync(testConfig.pythonScriptPath)) {
  console.log('✅ Python script found');
} else {
  console.log('❌ Python script not found at:', testConfig.pythonScriptPath);
  process.exit(1);
}

// Test 2: Check if Python is available
console.log('\n🔍 Test 2: Checking if Python is available...');
const pythonCheck = spawn(testConfig.pythonCommand, ['--version'], { stdio: 'pipe' });

pythonCheck.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Python is available');
    runPythonScriptTest();
  } else {
    console.log('❌ Python is not available or not in PATH');
    console.log('   Please ensure Python is installed and accessible');
    process.exit(1);
  }
});

pythonCheck.on('error', (error) => {
  console.log('❌ Error checking Python:', error.message);
  console.log('   Please ensure Python is installed and accessible');
  process.exit(1);
});

// Test 3: Run Python script test
function runPythonScriptTest() {
  console.log('\n🔍 Test 3: Testing Python script execution...');
  console.log('   Note: This will attempt to connect to Asterisk AMI');
  console.log('   If Asterisk is not running, this test will fail\n');

  const pythonProcess = spawn(testConfig.pythonCommand, [
    testConfig.pythonScriptPath,
    testConfig.testPhone,
    testConfig.testExtension
  ], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';

  pythonProcess.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log('📤 Python stdout:', data.toString().trim());
  });

  pythonProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    console.log('📥 Python stderr:', data.toString().trim());
  });

  pythonProcess.on('close', (code) => {
    console.log(`\n📊 Python script exited with code: ${code}`);
    
    if (code === 0) {
      console.log('✅ Python script executed successfully');
      console.log('   This means the AMI integration should work');
    } else {
      console.log('⚠️  Python script failed (this is expected if Asterisk is not running)');
      console.log('   Error output:', stderr);
      console.log('   This is normal if:');
      console.log('   - Asterisk is not running');
      console.log('   - AMI is not configured');
      console.log('   - Network connection issues');
    }
    
    console.log('\n📋 Summary:');
    console.log('   ✅ Python script exists');
    console.log('   ✅ Python is available');
    console.log(`   ${code === 0 ? '✅' : '⚠️ '} Python script execution (${code === 0 ? 'success' : 'expected failure'})`);
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Ensure Asterisk PBX is running');
    console.log('   2. Configure AMI in /etc/asterisk/manager.conf');
    console.log('   3. Update HOST, USERNAME, and SECRET in lamda.py');
    console.log('   4. Test the integration via the CRM frontend');
    console.log('   5. Use the AMI test page at /ami-test');
    
    console.log('\n📖 For detailed setup instructions, see: AMI_INTEGRATION_GUIDE.md');
  });

  pythonProcess.on('error', (error) => {
    console.log('❌ Failed to start Python process:', error.message);
    process.exit(1);
  });

  // Set timeout for the Python process (10 seconds)
  setTimeout(() => {
    if (!pythonProcess.killed) {
      pythonProcess.kill();
      console.log('\n⏰ Python process timed out after 10 seconds');
    }
  }, 10000);
}
