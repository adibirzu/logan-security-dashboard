#!/usr/bin/env node

// Simple script to take screenshots using the MCP server directly
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const DEFAULT_PAGES = [
  {
    url: "http://localhost:3000",
    name: "dashboard-overview",
    fullPage: true
  },
  {
    url: "http://localhost:3000/security-overview",
    name: "security-overview",
    fullPage: true
  },
  {
    url: "http://localhost:3000/log-sources",
    name: "log-sources",
    fullPage: false
  },
  {
    url: "http://localhost:3000/query-builder",
    name: "query-builder",
    fullPage: false,
    waitFor: 2000
  },
  {
    url: "http://localhost:3000/threat-hunting",
    name: "threat-hunting",
    fullPage: false
  },
  {
    url: "http://localhost:3000/threat-analytics",
    name: "threat-analytics",
    fullPage: false,
    waitFor: 3000
  },
  {
    url: "http://localhost:3000/rita-discovery",
    name: "rita-discovery",
    fullPage: false,
    waitFor: 2000
  },
  {
    url: "http://localhost:3000/mitre-attack",
    name: "mitre-attack",
    fullPage: false,
    waitFor: 2000
  },
  {
    url: "http://localhost:3000/settings",
    name: "settings",
    fullPage: true
  }
];

async function takeScreenshot(browser, config) {
  const page = await browser.newPage();
  
  try {
    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
    });

    console.log(chalk.blue(`📸 Taking screenshot: ${config.name} (${config.url})`));
    await page.goto(config.url, { waitUntil: "networkidle2" });

    // Wait if specified
    if (config.waitFor) {
      if (typeof config.waitFor === "string") {
        await page.waitForSelector(config.waitFor);
      } else if (typeof config.waitFor === "number") {
        await new Promise(resolve => setTimeout(resolve, config.waitFor));
      }
    }

    // Create screenshots directory
    const screenshotDir = path.join(process.cwd(), "screenshots");
    await fs.mkdir(screenshotDir, { recursive: true });

    // Take screenshot
    const screenshotPath = path.join(screenshotDir, `${config.name}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: config.fullPage || false,
    });

    console.log(chalk.green(`✅ Screenshot saved: ${screenshotPath}`));
    return screenshotPath;

  } finally {
    await page.close();
  }
}

async function takeAllScreenshots() {
  console.log(chalk.blue('🚀 Starting Logan Security Dashboard screenshot capture...'));
  
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const results = [];
  
  try {
    for (const pageConfig of DEFAULT_PAGES) {
      try {
        const screenshotPath = await takeScreenshot(browser, pageConfig);
        results.push(`✅ ${pageConfig.name}: ${screenshotPath}`);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to screenshot ${pageConfig.name}:`), error.message);
        results.push(`❌ ${pageConfig.name}: ${error.message}`);
      }
    }
    
    console.log(chalk.green('\n🎉 Screenshot capture completed!'));
    console.log('\nResults:');
    results.forEach(result => console.log(result));
    
  } finally {
    await browser.close();
  }
}

// Run the screenshots
takeAllScreenshots().catch(error => {
  console.error(chalk.red('💥 Screenshot process failed:'), error);
  process.exit(1);
});