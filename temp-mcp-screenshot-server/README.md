# Logan MCP Screenshot Server

A Model Context Protocol (MCP) server for taking automated screenshots of the Logan Security Dashboard. This standalone server provides tools for documentation, testing, and visual verification of the dashboard interface.

## Features

- **Automated Screenshots**: Take screenshots of specific dashboard pages
- **Batch Processing**: Capture all main dashboard pages at once
- **Annotations**: Add arrows, circles, rectangles, and text to screenshots
- **HTML Guide Generation**: Create comprehensive visual documentation
- **Flexible Configuration**: Customizable viewport sizes, wait conditions, and annotations

## Installation

### Prerequisites

- Node.js 18+
- A running instance of Logan Security Dashboard

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/logan-mcp-screenshot-server.git
   cd logan-mcp-screenshot-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the TypeScript**
   ```bash
   npm run build
   ```

## Usage

### Starting the MCP Server

```bash
npm start
```

The server will start and listen for MCP protocol connections via stdio.

### Available Tools

#### 1. take_screenshot
Take a screenshot of a specific dashboard page.

**Parameters:**
- `url` (required): URL to screenshot
- `name` (required): Name for the screenshot file
- `width` (optional): Viewport width (default: 1920)
- `height` (optional): Viewport height (default: 1080)
- `fullPage` (optional): Capture full page (default: false)
- `waitFor` (optional): Wait condition (selector or milliseconds)

**Example:**
```json
{
  "url": "http://localhost:3000/security-overview",
  "name": "security-overview",
  "fullPage": true,
  "waitFor": 2000
}
```

#### 2. take_all_screenshots
Take screenshots of all main dashboard pages using predefined configurations.

**Example pages captured:**
- Dashboard Overview
- Security Overview
- Log Sources
- Query Builder
- Threat Hunting
- Threat Analytics
- Settings

#### 3. annotate_screenshot
Add visual annotations to existing screenshots.

**Parameters:**
- `imagePath` (required): Path to the screenshot
- `outputPath` (required): Path for annotated output
- `annotations` (required): Array of annotation objects

**Annotation types:**
- `arrow`: Draw arrows with start/end points
- `circle`: Draw circles
- `rectangle`: Draw rectangles
- `text`: Add text labels

**Example:**
```json
{
  "imagePath": "./screenshots/dashboard.png",
  "outputPath": "./screenshots/dashboard-annotated.png",
  "annotations": [
    {
      "type": "arrow",
      "x": 100,
      "y": 100,
      "toX": 200,
      "toY": 150,
      "color": "red"
    },
    {
      "type": "text",
      "x": 150,
      "y": 50,
      "text": "Security Metrics",
      "color": "blue"
    }
  ]
}
```

#### 4. create_screenshot_guide
Generate an HTML guide with all screenshots and descriptions.

**Parameters:**
- `outputPath` (optional): Path for HTML guide (default: ./screenshots/guide.html)

## Configuration

### Default Pages

The server comes with predefined configurations for Logan Security Dashboard pages:

```javascript
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
  // ... more pages
];
```

### Customizing URLs

Update the `DEFAULT_PAGES` configuration in the source code to match your dashboard URL:

```javascript
// Change from localhost to your dashboard URL
url: "http://your-dashboard-host:3000/security-overview"
```

## Development

### Building from Source

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build TypeScript**
   ```bash
   npm run build
   ```

3. **Watch mode for development**
   ```bash
   npm run dev
   ```

### Project Structure

```
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript output
├── screenshots/          # Generated screenshots directory
├── package.json
├── tsconfig.json
└── README.md
```

## Integration with Claude

This MCP server is designed to work with Claude and other MCP-compatible clients:

1. **Register the server** in your MCP client configuration
2. **Use the tools** through natural language commands
3. **Generate documentation** automatically

### Example Claude Usage

```
"Take screenshots of all Logan Security Dashboard pages and create an annotated guide"
```

Claude will:
1. Call `take_all_screenshots` to capture all pages
2. Use `annotate_screenshot` to add relevant annotations
3. Call `create_screenshot_guide` to generate HTML documentation

## Output

### Screenshots
Screenshots are saved to the `./screenshots/` directory with the following naming convention:
- `{page-name}.png` - Original screenshot
- `{page-name}-annotated.png` - Screenshot with annotations

### HTML Guide
The generated HTML guide includes:
- Navigation menu for quick access
- Full-size screenshots with descriptions
- Responsive design for different screen sizes
- Smooth scrolling navigation

## Troubleshooting

### Common Issues

1. **Browser Launch Fails**
   - Ensure Chrome/Chromium is installed
   - Check if running in a headless environment
   - Verify sufficient system resources

2. **Dashboard Not Accessible**
   - Confirm Logan Security Dashboard is running
   - Check the URL configuration
   - Verify network connectivity

3. **Screenshot Quality Issues**
   - Adjust viewport dimensions
   - Increase wait times for dynamic content
   - Use `fullPage: true` for complete captures

### Debug Mode

Enable debug logging by setting environment variables:

```bash
DEBUG=puppeteer:* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Projects

- [Logan Security Dashboard](https://github.com/your-org/logan-security-dashboard) - The main security dashboard
- [Model Context Protocol](https://github.com/modelcontextprotocol) - MCP specification and SDKs

## Support

For issues and questions:
- Create an issue in this repository
- Check the Logan Security Dashboard documentation
- Review MCP protocol documentation