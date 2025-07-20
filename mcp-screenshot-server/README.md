# Logan Screenshot MCP Server

An MCP (Model Context Protocol) server that automates screenshot generation and annotation for the Logan Security Dashboard.

## Features

- 📸 **Automated Screenshots**: Take screenshots of all dashboard pages
- 🎨 **Annotation Support**: Add arrows, circles, rectangles, and text to screenshots
- 📄 **HTML Guide Generation**: Create a complete visual guide with all screenshots
- 🎯 **Targeted Screenshots**: Capture specific pages with custom settings
- ⏱️ **Smart Waiting**: Wait for elements or specific time before capturing
- 🖱️ **Interactive Elements**: Hover or click elements before screenshots

## Installation

1. Install dependencies:
```bash
cd mcp-screenshot-server
npm install
```

2. Build the server:
```bash
npm run build
```

## Configuration

Add to your MCP settings (Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "logan-screenshot": {
      "command": "node",
      "args": ["/path/to/logan-security-dashboard/mcp-screenshot-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Or for development mode:
```json
{
  "mcpServers": {
    "logan-screenshot": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/path/to/logan-security-dashboard/mcp-screenshot-server",
      "env": {}
    }
  }
}
```

## Usage

### Available Tools

#### 1. `take_screenshot`
Take a screenshot of a specific page.

```typescript
{
  url: "http://localhost:3000/dashboard",
  name: "dashboard-main",
  width: 1920,
  height: 1080,
  fullPage: false,
  waitFor: 2000  // Wait 2 seconds
}
```

#### 2. `take_all_screenshots`
Automatically capture all main pages of the dashboard.

```typescript
// No parameters needed
```

#### 3. `annotate_screenshot`
Add visual annotations to existing screenshots.

```typescript
{
  imagePath: "./screenshots/dashboard-main.png",
  outputPath: "./screenshots/dashboard-main-annotated.png",
  annotations: [
    {
      type: "arrow",
      x: 100,
      y: 100,
      toX: 200,
      toY: 200,
      color: "red"
    },
    {
      type: "text",
      x: 250,
      y: 250,
      text: "Security Metrics",
      color: "blue"
    }
  ]
}
```

#### 4. `create_screenshot_guide`
Generate an HTML guide with all screenshots.

```typescript
{
  outputPath: "./screenshots/guide.html"  // Optional
}
```

## Example Workflow

1. **Start Logan Security Dashboard**:
```bash
cd .. # Go to main project
npm run dev
```

2. **In Claude, use the MCP server**:
```
Take all screenshots of the Logan Security Dashboard
```

3. **Add annotations**:
```
Annotate the dashboard screenshot with arrows pointing to key features
```

4. **Generate guide**:
```
Create a screenshot guide for the documentation
```

## Default Pages Captured

The server automatically captures these pages:
- Dashboard Overview (`/`)
- Security Overview (`/security-overview`)
- Log Sources (`/log-sources`)
- Query Builder (`/query-builder`)
- Threat Hunting (`/threat-hunting`)
- Threat Analytics (`/threat-analytics`)
- Settings (`/settings`)

## Annotation Types

### Arrow
```json
{
  "type": "arrow",
  "x": 100,      // Start X
  "y": 100,      // Start Y
  "toX": 200,    // End X
  "toY": 200,    // End Y
  "color": "red"
}
```

### Circle
```json
{
  "type": "circle",
  "x": 150,       // Center X
  "y": 150,       // Center Y
  "width": 50,    // Radius
  "color": "blue"
}
```

### Rectangle
```json
{
  "type": "rectangle",
  "x": 100,        // Top-left X
  "y": 100,        // Top-left Y
  "width": 200,
  "height": 100,
  "color": "green"
}
```

### Text
```json
{
  "type": "text",
  "x": 100,
  "y": 100,
  "text": "Important Feature",
  "color": "purple"
}
```

## Output Structure

Screenshots are saved in:
```
logan-security-dashboard/
└── screenshots/
    ├── dashboard-overview.png
    ├── dashboard-overview-annotated.png
    ├── security-overview.png
    ├── log-sources.png
    ├── query-builder.png
    ├── threat-hunting.png
    ├── threat-analytics.png
    ├── settings.png
    └── guide.html
```

## Development

### Run in development mode:
```bash
npm run dev
```

### Build for production:
```bash
npm run build
```

### Project Structure:
```
mcp-screenshot-server/
├── src/
│   └── index.ts       # Main server implementation
├── dist/              # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### Browser Launch Issues
- Ensure Chromium dependencies are installed
- On macOS: May need to allow in Security & Privacy settings
- On Linux: Install required dependencies:
  ```bash
  sudo apt-get install -y libx11-xcb1 libxcomposite1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libpangocairo-1.0-0 libatk1.0-0 libcairo-gobject2 libgtk-3-0 libgdk-pixbuf2.0-0
  ```

### Connection Issues
- Ensure Logan Security Dashboard is running on `http://localhost:3000`
- Check if ports are available
- Verify MCP server configuration in Claude

### Screenshot Quality
- Default resolution: 1920x1080
- For Retina displays: Screenshots are automatically scaled
- Use `fullPage: true` for complete page capture

## License

MIT License - Part of Logan Security Dashboard project