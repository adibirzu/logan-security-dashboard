/**
 * Test all Oracle Database service levels
 * Tests high, medium, and low service levels
 */

const fs = require('fs');
const path = require('path');

// Service levels to test
const serviceConfigs = [
  {
    name: 'HIGH',
    connectString: 'finopsmvpdb_high'
  },
  {
    name: 'MEDIUM', 
    connectString: 'finopsmvpdb_medium'
  },
  {
    name: 'LOW',
    connectString: 'finopsmvpdb_low'
  }
];

const baseConfig = {
  user: process.env.ORACLE_DB_USER || 'ADMIN',
  password: process.env.ORACLE_DB_PASSWORD || '',
  walletLocation: process.env.WALLET_PATH || path.join(__dirname, 'wallet_unzipped')
};

// Validate required environment variables
if (!baseConfig.password) {
  console.error('❌ ERROR: ORACLE_DB_PASSWORD environment variable is required');
  console.error('Please set ORACLE_DB_PASSWORD with your Autonomous Database ADMIN password');
  process.exit(1);
}

async function testConnection(serviceConfig) {
  try {
    // Set TNS_ADMIN environment variable
    process.env.TNS_ADMIN = baseConfig.walletLocation;
    
    const oracledb = require('oracledb');
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    console.log(`\nTesting ${serviceConfig.name} service level...`);
    console.log(`Connect String: ${serviceConfig.connectString}`);
    
    const connection = await oracledb.getConnection({
      user: baseConfig.user,
      password: baseConfig.password,
      connectString: serviceConfig.connectString
    });
    
    console.log(`✓ ${serviceConfig.name}: Connection successful!`);
    
    // Test a simple query
    const result = await connection.execute('SELECT 1 as test_value FROM DUAL');
    console.log(`✓ ${serviceConfig.name}: Query successful:`, result.rows[0]);
    
    // Check database version
    const versionResult = await connection.execute('SELECT * FROM v$version WHERE rownum = 1');
    console.log(`✓ ${serviceConfig.name}: Database version:`, versionResult.rows[0]);
    
    await connection.close();
    return { success: true, service: serviceConfig.name };
    
  } catch (error) {
    console.log(`❌ ${serviceConfig.name}: ${error.message}`);
    return { success: false, service: serviceConfig.name, error: error.message };
  }
}

async function testAllConnections() {
  console.log('Testing Oracle Autonomous Database connections...');
  console.log('Wallet Location:', baseConfig.walletLocation);
  console.log('User:', baseConfig.user);
  
  const results = [];
  
  for (const serviceConfig of serviceConfigs) {
    const result = await testConnection(serviceConfig);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('CONNECTION TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`✓ Successful connections (${successful.length}):`);
    successful.forEach(r => console.log(`  - ${r.service}`));
  }
  
  if (failed.length > 0) {
    console.log(`❌ Failed connections (${failed.length}):`);
    failed.forEach(r => console.log(`  - ${r.service}: ${r.error}`));
  }
  
  console.log('='.repeat(60));
  
  return successful.length > 0;
}

// Run the test
testAllConnections()
  .then(anySuccess => {
    process.exit(anySuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });