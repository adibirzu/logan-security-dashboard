# Oracle MCP Integration Guide

This document provides comprehensive guidance for integrating Logan Security Dashboard with Oracle Database using MCP (Model Context Protocol) servers.

## Overview

The Logan Security Dashboard integrates with Oracle Database through MCP (Model Context Protocol) servers, providing AI-powered database interactions while maintaining security and performance standards.

## Supported Oracle MCP Server Implementations

### 1. oracledb-mcp-server (Python-based)

**Installation:**
```bash
pip install oracledb-mcp-server
```

**Environment Configuration:**
```bash
# Required
ORACLE_CONNECTION_STRING=username/password@hostname:port/service_name
TABLE_WHITE_LIST=["saved_queries", "security_events", "incidents"]
COLUMN_WHITE_LIST=["saved_queries.id", "saved_queries.name", "incidents.title"]

# Optional
QUERY_LIMIT_SIZE=100
```

### 2. mcp-server-oracle (PyPI Package)

**Installation:**
```bash
pip install mcp-server-oracle
```

**Configuration for Claude Desktop:**
```json
{
  "mcpServers": {
    "mcp-server-oracle": {
      "command": "uvx",
      "args": ["mcp-server-oracle"],
      "env": {
        "ORACLE_CONNECTION_STRING": "username/password@hostname:port/service_name"
      }
    }
  }
}
```

### 3. Docker-based Oracle MCP Server

**Docker Run:**
```bash
docker run -i --rm \
  -e ORACLE_CONNECTION_STRING="username/password@hostname:port/service_name" \
  -e TARGET_SCHEMA="LOGAN_USER" \
  -e CACHE_DIR=".cache" \
  -e THICK_MODE="0" \
  dmeppiel/oracle-mcp-server
```

## Logan Security Dashboard Configuration

### Environment Variables

Copy `.env.oracle.example` to `.env.local` and configure:

```bash
# Oracle MCP Server Configuration
ORACLE_MCP_SERVER=localhost
ORACLE_MCP_PORT=8080
ORACLE_MCP_SECURE=false

# Primary Oracle Connection String
ORACLE_CONNECTION_STRING=logan_user/your-password@localhost:1521/ORCL

# MCP Server Specific Configuration
TARGET_SCHEMA=LOGAN_USER
CACHE_DIR=.cache
THICK_MODE=0

# Table and Column Whitelisting
TABLE_WHITE_LIST=["saved_queries", "security_events", "detection_rules", "incidents", "threat_intelligence_indicators"]
COLUMN_WHITE_LIST=["saved_queries.id", "saved_queries.name", "saved_queries.query", "incidents.title", "incidents.severity"]

# Query Limits
QUERY_LIMIT_SIZE=100
```

### Oracle Database Schema Setup

1. **Run the schema creation script:**
```bash
sqlplus LOGAN_USER/password@hostname:port/service_name @database/schema/oracle-schema.sql
```

2. **Verify tables are created:**
```sql
SELECT table_name FROM user_tables WHERE table_name IN (
  'SAVED_QUERIES', 'SECURITY_EVENTS', 'DETECTION_RULES', 
  'INCIDENTS', 'THREAT_INTELLIGENCE_INDICATORS'
);
```

## Oracle MCP Server Protocol

### JSON-RPC 2.0 Format

The Logan Security Dashboard uses JSON-RPC 2.0 protocol for MCP communication:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "sql": "SELECT * FROM saved_queries WHERE category = :1",
      "connection_string": "user/pass@host:port/service",
      "target_schema": "LOGAN_USER",
      "thick_mode": false,
      "cache_dir": ".cache"
    }
  }
}
```

### Supported Operations

| Operation | MCP Method | Description |
|-----------|------------|-------------|
| `query` | `tools/call` | Execute SELECT queries |
| `insert` | `tools/call` | Insert new records |
| `update` | `tools/call` | Update existing records |
| `delete` | `tools/call` | Delete records |
| `list_tables` | `resources/list` | List available tables |
| `describe_table` | `tools/call` | Get table schema |

## Security Considerations

### Connection String Security

1. **Never hardcode credentials** in the codebase
2. **Use environment variables** for sensitive information
3. **Implement connection string masking** in logs:
   ```typescript
   console.log('Connection String:', connectionString.replace(/\/.*@/, '/*****@'))
   ```

### Table/Column Whitelisting

Configure whitelist arrays to restrict database access:

```bash
TABLE_WHITE_LIST=["saved_queries", "security_events", "incidents"]
COLUMN_WHITE_LIST=["saved_queries.id", "saved_queries.name", "incidents.title"]
```

### Query Limitations

Set query limits to prevent performance issues:

```bash
QUERY_LIMIT_SIZE=100  # Maximum number of records per query
```

## Performance Optimization

### Oracle Thick Mode

For better performance with large datasets, enable thick mode:

```bash
THICK_MODE=1
ORACLE_CLIENT_LIB_DIR=/opt/oracle/instantclient_23_7
```

**Requirements for Thick Mode:**
- Oracle Instant Client libraries installed
- Proper library path configuration
- Additional memory allocation

### Caching

Configure caching to improve response times:

```bash
CACHE_DIR=.cache
```

### Connection Pooling

Configure connection pooling for high-load scenarios:

```bash
ORACLE_MCP_MAX_CONNECTIONS=10
ORACLE_MCP_TIMEOUT=30000
```

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Verify Oracle MCP server is running
   - Check firewall settings
   - Validate connection string format

2. **Authentication Errors:**
   - Verify username/password in connection string
   - Check Oracle user privileges
   - Ensure schema access permissions

3. **Table Not Found:**
   - Verify schema is specified correctly
   - Check table whitelist configuration
   - Ensure tables exist in target schema

4. **Performance Issues:**
   - Enable thick mode for large datasets
   - Implement query limits
   - Use caching for frequent queries

### Debug Mode

Enable debug logging for troubleshooting:

```bash
ORACLE_DEBUG=true
ORACLE_LOG_QUERIES=true
ORACLE_LOG_LEVEL=debug
```

## Integration Testing

### Test MCP Connection

```bash
curl -X GET http://localhost:3000/api/database/test-connection
```

Expected response:
```json
{
  "success": true,
  "message": "Oracle MCP database connection successful",
  "status": "connected",
  "connectionDetails": {
    "server": "localhost",
    "port": "8080",
    "database": "ORCL",
    "schema": "LOGAN_USER",
    "executionTime": 150
  }
}
```

### Test Database Operations

1. **Test Query Execution:**
```bash
curl -X POST http://localhost:3000/api/database/saved-queries \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Query", "query": "SELECT 1 FROM DUAL", "category": "test"}'
```

2. **Test Data Retrieval:**
```bash
curl -X GET http://localhost:3000/api/database/saved-queries
```

## Production Deployment

### Environment Setup

1. **Configure production environment variables**
2. **Set up Oracle Database with proper sizing**
3. **Install and configure Oracle MCP server**
4. **Implement monitoring and logging**
5. **Set up backup and recovery procedures**

### Monitoring

Monitor key metrics:
- MCP server response times
- Database connection pool utilization
- Query execution times
- Error rates

### Backup Strategy

Implement regular backups for:
- Saved queries
- Security events
- Detection rules
- Incident data
- Threat intelligence indicators

## API Integration Examples

### JavaScript/TypeScript

```typescript
import { getOracleMCPClient } from '@/lib/database/oracle-client'

// Initialize client
const client = getOracleMCPClient()
await client.initialize()

// Execute query
const result = await client.executeQuery(
  'SELECT * FROM saved_queries WHERE category = :1',
  ['security']
)

// Save query
const savedQuery = await client.saveQuery({
  id: 'unique-id',
  name: 'Security Overview',
  query: 'SELECT * FROM security_events WHERE severity = :1',
  category: 'security',
  // ... other fields
})
```

### Python

```python
import requests
import json

# Test MCP connection
response = requests.get('http://localhost:3000/api/database/test-connection')
print(response.json())

# Execute query through API
query_data = {
    "name": "Test Query",
    "query": "SELECT COUNT(*) FROM security_events",
    "category": "analysis"
}

response = requests.post(
    'http://localhost:3000/api/database/saved-queries',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(query_data)
)

print(response.json())
```

## Advanced Configuration

### Multi-tenant Setup

Configure multiple Oracle MCP servers for different tenants:

```bash
# Tenant 1
ORACLE_CONNECTION_STRING_TENANT1=user1/pass1@host1:1521/service1
TARGET_SCHEMA_TENANT1=TENANT1_SCHEMA

# Tenant 2  
ORACLE_CONNECTION_STRING_TENANT2=user2/pass2@host2:1521/service2
TARGET_SCHEMA_TENANT2=TENANT2_SCHEMA
```

### High Availability

Implement redundancy:
1. **Multiple Oracle MCP server instances**
2. **Database clustering**
3. **Load balancing**
4. **Automatic failover**

## Support and Documentation

### Official Resources

- [Oracle Database MCP Server Blog](https://blogs.oracle.com/database/post/introducing-mcp-server-for-oracle-database)
- [oracledb-mcp-server GitHub](https://github.com/rahgadda/oracledb_mcp_server)
- [mcp-server-oracle PyPI](https://pypi.org/project/mcp-server-oracle/)

### Community Resources

- [Oracle MCP Server Implementations](https://github.com/topics/oracle-mcp-server)
- [MCP Protocol Specification](https://github.com/modelcontextprotocol/specification)

### Logan Security Dashboard Support

For Logan Security Dashboard specific issues:
1. Check the troubleshooting section above
2. Review logs in browser console and server logs
3. Verify environment configuration
4. Test MCP connection independently

---

**Last Updated:** 2025-07-21  
**Version:** 1.0  
**Maintainer:** Logan Security Dashboard Team