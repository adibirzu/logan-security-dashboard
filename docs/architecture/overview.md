# Architecture Overview

## System Architecture

Logan Security Dashboard follows a modern, layered architecture designed for scalability, maintainability, and security.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  React Components │ Dashboards │ Interactive UI             │
├─────────────────────────────────────────────────────────────┤
│                    Frontend Layer                           │
│  Next.js 15 │ App Router │ TypeScript │ Tailwind CSS       │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway Layer                        │
│  Next.js API Routes │ Request Validation │ Error Handling  │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services Layer                   │
│  Python Scripts │ OCI SDK │ Data Processing │ Analytics     │
├─────────────────────────────────────────────────────────────┤
│                    Data Layer                               │
│  OCI Logging Analytics │ Threat Intelligence │ Oracle DB    │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

The frontend follows a domain-driven design with components organized by business functionality:

```
components/
├── dashboard/          # Business intelligence and overview
├── security/           # Security-specific features
│   ├── threat-analytics/
│   ├── threat-hunting/
│   └── mitre-attack/
├── query/              # Data querying and exploration
├── infrastructure/     # OCI infrastructure monitoring
└── common/             # Shared UI components
```

### API Layer

API routes are organized by domain and follow RESTful principles:

```
api/
├── oci/                # OCI-specific operations
│   ├── logging/        # Logging Analytics integration
│   ├── compute/        # Compute service integration
│   └── security/       # Security service integration
├── analytics/          # Data analytics endpoints
├── query/              # Query processing endpoints
├── security/           # Security feature endpoints
└── integrations/       # External service integrations
```

### Backend Services

Python services handle OCI integration and data processing:

```
scripts/
├── oci/                # OCI SDK integration
│   ├── logan_client.py         # Main OCI Logging client
│   ├── oci_compute_client.py   # Compute service client
│   └── oci_threat_intel.py     # Threat intelligence client
├── analysis/           # Data analysis engines
│   ├── security_analyzer.py    # Security event analysis
│   ├── rita_analyzer.py        # Network behavior analysis
│   └── graph_analyzer.py       # Network graph analysis
└── query/              # Query processing
    ├── query_mapper.py         # Query translation
    └── field_mapping.py        # Field mapping logic
```

## Data Flow Architecture

### 1. Request Flow

```
User Action → React Component → API Route → Python Script → OCI Service → Response
```

### 2. Real-time Data Flow

```
OCI Logging Analytics → Webhook → API Route → WebSocket → React Component → UI Update
```

### 3. Threat Intelligence Flow

```
IP/Domain Input → Threat Intel API → OCI Threat Intelligence → Cache → UI Display
```

## Security Architecture

### Authentication & Authorization

1. **OCI Instance Principals**: Primary authentication method for production
2. **CLI Configuration**: Development environment authentication
3. **Environment Variables**: Secure configuration management
4. **Resource Principals**: Serverless function authentication

### Data Security

1. **Encryption in Transit**: All API communications use HTTPS
2. **Encryption at Rest**: OCI Logging Analytics handles data encryption
3. **Access Control**: Fine-grained permissions using OCI IAM
4. **Secret Management**: Environment variables and OCI Vault integration

### Network Security

1. **CORS Policy**: Configured for specific domains
2. **Rate Limiting**: API endpoint protection
3. **Input Validation**: All user inputs are validated and sanitized
4. **Security Headers**: Comprehensive security header implementation

## Performance Architecture

### Frontend Optimization

1. **Code Splitting**: Dynamic imports for lazy loading
2. **Component Caching**: React component memoization
3. **Bundle Optimization**: Webpack optimization and tree shaking
4. **Progressive Loading**: Incremental data loading

### Backend Optimization

1. **Connection Pooling**: Efficient OCI SDK connection management
2. **Query Optimization**: Optimized OCI Logging Analytics queries
3. **Caching Strategy**: Multi-level caching implementation
4. **Batch Processing**: Efficient data processing patterns

### Data Optimization

1. **Query Pagination**: Large dataset handling
2. **Field Selection**: Minimal data transfer
3. **Compression**: Response compression
4. **CDN Integration**: Static asset optimization

## Scalability Architecture

### Horizontal Scaling

1. **Stateless Design**: Stateless API design for easy scaling
2. **Load Balancing**: Support for multiple application instances
3. **Database Scaling**: Oracle Autonomous Database auto-scaling
4. **Container Support**: Docker containerization for deployment

### Vertical Scaling

1. **Resource Optimization**: Efficient memory and CPU usage
2. **Connection Management**: Optimized database connections
3. **Process Management**: PM2 process clustering
4. **Memory Management**: Garbage collection optimization

## Technology Stack

### Frontend Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5+
- **UI Library**: React 18
- **Component Library**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Context API
- **Charts**: Custom D3.js integrations

### Backend Stack

- **Runtime**: Node.js 18+
- **API Framework**: Next.js API Routes
- **Language**: Python 3.8+ (for OCI integration)
- **OCI SDK**: Oracle Cloud Infrastructure SDK
- **Process Management**: PM2
- **Database**: Oracle Autonomous Database

### Infrastructure Stack

- **Cloud Provider**: Oracle Cloud Infrastructure
- **Logging**: OCI Logging Analytics
- **Compute**: OCI Compute Instances
- **Storage**: OCI Object Storage
- **Networking**: OCI Virtual Cloud Network
- **Security**: OCI IAM + Instance Principals

## Deployment Architecture

### Development Environment

```
Local Machine → Node.js Dev Server → Python Scripts → OCI CLI Config → OCI Services
```

### Production Environment

```
OCI Compute Instance → PM2 Process Manager → Application → Python Workers → OCI Services
```

### Container Environment

```
Docker Container → Next.js Application → Python Runtime → OCI SDK → OCI Services
```

## Integration Architecture

### OCI Service Integration

1. **Logging Analytics**: Primary data source for security events
2. **Compute Service**: Infrastructure monitoring and management
3. **Threat Intelligence**: Threat detection and analysis
4. **IAM Service**: Authentication and authorization
5. **Vault Service**: Secret management

### External Service Integration

1. **MITRE ATT&CK**: Framework integration for threat categorization
2. **RITA**: Network analysis algorithm implementation
3. **STIX/TAXII**: Threat intelligence format support
4. **N8N**: Workflow automation integration

### Data Integration

1. **Real-time Streams**: Live data processing
2. **Batch Processing**: Historical data analysis
3. **Event-driven**: Webhook and event processing
4. **API Integration**: RESTful service integration

## Monitoring Architecture

### Application Monitoring

1. **Health Checks**: Application health endpoints
2. **Performance Metrics**: Response time and throughput monitoring
3. **Error Tracking**: Comprehensive error logging
4. **User Analytics**: Usage pattern analysis

### Infrastructure Monitoring

1. **OCI Monitoring**: Native OCI monitoring integration
2. **Resource Usage**: CPU, memory, and storage monitoring
3. **Network Monitoring**: Network performance tracking
4. **Security Monitoring**: Security event correlation

### Logging Architecture

1. **Structured Logging**: JSON-formatted log entries
2. **Log Aggregation**: Centralized log collection
3. **Log Analysis**: Automated log analysis and alerting
4. **Audit Logging**: Comprehensive audit trail

This architecture provides a robust, scalable, and secure foundation for the Logan Security Dashboard while maintaining flexibility for future enhancements and integrations.