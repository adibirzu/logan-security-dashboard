#!/usr/bin/env node

// Quick test to verify the MCP server can be instantiated
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testServer() {
  console.log('🧪 Testing MCP Screenshot Server...');
  
  try {
    // Test if the built server file exists and is valid
    const { stdout, stderr } = await execAsync('node dist/index.js --help', {
      timeout: 5000,
      cwd: '/Users/abirzu/dev/logan-security-dashboard/mcp-screenshot-server'
    });
    
    console.log('✅ Server can be instantiated');
    
    // Check if puppeteer can launch
    const testScript = `
      import puppeteer from 'puppeteer';
      try {
        const browser = await puppeteer.launch({ headless: true });
        console.log('✅ Puppeteer browser launched successfully');
        await browser.close();
        process.exit(0);
      } catch (error) {
        console.error('❌ Puppeteer error:', error.message);
        process.exit(1);
      }
    `;
    
    // Write test script
    await import('fs/promises').then(fs => 
      fs.writeFile('temp-test.mjs', testScript)
    );
    
    // Run puppeteer test
    const { stdout: puppeteerOut } = await execAsync('node temp-test.mjs', {
      timeout: 10000,
      cwd: '/Users/abirzu/dev/logan-security-dashboard/mcp-screenshot-server'
    });
    
    console.log(puppeteerOut);
    
    // Cleanup
    await execAsync('rm temp-test.mjs', {
      cwd: '/Users/abirzu/dev/logan-security-dashboard/mcp-screenshot-server'
    });
    
    console.log('🎉 All tests passed! MCP server is ready to use.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the MCP configuration to Claude Desktop');
    console.log('2. Restart Claude Desktop');
    console.log('3. Start Logan Security Dashboard with: npm run dev');
    console.log('4. Ask Claude to: "Take all screenshots of the Logan Security Dashboard"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('- Make sure all dependencies are installed');
    console.log('- Check if Chromium can be launched');
    console.log('- Verify TypeScript compilation succeeded');
  }
}

testServer();