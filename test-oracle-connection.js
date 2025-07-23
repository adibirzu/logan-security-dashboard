/**
 * Direct Oracle Database Connection Test
 * Tests the actual Oracle database connection using the provided wallet and credentials
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const testConfig = {
  user: process.env.ORACLE_DB_USER || 'ADMIN',
  password: process.env.ORACLE_DB_PASSWORD || '',
  connectString: process.env.ORACLE_DB_CONNECTION_STRING || '',
  walletLocation: process.env.WALLET_PATH || path.join(__dirname, 'wallet_unzipped'),
  walletPassword: process.env.ORACLE_WALLET_PASSWORD || '' // Autonomous Database wallets typically don't have passwords
};

// Validate required environment variables
if (!testConfig.password) {
  console.error('❌ ERROR: ORACLE_DB_PASSWORD environment variable is required');
  console.error('Please set ORACLE_DB_PASSWORD with your Autonomous Database ADMIN password');
  process.exit(1);
}

if (!testConfig.connectString) {
  console.error('❌ ERROR: ORACLE_DB_CONNECTION_STRING environment variable is required');
  console.error('Please set ORACLE_DB_CONNECTION_STRING with your database connection string');
  console.error('This can be found in your tnsnames.ora file or Oracle Cloud Console');
  process.exit(1);
}

async function testOracleConnection() {
  try {
    console.log('Testing Oracle Database Connection...');
    console.log('Wallet Location:', testConfig.walletLocation);
    console.log('Connect String:', testConfig.connectString);
    console.log('User:', testConfig.user);
    
    // Check if wallet files exist
    const walletFiles = ['tnsnames.ora', 'sqlnet.ora', 'cwallet.sso'];
    for (const file of walletFiles) {
      const filePath = path.join(testConfig.walletLocation, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required wallet file not found: ${file}`);
      }
      console.log(`✓ Found wallet file: ${file}`);
    }
    
    // Set TNS_ADMIN environment variable
    process.env.TNS_ADMIN = testConfig.walletLocation;
    console.log('TNS_ADMIN set to:', process.env.TNS_ADMIN);
    
    // Try to load Oracle database driver
    let oracledb;
    try {
      oracledb = require('oracledb');
      console.log('✓ Oracle database driver loaded successfully');
    } catch (error) {
      console.log('Oracle database driver not installed. Installing...');
      console.log('Please run: npm install oracledb');
      return false;
    }
    
    // Set up Oracle configuration
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    // Test connection
    console.log('\nAttempting database connection...');
    const connection = await oracledb.getConnection({
      user: testConfig.user,
      password: testConfig.password,
      connectString: testConfig.connectString
    });
    
    console.log('✓ Successfully connected to Oracle Database!');
    
    // Test a simple query
    const result = await connection.execute('SELECT 1 as test_value FROM DUAL');
    console.log('✓ Test query executed successfully:', result.rows);
    
    // Test FOCUS schema tables (if they exist)
    try {
      const focusTest = await connection.execute(`
        SELECT table_name 
        FROM user_tables 
        WHERE table_name LIKE 'FOCUS%' 
        ORDER BY table_name
      `);
      console.log('FOCUS tables found:', focusTest.rows);
    } catch (error) {
      console.log('No FOCUS tables found (this is expected for a new database)');
    }
    
    // Close connection
    await connection.close();
    console.log('✓ Connection closed successfully');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.message.includes('TNS:could not resolve the connect identifier')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check that tnsnames.ora contains the connect string:', testConfig.connectString);
      console.log('2. Verify TNS_ADMIN is set correctly');
      console.log('3. Ensure wallet files are in the correct location');
    }
    
    if (error.message.includes('invalid username/password')) {
      console.log('\nCheck that the username and password are correct');
    }
    
    return false;
  }
}

// Run the test
testOracleConnection()
  .then(success => {
    console.log('\n' + '='.repeat(50));
    console.log(`Database connection test ${success ? 'PASSED' : 'FAILED'}`);
    console.log('='.repeat(50));
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });