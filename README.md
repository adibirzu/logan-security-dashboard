# Logan Security Dashboard

## ⚠️ Disclaimer

This software was created to showcase Oracle Cloud Infrastructure (OCI) Logging Analytics capabilities and demonstrate how to expand them using third-party services and modern web technologies. The architecture and code were written by me with the assistance of Oracle Code Assist and multiple LLMs including Claude, OpenAI GPT-4o, Meta Llama 3.2, and Grok 3. This is an educational project designed to learn more about OCI's service capabilities and how to optimize security monitoring tasks.

**This is NOT an official Oracle product** - it is a personal project demonstrating integration possibilities with OCI Logging Analytics.

## 🔒 Security Notice

**IMPORTANT: NO HARDCODED CREDENTIALS**

This codebase contains **no hardcoded passwords, API keys, or other sensitive information**. All credentials must be provided through environment variables. Before deployment:

1. **Generate secure secrets**: `./scripts/generate-secrets.sh`
2. **Configure environment variables**: Update `.env` files with actual values
3. **Never commit secrets**: Ensure `.env` files are in `.gitignore`
4. **Follow security guide**: See [SECURITY_CREDENTIALS_GUIDE.md](SECURITY_CREDENTIALS_GUIDE.md)

---

A comprehensive security monitoring and analysis dashboard built for Oracle Cloud Infrastructure (OCI) Logging Analytics. This Next.js application provides real-time security insights, threat analysis, and log source management with an intuitive web interface.

![Logan Security Dashboard](https://img.shields.io/badge/Next.js-15.3.5-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![Python](https://img.shields.io/badge/Python-3.8+-green) ![OCI](https://img.shields.io/badge/OCI-Logging%20Analytics-red)

## Current detection catalog

The rules browser and query library use a pinned snapshot of
[OCI Log Analytics Detections](https://github.com/adibirzu/oci-log-analytics-detections):
**1,368 content items / 1,266 distinct query patterns** at upstream commit
`2ae1c63d07bbafe9113437a952749d9a09327757`.
Query text and provenance are preserved. Upstream validation is displayed
separately from validation in your tenant; imported content is not automatically
scheduled or deployed. See [refresh and validation instructions](docs/DETECTION_CATALOG_SYNC.md).

## 🚀 Project Overview

Logan Security Dashboard is a modern web application that integrates with OCI Logging Analytics to provide security teams with centralized monitoring, threat detection, and log analysis capabilities. The platform combines the power of OCI's cloud-native logging infrastructure with an intuitive dashboard for security operations.

## ✨ Key Capabilities

### 🔍 **Security Monitoring**
- **Real-time Security Metrics**: Failed logins, privilege escalations, blocked connections, and critical alerts
- **Threat Level Assessment**: Dynamic threat level calculation based on security events
- **System Health Monitoring**: Overall system status and connection health indicators
- **Time-based Analysis**: Configurable time periods from 1 hour to 30 days

### 📊 **Log Source Management**
- **Comprehensive Source Inventory**: View all available and active log sources
- **Activity Monitoring**: Real-time event counts and source status
- **Advanced Filtering**: Search, sort, and filter by activity, name, or time period
- **Source Analytics**: Visual representation of log source activity and health

### 🔎 **Advanced Query Interface**
- **Custom Query Builder**: Execute custom OCI Logging Analytics queries
- **Query Validation**: Real-time query syntax validation with error reporting
- **Bypass Mode**: Direct query execution for console-tested queries
- **Query Library**: Predefined security queries organized by category
- **Query Management**: Save, organize, and reuse custom queries

### 🗺️ **Threat Intelligence**
- **MITRE ATT&CK Integration**: Framework-based threat categorization
- **Geographic Threat Mapping**: Visual representation of threat origins
- **Suricata IDS Analysis**: Intrusion detection signature analysis
- **Network Traffic Analysis**: VCN flow log analysis and visualization

### 🛠️ **Field Discovery & Management**
- **Dynamic Field Explorer**: Discover available fields from active log sources
- **Field Filtering**: Show only fields from sources with recent data
- **Field Documentation**: Comprehensive field descriptions and usage examples
- **Query Building Assistance**: Field selection integration with query builder

## 🏗️ High-Level Architecture

### Frontend Architecture (Next.js 15)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 15 App Router  │  React 18  │  TypeScript  │  Tailwind │
├─────────────────────────────────────────────────────────────────┤
│                     Component Structure                        │
├─────────────────────────────────────────────────────────────────┤
│  📱 Pages           │  🧩 Components     │  🎨 UI Components     │
│  • Dashboard        │  • Navigation      │  • shadcn/ui          │
│  • Security Overview│  • Dashboard       │  • Custom Cards       │
│  • Log Sources      │  • Tables          │  • Forms & Inputs     │
│                     │  • Visualizations  │  • Charts & Graphs    │
├─────────────────────────────────────────────────────────────────┤
│                     State Management                           │
├─────────────────────────────────────────────────────────────────┤
│  React Hooks  │  Custom Hooks  │  Local Storage  │  API Cache   │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Architecture (API Routes + Python Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Backend Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                   Next.js API Routes                           │
├─────────────────────────────────────────────────────────────────┤
│  /api/mcp/search         │  Custom log search with validation   │
│  /api/mcp/dashboard-stats│  Security metrics aggregation        │
│  /api/mcp/log-groups     │  Log source enumeration & analysis   │
│  /api/mcp/fields         │  Field discovery & filtering         │
│  /api/mcp/storage-usage  │  Storage consumption monitoring      │
│  /api/mcp/sources        │  Comprehensive source catalog        │
├─────────────────────────────────────────────────────────────────┤
│                   Python Integration Layer                     │
├─────────────────────────────────────────────────────────────────┤
│  logan_client.py         │  OCI SDK wrapper & query execution   │
│  security_analyzer.py    │  Security event analysis & metrics   │
│  query_mapper.py         │  Query translation & optimization    │
│  query_validator.py      │  Query syntax validation & fixing    │
└─────────────────────────────────────────────────────────────────┘
```

### External Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   Oracle Cloud Infrastructure                   │
├─────────────────────────────────────────────────────────────────┤
│                  OCI Logging Analytics                         │
├─────────────────────────────────────────────────────────────────┤
│  📊 Log Sources         │  🔍 Query Engine       │  💾 Storage    │
│  • OCI Audit Logs      │  • Real-time search    │  • Active Data │
│  • VCN Flow Logs       │  • Field aggregation   │  • Archived    │
│  • WAF Logs            │  • Time-based queries  │  • Recalled    │
│  • Windows Events      │  • Statistical analysis│               │
│  • Suricata IDS        │  • Pattern matching    │               │
│  • Custom Sources      │  • Correlation rules   │               │
├─────────────────────────────────────────────────────────────────┤
│                     Authentication & Security                   │
├─────────────────────────────────────────────────────────────────┤
│  OCI Config            │  API Keys              │  IAM Policies  │
│  • ~/.oci/config       │  • Private key auth    │  • RBAC        │
│  • Region settings     │  • Fingerprint verify  │  • Compartments│
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 MCP (Model Context Protocol) Design

### Overview

The Logan Security Dashboard implements a **Python-Node.js bridge architecture** that leverages the MCP concept for seamless integration between the web frontend and OCI backend services.

### MCP Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Design Pattern                         │
├─────────────────────────────────────────────────────────────────┤
│                      Frontend (Client)                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  React Components  →  API Calls  →  HTTP Requests      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             ↓                                  │
├─────────────────────────────────────────────────────────────────┤
│                   Next.js API Routes (Proxy)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • Parameter validation                                 │    │
│  │  • Security sanitization                               │    │
│  │  • Error handling                                      │    │
│  │  • Response transformation                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             ↓                                  │
├─────────────────────────────────────────────────────────────────┤
│                   Python Integration Layer                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • execFile() secure execution                         │    │
│  │  • JSON communication protocol                         │    │
│  │  • Environment variable injection                      │    │
│  │  • Process lifecycle management                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             ↓                                  │
├─────────────────────────────────────────────────────────────────┤
│                     Python Services Layer                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  logan_client.py     │  OCI SDK abstraction            │    │
│  │  security_analyzer.py│  Security logic processing      │    │
│  │  query_mapper.py     │  Query transformation           │    │
│  │  query_validator.py  │  Syntax validation              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             ↓                                  │
├─────────────────────────────────────────────────────────────────┤
│                      OCI Logging Analytics                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  • REST API endpoints                                  │    │
│  │  • Authentication handling                             │    │
│  │  • Query execution engine                              │    │
│  │  • Data aggregation services                           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### MCP Communication Flow

1. **Request Initiation**: React components make HTTP requests to Next.js API routes
2. **Parameter Processing**: API routes validate, sanitize, and transform parameters
3. **Python Invocation**: Secure `execFile()` calls to Python scripts with JSON arguments
4. **OCI Integration**: Python scripts use OCI SDK to interact with Logging Analytics
5. **Response Processing**: JSON responses flow back through the chain with proper error handling
6. **Frontend Rendering**: React components receive structured data for visualization

### Key MCP Features

#### 🔒 **Security Layer**
- **Input Sanitization**: All user inputs are validated before Python execution
- **Secure Execution**: `execFile()` prevents shell injection attacks
- **Environment Isolation**: Python processes run with controlled environment variables
- **Error Boundary**: Comprehensive error handling at each layer

#### 📡 **Communication Protocol**
- **JSON-based**: All inter-process communication uses structured JSON
- **Type Safety**: TypeScript interfaces ensure data consistency
- **Error Propagation**: Structured error messages with context preservation
- **Timeout Management**: Process timeout controls prevent hanging operations

#### 🔄 **Process Management**
- **Stateless Operations**: Each request spawns independent Python processes
- **Resource Cleanup**: Automatic process termination and resource deallocation
- **Concurrent Handling**: Multiple requests processed simultaneously
- **Graceful Degradation**: Fallback responses when services are unavailable

## 🛠️ Core Functionalities

### 1. **Real-time Security Monitoring**

**Supported Metrics**:
- Failed login attempts across all systems
- Privilege escalation attempts
- Network connections blocked by security controls
- Critical security alerts requiring immediate attention
- Total security events processed
- Active log sources generating security data

**Standardized Security Queries**:
1. **Failed Logins**: `'Log Source' in ('Windows Security Events', 'Linux Secure Logs', 'OCI Audit Logs') and 'Security Result' = denied and Time > dateRelative({period}m)`
2. **Privilege Escalations**: `'Log Source' in ('Windows Security Events', 'Linux Secure Logs') and 'Event Type' in ('privilege_escalation', 'user_elevation') and Time > dateRelative({period}m)`
3. **Blocked Connections**: `'Log Source' = 'OCI VCN Flow Unified Schema Logs' and Action = 'reject' and Time > dateRelative({period}m)`
4. **Critical Alerts**: `'Log Source' in ('OCI WAF Logs', 'com.oraclecloud.logging.custom.Suricatalogs') and 'Event Type' = 'alert' and Time > dateRelative({period}m)`

### 2. **Advanced Log Source Management**

**Key Features**:
- **Real-time Activity Monitoring**: Track event counts and last activity timestamps
- **Comprehensive Source Catalog**: Display both active and configured log sources
- **Advanced Filtering**: Search, sort, and filter by multiple criteria
- **Time-based Analysis**: Configurable time periods for source activity analysis

### 3. **Intelligent Query Management**

**Query Features**:
- **Syntax Validation**: Real-time query syntax checking with error reporting
- **Auto-completion**: Field and function suggestions based on available data
- **Query Templates**: Predefined security queries for common use cases
- **Bypass Mode**: Direct query execution for console-tested queries
- **Query Library**: Save and organize custom queries for reuse

### 4. **Dynamic Field Discovery**

**Benefits**:
- **Relevant Fields Only**: Show fields from sources with actual data
- **Reduced Complexity**: Filter out unused fields to improve usability
- **Context-aware**: Field suggestions based on current time period
- **Documentation**: Comprehensive field descriptions and usage examples

### 5. **Storage and Performance Monitoring**

**Metrics Tracked**:
- **Active Data Storage**: Currently searchable log data
- **Archived Data Storage**: Long-term storage for compliance
- **Recalled Data Storage**: Previously archived data brought back online
- **Storage Trends**: Usage patterns and growth projections

## 📱 Application Pages

### 🏠 **Dashboard** (`/`)
- Main dashboard with search and recent events
- Custom query interface with validation
- Predefined security queries organized by category
- Real-time search results with visualizations

### 🛡️ **Security Overview** (`/security-overview`)
- Comprehensive security metrics dashboard
- Time period selection affecting all queries
- System health and threat level indicators
- Security query documentation with time filtering

### 🗂️ **Log Sources** (`/log-sources`)
- All log sources with filtering and analysis
- Real-time activity monitoring
- Advanced filtering and search capabilities
- Visual activity indicators and progress bars

## 📋 Prerequisites

### System Requirements

- **Operating System**: Windows 10+, macOS 10.14+, or Linux (Ubuntu 18.04+)
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 2GB free space
- **Network**: Internet connection for OCI API access

### Required Software

1. **Node.js** (v18.0.0 or higher)
   ```bash
   # Check version
   node --version
   npm --version
   ```
   - Download from: https://nodejs.org/

2. **Python** (v3.8 or higher)
   ```bash
   # Check version
   python3 --version
   pip3 --version
   ```
   - Download from: https://python.org/

3. **Git**
   ```bash
   # Check version
   git --version
   ```
   - Download from: https://git-scm.com/

4. **OCI CLI** (Oracle Cloud Infrastructure Command Line Interface)
   ```bash
   # Check if installed
   oci --version
   ```
   - Installation guide: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm

### OCI Access Requirements

- **OCI Account**: Active Oracle Cloud Infrastructure account
- **Logging Analytics**: Service must be enabled in your tenancy
- **IAM Permissions**: Required permissions for Logging Analytics access:
  ```
  ALLOW group <your-group> to manage log-analytics-* in tenancy
  ALLOW group <your-group> to read compartments in tenancy
  ```

## 🛠️ Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd logan-security-dashboard
```

### Step 2: Install Node.js Dependencies

```bash
# Install all Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Install Python Dependencies

```bash
# Install Python dependencies for backend scripts
pip3 install -r scripts/requirements.txt

# Verify OCI Python SDK installation
python3 -c "import oci; print('OCI SDK installed successfully')"
```

### Step 4: Configure OCI CLI

If you haven't configured OCI CLI yet:

```bash
# Interactive setup - follow the prompts
oci setup config

# Test configuration
oci iam user list --auth-purpose service
```

**Required information for setup:**
- User OCID
- Tenancy OCID
- Region
- Private key path
- Public key fingerprint

### Step 5: Environment Configuration

The dashboard uses embedded Python scripts for OCI integration:

```bash
# Create environment file
cp .env.local.example .env.local

# Edit .env.local with your OCI configuration
nano .env.local
```

## ⚙️ Configuration

### Step 1: Environment Variables

Create the main environment file:

```bash
# In the logan-security-dashboard directory
cp .env.local.example .env.local
```

Edit `.env.local` with your specific configuration:

```bash
# OCI Configuration
NEXT_PUBLIC_LOGAN_REGION=eu-frankfurt-1
NEXT_PUBLIC_LOGAN_COMPARTMENT_ID=ocid1.compartment.oc1..your-compartment-id

# Debug Configuration (optional)
LOGAN_DEBUG=false
```

### Step 2: OCI Configuration Verification

### Step 3: Find Your OCI Configuration Values

#### Region
```bash
# List available regions
oci iam region list
```

#### Compartment ID
```bash
# List compartments in your tenancy
oci iam compartment list --all
```

#### Namespace
```bash
# Get your tenancy namespace
oci os ns get
```

### Step 4: Verify OCI Logging Analytics Access

```bash
# Test Logging Analytics access
cd scripts
python3 logan_client.py test
```

## 🚀 Running the Application

### Method 1: Development Mode (Recommended for testing)

1. **Start the Dashboard**:
   ```bash
   npm run dev
   ```

2. **Access the Dashboard**:
   - Open your browser and navigate to: http://localhost:3000
   - You should see the Logan Security Dashboard interface with navigation to:
     - Dashboard (Main page with search and events)
     - Security Overview (Comprehensive security metrics)
     - Log Sources (All log sources with filtering)

### Method 2: Production Mode

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm run start
   ```

### Method 3: Using PM2 (For server deployment)

1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 ecosystem file** (`ecosystem.config.js`):
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'logan-dashboard',
         script: 'npm',
         args: 'start',
         env: {
           NODE_ENV: 'production',
           PORT: 3000
         }
       }
     ]
   };
   ```

3. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

## 🔧 Quick Installation

```bash
# Clone repository
git clone https://github.com/adibirzu/logan-security-dashboard.git
cd logan-security-dashboard

# Install dependencies
npm install
pip3 install -r scripts/requirements.txt

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your OCI configuration

# Start the application
npm run dev
```

## 📊 Usage Guide

### Quick Start

1. **Access the Dashboard**: http://localhost:3000
2. **Run a Security Query**: Click "Quick Security Queries" and select "Failed Login Attempts"
3. **View Results**: Results will appear with interactive visualizations
4. **Save Queries**: Click "Save Query" to store custom queries for reuse

### Query Examples

#### Basic Log Count by Source
```
* | stats count as logrecords by 'Log Source' | sort -logrecords
```

#### Failed Authentication Events
```
* | where 'Message' like '%failed%' and 'Message' like '%auth%' | stats count by 'Source IP'
```

#### High Volume Event Detection
```
* | stats count by 'Source IP' | where count > 100 | sort -count
```

### Time Range Selection

- Use the clock dropdown to select from 15 minutes to 30 days
- Default is 24 hours for optimal performance
- Longer time ranges may take more time to process

### Visualization Options

- **Table View**: Raw data with sortable columns
- **Bar Charts**: Event counts and distributions
- **Pie Charts**: Proportional data visualization
- **Trend Charts**: Time-based analysis

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot connect to OCI"
```bash
# Check OCI CLI configuration
oci iam user list

# Verify Logging Analytics permissions
oci logging analytics list-log-groups
```

#### 2. "MCP Server not responding"
```bash
# Check if MCP server is running
ps aux | grep logan_mcp

# Check MCP server logs
tail -f /path/to/logan-fastmcp/logs/server.log
```

#### 3. "No log sources found"
```bash
# Verify compartment access
oci iam compartment list --compartment-id <your-compartment-id>

# Check Logging Analytics service status
oci logging analytics get-namespace --namespace-name <your-namespace>
```

#### 4. "Module not found" errors
```bash
# Reinstall Node.js dependencies
rm -rf node_modules package-lock.json
npm install

# Reinstall Python dependencies
pip3 install --force-reinstall -r scripts/requirements.txt
```

### Debug Mode

Enable debug logging by setting:

```bash
# In .env.local
DEBUG=true
NODE_ENV=development

# In MCP server .env
DEBUG=true
```

### Log Files

- **Dashboard logs**: `logan-security-dashboard/logan_mcp.log`
- **MCP server logs**: Check terminal output where MCP server is running
- **OCI CLI logs**: `~/.oci/logs/`

### Performance Issues

1. **Reduce time range**: Use shorter time periods for faster queries
2. **Limit results**: Add `| head 100` to queries
3. **Check network**: Ensure stable internet connection to OCI
4. **Resource allocation**: Ensure adequate RAM and CPU

## 🔒 Security Considerations

### Credential Management

- **Never commit credentials**: Use `.env.local` (already in `.gitignore`)
- **OCI key security**: Protect your OCI private key file (chmod 600)
- **Rotate keys regularly**: Follow OCI security best practices

### Network Security

- **Firewall**: Ensure ports 3000-3001 are accessible only to trusted networks
- **HTTPS**: Use reverse proxy (nginx/Apache) with SSL in production
- **VPN**: Consider VPN access for remote administration

### Access Control

- **Authentication**: Implement authentication layer for production use
- **Authorization**: Limit OCI permissions to minimum required
- **Audit logging**: Monitor dashboard access and queries

## 🚢 Deployment Options

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t logan-security-dashboard .
docker run -p 3000:3000 --env-file .env.local logan-security-dashboard
```

### Cloud Deployment (Vercel)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in Vercel dashboard

### Server Deployment (systemd)

Create `/etc/systemd/system/logan-dashboard.service`:

```ini
[Unit]
Description=Logan Security Dashboard
After=network.target

[Service]
Type=simple
User=dashboard
WorkingDirectory=/opt/logan-security-dashboard
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable logan-dashboard
sudo systemctl start logan-dashboard
```

## 🔍 API Reference

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp/search` | POST | Execute custom log queries |
| `/api/mcp/dashboard-stats` | GET | Get security dashboard metrics |
| `/api/mcp/log-groups` | GET | List log sources with activity |
| `/api/mcp/fields` | GET | Discover available fields |
| `/api/mcp/storage-usage` | GET | Monitor storage consumption |
| `/api/mcp/sources` | GET | Get comprehensive source catalog |
| `/api/mcp/security-events` | GET | Security events with filters |
| `/api/mcp/event-types` | GET | List available event types |

### Query Parameters

- `time_period`: Time period in minutes (60, 240, 480, 1440, 4320, 10080, 43200)
- `used_sources_only`: Filter fields to active sources only (boolean)
- `field_type`: Filter fields by type (string)
- `bypass_validation`: Skip query validation (boolean)
- `time_period_days`: Time period in days for storage usage (number)
- `severity`: Event severity (low, medium, high, critical)
- `eventType`: Event type filter
- `maxCount`: Maximum results (default: 100)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_LOGAN_REGION` | OCI region for Logging Analytics | `eu-frankfurt-1` |
| `NEXT_PUBLIC_LOGAN_COMPARTMENT_ID` | OCI compartment ID | Required |
| `LOGAN_DEBUG` | Enable debug logging | `false` |

### OCI Permissions Required

- `LOG_ANALYTICS_LOG_GROUP_READ`
- `LOG_ANALYTICS_QUERY_EXECUTE`
- `LOG_ANALYTICS_SOURCE_READ`
- `LOG_ANALYTICS_FIELD_READ`
- `LOG_ANALYTICS_STORAGE_READ`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check this README for comprehensive setup instructions
- **Issues**: Create a GitHub issue for bugs or feature requests
- **OCI Support**: Consult Oracle Cloud Infrastructure documentation
- **Community**: Join OCI community forums for general OCI questions

## 📈 Changelog

### v0.1.0 (Current)
- Initial release
- Basic security dashboard functionality
- OCI Logging Analytics integration
- Query visualization and management
- Predefined security checks

