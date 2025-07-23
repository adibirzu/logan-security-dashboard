/**
 * Oracle Autonomous Database Connection Test - Thin Mode
 * Tests connection without requiring Oracle Instant Client
 */

const fs = require('fs');
const path = require('path');

// Load configuration from environment variables
const config = {
  user: process.env.ORACLE_DB_USER || 'ADMIN',
  password: process.env.ORACLE_DB_PASSWORD || '',
  walletLocation: process.env.WALLET_PATH || path.join(__dirname, 'wallet_unzipped'),
  // Connection strings should be loaded from environment or tnsnames.ora
  connectStrings: process.env.ORACLE_CONNECTION_STRINGS ? 
    process.env.ORACLE_CONNECTION_STRINGS.split(',') : 
    [] // Will be read from tnsnames.ora if not provided
};

// Validate required environment variables
if (!config.password) {
  console.error('❌ ERROR: ORACLE_DB_PASSWORD environment variable is required');
  console.error('Please set ORACLE_DB_PASSWORD with your Autonomous Database ADMIN password');
  console.error('Example: export ORACLE_DB_PASSWORD="your-admin-password"');
  process.exit(1);
}

async function testThinConnection() {
  try {
    console.log('Oracle Autonomous Database - Thin Mode Connection Test');
    console.log('=' .repeat(60));
    
    // Load Oracle database driver
    const oracledb = require('oracledb');
    console.log('✓ Oracle database driver loaded');
    
    // Configure for thin mode (no Oracle client required)
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    // Set TNS_ADMIN for wallet location
    process.env.TNS_ADMIN = config.walletLocation;
    console.log('✓ TNS_ADMIN set to:', process.env.TNS_ADMIN);
    
    // Test each connection string
    for (let i = 0; i < config.connectStrings.length; i++) {
      const connectString = config.connectStrings[i];
      const serviceName = ['HIGH', 'MEDIUM', 'LOW'][i];
      
      try {
        console.log(`\nTesting ${serviceName} service...`);
        
        // Try connection without initOracleClient (thin mode)
        const connection = await oracledb.getConnection({
          user: config.user,
          password: config.password,
          connectString: connectString
        });
        
        console.log(`✓ ${serviceName}: Connected successfully`);
        
        // Test basic query
        const result = await connection.execute('SELECT USER, SYSDATE FROM DUAL');
        console.log(`✓ ${serviceName}: Current user: ${result.rows[0].USER}`);
        console.log(`✓ ${serviceName}: Database time: ${result.rows[0].SYSDATE}`);
        
        await connection.close();
        console.log(`✓ ${serviceName}: Connection closed`);
        
        return true; // Success on first working connection
        
      } catch (error) {
        console.log(`❌ ${serviceName}: ${error.message}`);
        
        // Continue to next service level
        continue;
      }
    }
    
    return false; // No connections succeeded
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Also test with wallet files directly
async function testWithWalletFiles() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('Testing with wallet file content...');
    
    // Read wallet files
    const tnsContent = fs.readFileSync(path.join(config.walletLocation, 'tnsnames.ora'), 'utf8');
    console.log('✓ TNS names file read successfully');
    
    const sqlnetContent = fs.readFileSync(path.join(config.walletLocation, 'sqlnet.ora'), 'utf8');
    console.log('✓ SQL net file read successfully');
    
    console.log('\nTNS Names content:');
    console.log(tnsContent.substring(0, 200) + '...');
    
    return true;
    
  } catch (error) {
    console.error('❌ Wallet file test failed:', error.message);
    return false;
  }
}

// Run both tests
async function runTests() {
  console.log('Starting Oracle Autonomous Database connection tests...\n');
  
  const walletTest = await testWithWalletFiles();
  const connectionTest = await testThinConnection();
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Wallet files: ${walletTest ? 'OK' : 'FAILED'}`);
  console.log(`Database connection: ${connectionTest ? 'SUCCESS' : 'FAILED'}`);
  
  if (!connectionTest) {
    console.log('\n🔍 NEXT STEPS:');
    console.log('1. Verify the Autonomous Database is running in OCI Console');
    console.log('2. Check Access Control List (ACL) settings');
    console.log('3. Ensure your IP address is whitelisted');
    console.log('4. Consider installing Oracle Instant Client for full functionality');
  }
  
  return connectionTest;
}

runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });