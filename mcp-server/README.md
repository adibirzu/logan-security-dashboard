# Logan MCP Server

A dedicated Model Context Protocol (MCP) server for OCI Logging Analytics integration with the Logan Security Dashboard.

## Overview

This MCP server provides a standardized interface for all OCI Logging Analytics operations, separating the web frontend from the backend Python scripts. It implements the MCP protocol to enable secure, efficient communication between the Next.js application and OCI services.

## Features

### Core Tools
- **execute_query**: Execute custom OCI Logging Analytics queries
- **validate_query**: Validate query syntax before execution
- **get_security_events**: Retrieve security events with filtering
- **get_log_sources**: Get log sources with activity information
- **discover_fields**: Discover available fields for query building
- **get_storage_usage**: Monitor OCI Logging Analytics storage consumption
- **test_connection**: Test OCI connectivity
- **get_dashboard_stats**: Get comprehensive dashboard statistics

### Resources
- **logan://security-overview**: Real-time security metrics
- **logan://log-sources**: Available log sources
- **logan://fields**: Field discovery data
- **logan://storage-usage**: Storage consumption metrics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   MCP Server    │    │   OCI Logging   │
│                 │    │                 │    │   Analytics     │
│  ┌───────────┐  │    │  ┌───────────┐  │    │                 │
│  │    API    │◄─┼────┤  │   Tools   │  │    │  ┌───────────┐  │
│  │  Routes   │  │    │  │           │  │    │  │   Query   │  │
│  └───────────┘  │    │  │  Security │◄─┼────┤  │  Engine   │  │
│                 │    │  │ Analyzer  │  │    │  └───────────┘  │
│  ┌───────────┐  │    │  │           │  │    │                 │
│  │    UI     │  │    │  │  Logan    │  │    │  ┌───────────┐  │
│  │Components │  │    │  │  Client   │  │    │  │   Data    │  │
│  └───────────┘  │    │  └───────────┘  │    │  │  Sources  │  │
└─────────────────┘    └─────────────────┘    │  └───────────┘  │
                                              └─────────────────┘
```

## Installation

### Prerequisites
- Python 3.8+
- OCI CLI configured (`~/.oci/config`)
- Environment variables set

### Setup
1. Install dependencies:
```bash
cd mcp-server
pip install -r requirements.txt
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your OCI configuration
```

3. Test the installation:
```bash
python test_mcp_server.py
```

## Configuration

### Environment Variables

#### Required
- `LOGAN_REGION`: OCI region (e.g., 'eu-frankfurt-1')
- `LOGAN_COMPARTMENT_ID`: OCI compartment OCID

#### Optional
- `LOGAN_NAMESPACE`: OCI namespace (auto-detected if not set)
- `MAX_CONNECTIONS`: Maximum concurrent connections (default: 10)
- `REQUEST_TIMEOUT`: Request timeout in seconds (default: 30)
- `DEFAULT_TIME_PERIOD_MINUTES`: Default query time period (default: 1440)
- `MAX_QUERY_RESULTS`: Maximum query results (default: 1000)
- `LOG_LEVEL`: Logging level (default: INFO)
- `ENABLE_QUERY_VALIDATION`: Enable query validation (default: true)
- `ENABLE_CACHING`: Enable response caching (default: true)

### OCI Configuration
Ensure your OCI CLI is configured:
```bash
oci setup config
```

Or manually create `~/.oci/config`:
```ini
[DEFAULT]
user=ocid1.user.oc1..your-user-id
fingerprint=your-fingerprint
key_file=~/.oci/oci_api_key.pem
tenancy=ocid1.tenancy.oc1..your-tenancy-id
region=eu-frankfurt-1
```

## Usage

### Starting the Server
```bash
# Using the startup script (recommended)
python start_mcp_server.py

# Or directly
python mcp_server.py
```

### Using the Client Library

#### Async Client
```python
from mcp_client import LoganMCPClient

async def example():
    client = LoganMCPClient()
    
    # Test connection
    response = await client.test_connection()
    print(f"Connection: {'OK' if response.success else 'Failed'}")
    
    # Execute query
    response = await client.execute_query(
        query="* | head 10",
        time_period_minutes=60
    )
    
    if response.success:
        print(f"Results: {len(response.data.get('results', []))}")
    
    # Get security events
    response = await client.get_security_events(
        event_type="failed_logins",
        time_period_minutes=240
    )
```

#### Sync Client
```python
from mcp_client import SyncLogamMCPClient

client = SyncLogamMCPClient()

# Test connection
response = client.test_connection()
print(f"Connection: {'OK' if response.success else 'Failed'}")

# Execute query
response = client.execute_query("* | head 10", time_period_minutes=60)
print(f"Query success: {response.success}")
```

### Integration with Next.js

Update your API routes to use the MCP client:

```typescript
// app/api/mcp/query/route.ts
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: Request) {
  try {
    const { query, timePeriod } = await request.json();
    
    // Call MCP server via Python client
    const { stdout } = await execFileAsync('python3', [
      'mcp-server/client_wrapper.py',
      'execute_query',
      '--query', query,
      '--time-period', timePeriod.toString()
    ]);
    
    const result = JSON.parse(stdout);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

## API Reference

### Tools

#### execute_query
Execute a custom OCI Logging Analytics query.

**Parameters:**
- `query` (string, required): OCI Logging Analytics query
- `time_period_minutes` (integer, optional): Time period in minutes (default: 1440)
- `max_count` (integer, optional): Maximum results (default: 100)
- `bypass_validation` (boolean, optional): Skip validation (default: false)

#### validate_query
Validate query syntax and suggest fixes.

**Parameters:**
- `query` (string, required): Query to validate

#### get_security_events
Get security events with filtering.

**Parameters:**
- `event_type` (string, optional): Event type filter
- `severity` (string, optional): Severity filter (low, medium, high, critical)
- `time_period_minutes` (integer, optional): Time period (default: 1440)

#### get_log_sources
Get log sources with activity information.

**Parameters:**
- `time_period_minutes` (integer, optional): Time period (default: 1440)
- `active_only` (boolean, optional): Show only active sources (default: false)

#### discover_fields
Discover available fields for query building.

**Parameters:**
- `field_type` (string, optional): Filter by field type
- `is_system` (boolean, optional): Filter system vs custom fields
- `used_sources_only` (boolean, optional): Only from active sources (default: false)
- `time_period_minutes` (integer, optional): Time period (default: 1440)

## Testing

Run the test suite:
```bash
python test_mcp_server.py
```

Individual tests:
```bash
# Test connection only
python -c "import asyncio; from test_mcp_server import test_connection; asyncio.run(test_connection())"

# Test specific functionality
python -c "import asyncio; from test_mcp_server import test_simple_query; asyncio.run(test_simple_query())"
```

## Monitoring

### Logs
- Server logs: `mcp_server.log`
- Error logs: stderr output
- Debug mode: Set `LOGAN_DEBUG=true`

### Health Checks
```python
from mcp_client import LoganMCPClient

async def health_check():
    client = LoganMCPClient()
    response = await client.test_connection()
    return response.success
```

## Security Considerations

- **Query Validation**: All queries are validated by default
- **Input Sanitization**: Arguments are sanitized before execution
- **Error Handling**: Detailed errors are logged but not exposed to clients
- **Resource Limits**: Configurable limits on query results and execution time
- **Authentication**: Uses OCI CLI configuration for authentication

## Troubleshooting

### Common Issues

1. **"LOGAN_COMPARTMENT_ID is required"**
   - Set the environment variable in your `.env` file
   - Verify the OCID format is correct

2. **"Failed to initialize OCI clients"**
   - Check OCI CLI configuration: `oci setup config`
   - Verify network connectivity to OCI
   - Check IAM permissions

3. **"Query validation failed"**
   - Review OCI Logging Analytics query syntax
   - Check field names use single quotes for spaces
   - Verify time filters use `dateRelative()` function

4. **"Empty response from server"**
   - Check server logs for errors
   - Verify the MCP server is running
   - Check environment variables

### Debug Mode
Enable debug logging:
```bash
export LOGAN_DEBUG=true
python start_mcp_server.py
```

### Performance Tuning
- Adjust `MAX_QUERY_RESULTS` for large datasets
- Enable caching with `ENABLE_CACHING=true`
- Tune `CACHE_TTL_SECONDS` based on data freshness needs
- Set appropriate `QUERY_TIMEOUT_SECONDS` for complex queries

## Contributing

1. Follow Python PEP 8 style guidelines
2. Add tests for new functionality
3. Update documentation for API changes
4. Use type hints for all function parameters and returns

## License

This project is part of the Logan Security Dashboard and follows the same license terms.