#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Function to call MCP server
function callMCPServer(tool, args = {}) {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', [join(__dirname, 'dist', 'index.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    serverProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    serverProcess.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Server exited with code ${code}. Error: ${error}`));
      }
    });

    // Send MCP request
    const request = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: tool,
        arguments: args
      }
    };

    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    serverProcess.stdin.end();

    // Timeout after 60 seconds
    setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Server timeout'));
    }, 60000);
  });
}

// Take all screenshots
async function takeAllScreenshots() {
  console.log('🚀 Starting screenshot capture...');
  
  try {
    const result = await callMCPServer('take_all_screenshots');
    console.log('✅ Screenshots completed:', result);
    
    // Also create the guide
    console.log('📖 Creating screenshot guide...');
    const guideResult = await callMCPServer('create_screenshot_guide');
    console.log('✅ Guide created:', guideResult);
    
  } catch (error) {
    console.error('❌ Error taking screenshots:', error.message);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  takeAllScreenshots();
}