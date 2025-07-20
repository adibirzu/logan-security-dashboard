# Screenshot Guide for Logan Security Dashboard

## Screenshot Requirements

This guide helps you capture and annotate screenshots for the Logan Security Dashboard user documentation.

## Tools Needed
- Screenshot tool (macOS: Cmd+Shift+4, Windows: Win+Shift+S)
- Annotation tool (Preview on Mac, Paint on Windows, or online tools like Skitch)
- Image editor for adding arrows and callouts

## Screenshots to Capture

### 1. Dashboard Page (`http://localhost:3000/`)
- [ ] Full dashboard view
- [ ] Security metrics cards (annotate each metric)
- [ ] Time range selector 
- [ ] Refresh button
- [ ] System status panel
- [ ] Threat sources visualization
- [ ] Recent activities list
- [ ] Quick actions grid

### 2. Navigation (`All pages`)
- [ ] Full navigation bar
- [ ] Settings button location
- [ ] Theme toggle button
- [ ] Mobile navigation menu

### 3. Security Overview (`/security-overview`)
- [ ] Main security dashboard
- [ ] Threat trends graph
- [ ] Security events table
- [ ] Compliance widgets

### 4. Log Sources (`/log-sources`)
- [ ] Log sources grid view
- [ ] Active vs inactive sources
- [ ] Add source button
- [ ] Source details panel

### 5. Query Builder (`/query-builder`)
- [ ] Query editor interface
- [ ] Auto-complete dropdown
- [ ] Results table view
- [ ] Results chart view
- [ ] Save query dialog
- [ ] Query history dropdown

### 6. Storage Analytics (`/storage-analytics`)
- [ ] Storage usage charts
- [ ] Volume breakdown
- [ ] Cost analysis section

### 7. Threat Hunting (`/threat-hunting`)
- [ ] Main threat hunting interface
- [ ] Tab navigation (Framework, Intelligence, Playbooks)
- [ ] IP search interface
- [ ] IP logs viewer
- [ ] IOC management panel
- [ ] MITRE ATT&CK matrix

### 8. Threat Analytics (`/threat-analytics`)
- [ ] Interactive threat graph
- [ ] Node interaction (hover state)
- [ ] Clicked IP navigation
- [ ] Timeline view
- [ ] Filter sidebar

### 9. Advanced Pages
- [ ] RITA Discovery (`/rita-discovery`)
- [ ] Network Analysis (`/network-analysis`)
- [ ] Incident Response (`/incident-response`)
- [ ] Compute Status (`/compute`)

### 10. Settings (`/settings`)
- [ ] Settings overview
- [ ] User preferences
- [ ] Security settings
- [ ] System configuration

## Annotation Guidelines

### Colors to Use
- **Red**: Critical features, warnings
- **Green**: Success states, positive actions
- **Blue**: Information, clickable elements
- **Orange**: Important notes, cautions
- **Purple**: Navigation paths

### Annotation Elements
1. **Numbered circles**: For step-by-step guides
2. **Arrows**: To point to specific features
3. **Rectangles**: To highlight areas
4. **Text callouts**: For explanations
5. **Blur tool**: For sensitive data

## Screenshot Best Practices

### Before Taking Screenshots
1. **Use demo data**: Ensure no real sensitive data is visible
2. **Set consistent window size**: 1920x1080 for consistency
3. **Use light theme**: Better for printing and visibility
4. **Clear notifications**: Remove any system notifications
5. **Fresh data**: Click refresh to show current timestamps

### Data to Include
Create realistic demo data:
- User: `demo.user@company.com`
- IPs: Use RFC1918 ranges (192.168.x.x, 10.x.x.x)
- Threats: Mix of severities
- Timestamps: Recent times

### Sensitive Data to Hide
- Real user emails
- Actual IP addresses (external)
- Real compartment IDs
- API keys or tokens
- Real threat intelligence

## Screenshot Naming Convention

Use this format: `[page]-[feature]-[state].png`

Examples:
- `dashboard-metrics-overview.png`
- `threat-hunting-ip-search-results.png`
- `query-builder-autocomplete-active.png`
- `settings-security-thresholds.png`

## Creating Interactive Elements

### Hover States
1. Take screenshot of normal state
2. Take screenshot of hover state
3. Create GIF showing transition

### Click Actions
1. Before click state
2. During click (if applicable)
3. After click result

### Dropdowns and Menus
1. Closed state
2. Open state with all options visible
3. Selected state

## Annotation Examples

### Dashboard Metrics Card
```
[1] Metric Name
[2] Current Value  
[3] Trend Indicator
[4] Change Percentage
[5] Description
```

### Query Builder
```
(A) Query Input Area
(B) Syntax Highlighting
(C) Run Query Button
(D) Save Query Option
(E) Results Display
```

## Storage and Organization

Create folder structure:
```
/screenshots
  /dashboard
  /navigation
  /security-overview
  /log-sources
  /query-builder
  /storage-analytics
  /threat-hunting
  /threat-analytics
  /settings
  /misc
```

## Quality Checklist

Before finalizing:
- [ ] High resolution (minimum 1920x1080)
- [ ] Clear and legible text
- [ ] Consistent theme and styling
- [ ] No personal/sensitive data
- [ ] Proper annotations
- [ ] Descriptive filenames
- [ ] Organized in folders

## Export Settings

- Format: PNG for static, GIF for animations
- Compression: Optimize for web (under 500KB)
- Resolution: 2x for Retina displays
- Color space: sRGB

---

Once screenshots are captured and annotated, update the USER_GUIDE.md file by replacing the placeholder text `*[Screenshot: description]*` with the actual image markdown:

```markdown
![Dashboard Overview](screenshots/dashboard/dashboard-metrics-overview.png)
```

For animated GIFs:
```markdown
![Query Autocomplete](screenshots/query-builder/query-autocomplete-demo.gif)
```