#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import puppeteer, { Browser, Page } from "puppeteer";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Screenshot configuration
interface ScreenshotConfig {
  url: string;
  name: string;
  width?: number;
  height?: number;
  fullPage?: boolean;
  annotations?: Annotation[];
  waitFor?: string | number;
  clickElement?: string;
  hoverElement?: string;
}

interface Annotation {
  type: "arrow" | "circle" | "rectangle" | "text";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  toX?: number;
  toY?: number;
}

// Default pages to screenshot
const DEFAULT_PAGES: ScreenshotConfig[] = [
  {
    url: "http://192.168.1.136:3000",
    name: "dashboard-overview",
    fullPage: true,
    annotations: [
      { type: "text", x: 100, y: 50, text: "Security Metrics", color: "red" },
      { type: "arrow", x: 300, y: 100, toX: 250, toY: 150, color: "blue" }
    ]
  },
  {
    url: "http://192.168.1.136:3000/security-overview",
    name: "security-overview",
    fullPage: true
  },
  {
    url: "http://192.168.1.136:3000/log-sources",
    name: "log-sources",
    fullPage: false
  },
  {
    url: "http://192.168.1.136:3000/query-builder",
    name: "query-builder",
    fullPage: false,
    waitFor: 2000
  },
  {
    url: "http://192.168.1.136:3000/threat-hunting",
    name: "threat-hunting",
    fullPage: false
  },
  {
    url: "http://192.168.1.136:3000/threat-analytics",
    name: "threat-analytics",
    fullPage: false,
    waitFor: 3000
  },
  {
    url: "http://192.168.1.136:3000/settings",
    name: "settings",
    fullPage: true
  }
];

class ScreenshotServer {
  private server: Server;
  private browser: Browser | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "logan-screenshot-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "take_screenshot":
            return await this.takeScreenshot(args as any);
          case "take_all_screenshots":
            return await this.takeAllScreenshots();
          case "annotate_screenshot":
            return await this.annotateScreenshot(args as any);
          case "create_screenshot_guide":
            return await this.createScreenshotGuide();
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: "take_screenshot",
        description: "Take a screenshot of a specific page in Logan Security Dashboard",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "URL to screenshot (e.g., http://localhost:3000/dashboard)",
            },
            name: {
              type: "string",
              description: "Name for the screenshot file (without extension)",
            },
            width: {
              type: "number",
              description: "Viewport width (default: 1920)",
            },
            height: {
              type: "number",
              description: "Viewport height (default: 1080)",
            },
            fullPage: {
              type: "boolean",
              description: "Capture full page (default: false)",
            },
            waitFor: {
              type: ["string", "number"],
              description: "Wait for selector or milliseconds before screenshot",
            },
          },
          required: ["url", "name"],
        },
      },
      {
        name: "take_all_screenshots",
        description: "Take screenshots of all main pages in Logan Security Dashboard",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "annotate_screenshot",
        description: "Add annotations (arrows, circles, text) to an existing screenshot",
        inputSchema: {
          type: "object",
          properties: {
            imagePath: {
              type: "string",
              description: "Path to the screenshot to annotate",
            },
            outputPath: {
              type: "string",
              description: "Path for the annotated screenshot",
            },
            annotations: {
              type: "array",
              description: "Array of annotations to add",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["arrow", "circle", "rectangle", "text"],
                  },
                  x: { type: "number" },
                  y: { type: "number" },
                  width: { type: "number" },
                  height: { type: "number" },
                  text: { type: "string" },
                  color: { type: "string" },
                  toX: { type: "number" },
                  toY: { type: "number" },
                },
                required: ["type", "x", "y"],
              },
            },
          },
          required: ["imagePath", "outputPath", "annotations"],
        },
      },
      {
        name: "create_screenshot_guide",
        description: "Create an HTML guide with all screenshots and descriptions",
        inputSchema: {
          type: "object",
          properties: {
            outputPath: {
              type: "string",
              description: "Path for the HTML guide (default: ./screenshots/guide.html)",
            },
          },
        },
      },
    ];
  }

  private async initBrowser() {
    if (!this.browser) {
      console.log(chalk.blue("Launching browser..."));
      this.browser = await puppeteer.launch({
        headless: true,
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });
    }
    return this.browser;
  }

  private async takeScreenshot(config: ScreenshotConfig) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport
      await page.setViewport({
        width: config.width || 1920,
        height: config.height || 1080,
      });

      console.log(chalk.blue(`Navigating to ${config.url}...`));
      await page.goto(config.url, { waitUntil: "networkidle2" });

      // Wait if specified
      if (config.waitFor) {
        if (typeof config.waitFor === "string") {
          await page.waitForSelector(config.waitFor);
        } else if (typeof config.waitFor === "number") {
          await new Promise(resolve => setTimeout(resolve, config.waitFor as number));
        }
      }

      // Hover if specified
      if (config.hoverElement) {
        await page.hover(config.hoverElement);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Click if specified
      if (config.clickElement) {
        await page.click(config.clickElement);
        await new Promise(resolve => setTimeout(resolve, 1000));
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

      console.log(chalk.green(`✓ Screenshot saved: ${screenshotPath}`));

      // Add annotations if specified
      if (config.annotations && config.annotations.length > 0) {
        const annotatedPath = path.join(screenshotDir, `${config.name}-annotated.png`);
        await this.addAnnotations(screenshotPath, annotatedPath, config.annotations);
      }

      return {
        content: [
          {
            type: "text",
            text: `Screenshot saved successfully: ${screenshotPath}`,
          },
        ],
      };
    } finally {
      await page.close();
    }
  }

  private async takeAllScreenshots() {
    const results = [];
    
    for (const pageConfig of DEFAULT_PAGES) {
      try {
        console.log(chalk.blue(`Taking screenshot of ${pageConfig.name}...`));
        await this.takeScreenshot(pageConfig);
        results.push(`✓ ${pageConfig.name}`);
      } catch (error) {
        results.push(`✗ ${pageConfig.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Screenshot results:\n${results.join("\n")}`,
        },
      ],
    };
  }

  private async addAnnotations(
    inputPath: string,
    outputPath: string,
    annotations: Annotation[]
  ) {
    // Get image metadata
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width || 1920;
    const height = metadata.height || 1080;

    // Create SVG overlay with annotations
    const svgElements = annotations.map(annotation => {
      const color = annotation.color || "red";
      
      switch (annotation.type) {
        case "arrow":
          if (annotation.toX && annotation.toY) {
            const angle = Math.atan2(
              annotation.toY - annotation.y,
              annotation.toX - annotation.x
            );
            const arrowLength = 20;
            const arrowAngle = Math.PI / 6;
            
            return `
              <line x1="${annotation.x}" y1="${annotation.y}" 
                    x2="${annotation.toX}" y2="${annotation.toY}" 
                    stroke="${color}" stroke-width="3"/>
              <polygon points="${annotation.toX},${annotation.toY} 
                              ${annotation.toX - arrowLength * Math.cos(angle - arrowAngle)},${annotation.toY - arrowLength * Math.sin(angle - arrowAngle)} 
                              ${annotation.toX - arrowLength * Math.cos(angle + arrowAngle)},${annotation.toY - arrowLength * Math.sin(angle + arrowAngle)}" 
                       fill="${color}"/>
            `;
          }
          return "";
        
        case "circle":
          return `<circle cx="${annotation.x}" cy="${annotation.y}" r="${annotation.width || 50}" 
                         stroke="${color}" stroke-width="3" fill="none"/>`;
        
        case "rectangle":
          return `<rect x="${annotation.x}" y="${annotation.y}" 
                       width="${annotation.width || 100}" height="${annotation.height || 50}" 
                       stroke="${color}" stroke-width="3" fill="none"/>`;
        
        case "text":
          if (annotation.text) {
            return `
              <rect x="${annotation.x - 5}" y="${annotation.y - 25}" 
                    width="${annotation.text.length * 12 + 10}" height="30" 
                    fill="white" stroke="${color}" stroke-width="1"/>
              <text x="${annotation.x}" y="${annotation.y}" 
                    font-family="Arial" font-size="24" fill="${color}">
                ${annotation.text}
              </text>
            `;
          }
          return "";
        
        default:
          return "";
      }
    }).join("");

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgElements}
      </svg>
    `;

    // Composite the overlay onto the image
    await image
      .composite([{
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }])
      .png()
      .toFile(outputPath);

    console.log(chalk.green(`✓ Annotated screenshot saved: ${outputPath}`));
  }

  private async annotateScreenshot(args: {
    imagePath: string;
    outputPath: string;
    annotations: Annotation[];
  }) {
    await this.addAnnotations(args.imagePath, args.outputPath, args.annotations);
    
    return {
      content: [
        {
          type: "text",
          text: `Annotated screenshot saved: ${args.outputPath}`,
        },
      ],
    };
  }

  private async createScreenshotGuide() {
    const screenshotDir = path.join(process.cwd(), "screenshots");
    const files = await fs.readdir(screenshotDir);
    const screenshots = files.filter(f => f.endsWith(".png") && !f.includes("-annotated"));

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Logan Security Dashboard - Screenshot Guide</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 40px;
        }
        .screenshot-section {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .screenshot-section h2 {
            color: #3498db;
            margin-bottom: 15px;
        }
        .screenshot-container {
            position: relative;
            margin-bottom: 20px;
        }
        .screenshot {
            width: 100%;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .description {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
        }
        .navigation {
            position: fixed;
            right: 20px;
            top: 100px;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 200px;
        }
        .navigation h3 {
            margin-top: 0;
            color: #2c3e50;
        }
        .navigation ul {
            list-style: none;
            padding: 0;
        }
        .navigation li {
            margin-bottom: 10px;
        }
        .navigation a {
            color: #3498db;
            text-decoration: none;
        }
        .navigation a:hover {
            text-decoration: underline;
        }
        @media (max-width: 1400px) {
            .navigation {
                position: static;
                margin-bottom: 30px;
                max-width: 100%;
            }
        }
    </style>
</head>
<body>
    <h1>Logan Security Dashboard - Screenshot Guide</h1>
    
    <nav class="navigation">
        <h3>Quick Navigation</h3>
        <ul>
            ${screenshots.map(s => `<li><a href="#${s.replace('.png', '')}">${s.replace('.png', '').replace(/-/g, ' ')}</a></li>`).join('')}
        </ul>
    </nav>

    ${screenshots.map(screenshot => {
        const name = screenshot.replace('.png', '');
        const annotatedPath = `${name}-annotated.png`;
        const hasAnnotated = files.includes(annotatedPath);
        
        return `
        <div class="screenshot-section" id="${name}">
            <h2>${name.replace(/-/g, ' ').toUpperCase()}</h2>
            <div class="screenshot-container">
                <img src="${hasAnnotated ? annotatedPath : screenshot}" alt="${name}" class="screenshot">
            </div>
            <div class="description">
                <p>${this.getPageDescription(name)}</p>
            </div>
        </div>
        `;
    }).join('')}

    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    </script>
</body>
</html>
    `;

    const guidePath = path.join(screenshotDir, "guide.html");
    await fs.writeFile(guidePath, html);
    console.log(chalk.green(`✓ Screenshot guide created: ${guidePath}`));

    return {
      content: [
        {
          type: "text",
          text: `Screenshot guide created: ${guidePath}`,
        },
      ],
    };
  }

  private getPageDescription(pageName: string): string {
    const descriptions: Record<string, string> = {
      "dashboard-overview": "The main dashboard provides a real-time overview of your security posture, including security score, active threats, risk events, and compliance status. The system status panel shows the health of all security infrastructure components.",
      "security-overview": "Comprehensive security metrics and analysis page showing threat trends, top security events, and compliance status across your OCI environment.",
      "log-sources": "Manage and monitor all log sources feeding into Logan Security Dashboard. View source status, collection statistics, and configure new log sources.",
      "query-builder": "Advanced query interface for OCI Logging Analytics. Features syntax highlighting, auto-completion, and multiple visualization options for query results.",
      "threat-hunting": "Threat investigation tools including IP analysis, IOC management, threat hunting playbooks, and MITRE ATT&CK framework integration.",
      "threat-analytics": "Interactive threat visualization with graph analysis, timeline views, and AI-powered threat detection capabilities.",
      "settings": "Configure user preferences, security settings, system configuration, and integration tokens. Accessible from the header for quick access."
    };

    return descriptions[pageName] || "Page screenshot from Logan Security Dashboard.";
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log(chalk.green("Logan Screenshot MCP Server running..."));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the server
const server = new ScreenshotServer();
server.run().catch((error) => {
  console.error(chalk.red("Server error:"), error);
  process.exit(1);
});

// Cleanup on exit
process.on("SIGINT", async () => {
  console.log(chalk.yellow("\nShutting down..."));
  await server.cleanup();
  process.exit(0);
});