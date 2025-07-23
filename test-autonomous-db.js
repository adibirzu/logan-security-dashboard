/**
 * Oracle Autonomous Database Connection Test
 * Following Oracle documentation best practices
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const config = {
  user: process.env.ORACLE_DB_USER || 'ADMIN',
  password: process.env.ORACLE_DB_PASSWORD || '',
  walletLocation: process.env.WALLET_PATH || path.join(__dirname, 'wallet_unzipped'),
  // Service levels from environment or default testing services
  services: process.env.ORACLE_DB_SERVICES ? 
    process.env.ORACLE_DB_SERVICES.split(',') : 
    ['finopsmvpdb_high', 'finopsmvpdb_medium', 'finopsmvpdb_low']
};

// Validate required environment variables
if (!config.password) {
  console.error('❌ ERROR: ORACLE_DB_PASSWORD environment variable is required');
  console.error('Please set ORACLE_DB_PASSWORD with your Autonomous Database ADMIN password');
  console.error('Example: export ORACLE_DB_PASSWORD="your-admin-password"');
  process.exit(1);
}

async function setupEnvironment() {
  // Set TNS_ADMIN to point to wallet directory
  process.env.TNS_ADMIN = config.walletLocation;
  
  console.log('Environment Setup:');
  console.log('- TNS_ADMIN:', process.env.TNS_ADMIN);
  console.log('- Platform:', os.platform());
  console.log('- Node.js version:', process.version);
  
  // Verify wallet files exist
  const requiredFiles = [
    'tnsnames.ora',
    'sqlnet.ora', 
    'cwallet.sso',
    'ewallet.p12',
    'truststore.jks'
  ];
  
  console.log('\nWallet File Check:');
  for (const file of requiredFiles) {
    const filePath = path.join(config.walletLocation, file);
    const exists = fs.existsSync(filePath);
    console.log(`- ${file}: ${exists ? '✓' : '❌'}`);
    
    if (!exists) {
      throw new Error(`Required wallet file missing: ${file}`);
    }
  }
}

async function testOracleConnection() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('ORACLE AUTONOMOUS DATABASE CONNECTION TEST');
    console.log('='.repeat(60));
    
    await setupEnvironment();
    
    // Load Oracle database driver
    let oracledb;
    try {
      oracledb = require('oracledb');
      console.log('\n✓ Oracle database driver loaded');
    } catch (error) {
      console.error('❌ Oracle database driver not found');
      console.log('Install with: npm install oracledb');
      return false;
    }
    
    // Configure Oracle client
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    
    // Enable connection pooling for better performance
    oracledb.initOracleClient({
      configDir: config.walletLocation,
    });
    
    console.log('\nTesting connection to all service levels...');
    
    let successfulConnections = 0;
    
    for (const service of config.services) {
      try {
        console.log(`\nTesting ${service}...`);
        
        const connection = await oracledb.getConnection({
          user: config.user,
          password: config.password,
          connectString: service,
          connectionClass: 'HR'
        });
        
        console.log(`✓ ${service}: Connected successfully`);
        
        // Test basic query
        const result = await connection.execute(
          'SELECT USER, SYSDATE FROM DUAL'
        );
        console.log(`✓ ${service}: Query result:`, result.rows[0]);
        
        // Test database version
        const versionResult = await connection.execute(
          `SELECT BANNER FROM V$VERSION WHERE BANNER LIKE 'Oracle%'`
        );
        if (versionResult.rows.length > 0) {
          console.log(`✓ ${service}: ${versionResult.rows[0].BANNER}`);
        }
        
        // Test schema access
        const schemaResult = await connection.execute(
          `SELECT COUNT(*) as table_count FROM USER_TABLES`
        );
        console.log(`✓ ${service}: User tables count: ${schemaResult.rows[0].TABLE_COUNT}`);
        
        await connection.close();
        successfulConnections++;
        
      } catch (error) {
        console.log(`❌ ${service}: ${error.message}`);
        
        // Provide specific troubleshooting for common errors
        if (error.message.includes('ORA-12506')) {
          console.log(`   Troubleshooting: Database service ${service} may be stopped or unavailable`);
        } else if (error.message.includes('ORA-01017')) {
          console.log('   Troubleshooting: Invalid username/password');
        } else if (error.message.includes('TNS:could not resolve')) {
          console.log('   Troubleshooting: Check tnsnames.ora and TNS_ADMIN setting');
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`CONNECTION SUMMARY: ${successfulConnections}/${config.services.length} services available`);
    console.log('='.repeat(60));
    
    if (successfulConnections === 0) {
      console.log('\n🔍 TROUBLESHOOTING STEPS:');
      console.log('1. Check if the Autonomous Database is running in OCI Console');
      console.log('2. Verify Access Control List (ACL) allows your IP address');
      console.log('3. Confirm wallet files are valid and up-to-date');
      console.log('4. Check network connectivity to *.oraclecloud.com on port 1522');
      console.log('5. Verify database OCID: ocid1.autonomousdatabase.oc1.eu-frankfurt-1.antheljtttkvkkiakrchw2r6uv3hnunbcf2x46dgvmdlupkgzr3zndlq3nxq');
    }
    
    return successfulConnections > 0;
    
  } catch (error) {
    console.error('\n❌ Setup error:', error.message);
    return false;
  }
}

// Run the test
testOracleConnection()
  .then(success => {
    console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });