# Logan Security Dashboard - Documentation

Welcome to the comprehensive documentation for the Logan Security Dashboard, a Next.js-based security monitoring application integrated with Oracle Cloud Infrastructure (OCI) Logging Analytics.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Features](#features)
- [Development](#development)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

Logan Security Dashboard is a modern web application designed for security monitoring, threat analysis, and incident response. It provides real-time insights into network traffic, security events, and threat intelligence through an intuitive dashboard interface.

### Key Technologies
- **Frontend**: Next.js 15, React 18, TypeScript
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Backend**: Python scripts with OCI SDK
- **Database**: Oracle Autonomous Database
- **Authentication**: OCI Instance Principals
- **Deployment**: Docker, PM2

### Core Capabilities
- **Real-time Security Monitoring**: Live dashboard with security event tracking
- **Threat Intelligence**: Integration with OCI Threat Intelligence service
- **RITA Analytics**: Network behavior analysis using RITA-style algorithms
- **MITRE ATT&CK Integration**: Framework-based threat categorization
- **Query Builder**: Advanced query interface for log analysis
- **Incident Response**: Automated workflow management
- **Multi-tenant Support**: Support for multiple OCI environments

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│                  API Routes (Node.js)                      │
├─────────────────────────────────────────────────────────────┤
│                Python Backend Scripts                      │
├─────────────────────────────────────────────────────────────┤
│                 OCI Logging Analytics                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **Frontend** sends requests to Next.js API routes
2. **API Routes** spawn Python processes for OCI integration
3. **Python Scripts** query OCI Logging Analytics using SDK
4. **Results** are processed and returned through the API chain
5. **Frontend** renders data in interactive dashboards

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- OCI CLI configured
- Oracle Cloud account with Logging Analytics enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd logan-security-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Default login uses OCI Instance Principals

## ✨ Features

### 🔍 Security Overview
- Real-time security event monitoring
- Compliance dashboard with automated checks
- Infrastructure security status
- Threat intelligence integration

### 📊 Threat Analytics
- Advanced threat detection using behavioral analysis
- RITA-style network analysis
- Beacon detection and C2 communication identification
- Malicious IP highlighting with threat intelligence

### 🔎 Threat Hunting
- Interactive query builder with natural language support
- Saved query management
- Field exploration and mapping
- Advanced filtering and correlation

### 🗺️ MITRE ATT&CK Integration
- Technique mapping and visualization
- Heat maps for threat coverage
- Sysmon integration for Windows environments
- Custom layer generation

### 🌐 Network Analysis
- VCN flow log analysis
- Communication pattern detection
- Anomaly identification
- Interactive network graphs

### 🚨 Incident Response
- Automated incident workflow
- Evidence collection and analysis
- Timeline reconstruction
- Collaborative investigation tools

### ⚙️ Administration
- Multi-tenant environment management
- User access control
- Configuration management
- System health monitoring

## 🛠️ Development

### Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   ├── components/             # React components organized by domain
│   │   ├── dashboard/          # Dashboard components
│   │   ├── security/           # Security feature components
│   │   ├── query/              # Query-related components
│   │   └── common/             # Shared components
│   ├── lib/                    # Utility functions and configurations
│   └── hooks/                  # Custom React hooks
├── scripts/                    # Python backend scripts
│   ├── oci/                   # OCI integration scripts
│   ├── analysis/              # Data analysis scripts
│   └── rita/                  # RITA analysis scripts
├── config/                     # Configuration files
├── docs/                       # Documentation
└── public/                     # Static assets
```

### Development Commands

```bash
# Development
npm run dev                     # Start development server
npm run build                   # Build for production
npm run start                   # Start production server

# Code Quality
npm run lint                    # Run ESLint
npm run typecheck              # Run TypeScript type checking

# Testing
npm run test                    # Run test suite (when available)

# Python Scripts
cd scripts && python3 logan_client.py test    # Test OCI connection
```

### Component Development Guidelines

1. **Use TypeScript** for all components with strict type checking
2. **Follow naming conventions**: PascalCase for components, camelCase for functions
3. **Implement error boundaries** for robust error handling
4. **Use React hooks** for state management and side effects
5. **Apply responsive design** principles with Tailwind CSS
6. **Include loading states** and error handling in all data-fetching components

### API Route Development

1. **Use Next.js App Router** patterns for API routes
2. **Implement proper error handling** with standardized error responses
3. **Use TypeScript interfaces** for request/response types
4. **Add request validation** for all endpoints
5. **Include proper HTTP status codes** and error messages

## 🚀 Deployment

### Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Monitor logs**
   ```bash
   pm2 logs logan-security-dashboard
   ```

### Docker Deployment

```bash
# Build Docker image
docker build -t logan-security-dashboard .

# Run container
docker run -p 3000:3000 \
  -e LOGAN_REGION=<your-region> \
  -e LOGAN_COMPARTMENT_ID=<your-compartment> \
  logan-security-dashboard
```

### Environment Variables

```bash
# Required
LOGAN_REGION=eu-frankfurt-1
LOGAN_COMPARTMENT_ID=ocid1.compartment...

# Optional
NODE_ENV=production
PORT=3000
```

## 📖 Additional Documentation

### 📸 Visual Documentation
- **[Visual Guide](./visual-guide.md)** - Complete visual walkthrough with screenshots
- **[Screenshots Gallery](./screenshots/)** - High-resolution interface screenshots

### 🏗️ Technical Documentation
- [Architecture Deep Dive](./architecture/overview.md)
- [API Reference](./api/reference.md)
- [Configuration Guide](./configuration/guide.md)
- [Deployment Guide](./deployment/production.md)
- [Troubleshooting](./troubleshooting/common-issues.md)
- [Feature Documentation](./features/)

## 🤝 Contributing

Please refer to the [Contributing Guide](./CONTRIBUTING.md) for development guidelines and contribution processes.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [Troubleshooting Guide](./troubleshooting/common-issues.md)
- Review [Common Issues](./troubleshooting/faq.md)
- Create an issue in the project repository