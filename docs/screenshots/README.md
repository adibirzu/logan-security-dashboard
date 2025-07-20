# Logan Security Dashboard - Screenshots

This directory contains high-resolution screenshots of the Logan Security Dashboard interface, showcasing the various features and capabilities of the application.

## 📸 Available Screenshots

### Core Dashboard Views

| Screenshot | Description | Resolution |
|------------|-------------|------------|
| `dashboard-overview.png` | Main dashboard with security metrics and system status | 1920x1080 |
| `security-overview.png` | Comprehensive security analytics and compliance monitoring | 1920x1080 |
| `query-builder.png` | Advanced OCI Logging Analytics query interface | 1920x1080 |

### Security Analysis Tools

| Screenshot | Description | Resolution |
|------------|-------------|------------|
| `threat-hunting.png` | Threat investigation tools and IP analysis | 1920x1080 |
| `rita-discovery.png` | Network behavior analysis using RITA algorithms | 1920x1080 |
| `mitre-attack.png` | MITRE ATT&CK framework integration and mapping | 1920x1080 |

## 🔧 Screenshot Details

All screenshots were captured using the **Logan MCP Screenshot Server** with the following specifications:

- **Browser**: Headless Chrome/Chromium
- **Viewport**: 1920x1080 (Full HD)
- **Format**: PNG with high compression
- **Timing**: Captured with appropriate wait times for dynamic content loading
- **Consistency**: Standardized capture process for uniform appearance

## 📝 Usage Guidelines

### In Documentation
- Use screenshots to illustrate specific features or workflows
- Include alt text for accessibility
- Resize appropriately for different documentation contexts
- Maintain aspect ratios when scaling

### In Presentations
- Screenshots are optimized for projection and display
- High resolution ensures clarity at various scales
- Consider dark theme compatibility for presentation backgrounds

### For Development
- Use as reference for UI/UX consistency
- Compare changes during development cycles
- Document visual regression testing

## 🔄 Update Process

Screenshots are updated using the external MCP Screenshot Server:

1. **Preparation**: Ensure Logan Security Dashboard is running
2. **Capture**: Run the MCP Screenshot Server to capture updated screenshots
3. **Review**: Verify screenshot quality and content accuracy
4. **Replace**: Update files in this directory
5. **Documentation**: Update related documentation with new screenshots

### Automated Updates

```bash
# From the MCP Screenshot Server directory
node run-screenshots.js

# Copy to documentation
cp screenshots/*.png /path/to/logan-security-dashboard/docs/screenshots/
```

## 🎯 Visual Quality Standards

- **Clarity**: All text and UI elements must be clearly readable
- **Completeness**: Full page capture for overview screenshots
- **Consistency**: Standardized time filters and data displays
- **Currency**: Screenshots reflect the current UI state and features

## 📋 Maintenance

- **Review Schedule**: Monthly review for UI changes
- **Update Triggers**: 
  - Major feature releases
  - UI/UX updates
  - New page additions
  - Significant visual changes
- **Quality Check**: Ensure all screenshots maintain visual consistency

## 🔗 Related Resources

- [Visual Guide](../visual-guide.md) - Complete walkthrough using these screenshots
- [MCP Screenshot Server](../../temp-mcp-screenshot-server/) - Tool used for capture
- [Main Documentation](../README.md) - Project documentation home

---

*Last updated: December 2024*  
*Generated with Logan MCP Screenshot Server v1.0.0*