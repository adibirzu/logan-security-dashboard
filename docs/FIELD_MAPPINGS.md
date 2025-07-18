# Logan Security Dashboard - Field Mappings and Relationships

## Overview

This document outlines the field mappings, time variables, and data relationships used in the Logan Security Dashboard for OCI Logging Analytics queries.

## Field Categories and Mappings

### Core Fields
These are the fundamental fields present in most log sources:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| `Time` | Timestamp | timestamp | Event timestamp in UTC |
| `'Log Source'` | Log Source | string | Source system generating the log |
| `'Event Name'` | Event Name | string | Name of the logged event or action |
| `'Message'` | Message | string | Log message content |

### Identity & Access Fields
Fields related to user identity and authentication:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| `'Principal Name'` | Principal Name | string | User or service principal performing the action |
| `'User Name'` | User Name | string | Username of the person performing the action |
| `'IP Address'` | IP Address | ip | Source IP address |
| `'User Agent'` | User Agent | string | Client user agent string |

### Network & Security Fields
Fields related to network traffic and security:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| `'Source IP'` | Source IP | ip | Source IP address for network flows |
| `'Destination IP'` | Destination IP | ip | Destination IP address for network flows |
| `'Client IP'` | Client IP | ip | Client IP address (often for WAF logs) |
| `'Security Result'` | Security Result | string | Result of security validation (success, failure, denied) |
| `'Action'` | Action | string | Action taken (allow, deny, drop, etc.) |

### Web/HTTP Fields
Fields specific to HTTP traffic and web applications:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| `'HTTP Method'` | HTTP Method | string | HTTP request method |
| `'HTTP Status'` | HTTP Status | number | HTTP response status code |
| `'Request URL'` | Request URL | string | HTTP request URL |
| `'Rule ID'` | Rule ID | string | WAF rule identifier |

### Infrastructure Fields
Fields related to OCI infrastructure:

| Field Name | Display Name | Type | Description |
|------------|--------------|------|-------------|
| `'Compartment Name'` | Compartment Name | string | OCI compartment name |
| `'Availability Domain'` | Availability Domain | string | OCI availability domain |
| `'Resource Name'` | Resource Name | string | OCI resource name |
| `'Instance ID'` | Instance ID | string | OCI instance identifier |

## Log Source Definitions

### OCI Audit Logs
**Time Field**: `Time`  
**Primary Fields**: `'Event Name'`, `'Principal Name'`, `'Compartment Name'`, `'IP Address'`

**Available Fields**:
- Time, 'Log Source', 'Event Name', 'Principal Name', 'User Name'
- 'IP Address', 'User Agent', 'Compartment Name', 'Availability Domain'
- 'Resource Name', 'Instance ID', 'Message'

**Common Query Patterns**:
```sql
-- Recent events
Time > dateRelative(1h) | head 100

-- Create operations
'Event Name' contains 'Create' | head 50

-- Activity by user
'Principal Name' != null | stats count by 'Principal Name' | sort count desc
```

### OCI VCN Flow Logs
**Time Field**: `Time`  
**Primary Fields**: `'Source IP'`, `'Destination IP'`, `'Action'`, `'Protocol'`

**Available Fields**:
- Time, 'Log Source', 'Source IP', 'Destination IP', 'Action'
- 'Protocol', 'Source Port', 'Destination Port', 'Bytes', 'Packets'

**Common Query Patterns**:
```sql
-- Rejected connections
'Action' = 'REJECT' | head 100

-- Top talkers
'Source IP' != null | stats count by 'Source IP' | sort count desc

-- Recent network activity
Time > dateRelative(1h) and 'Action' in ('ACCEPT', 'REJECT') | head 50
```

### OCI WAF Logs
**Time Field**: `Time`  
**Primary Fields**: `'Client IP'`, `'HTTP Method'`, `'HTTP Status'`, `'Action'`

**Available Fields**:
- Time, 'Log Source', 'Client IP', 'HTTP Method', 'HTTP Status'
- 'User Agent', 'Action', 'Request URL', 'Rule ID', 'Country Code'

**Common Query Patterns**:
```sql
-- Blocked requests
'Action' = 'BLOCK' | head 100

-- HTTP errors
'HTTP Status' >= 400 | head 50

-- Top attacking IPs
'Client IP' != null | stats count by 'Client IP' | sort count desc
```

### Windows Security Events
**Time Field**: `Time`  
**Primary Fields**: `'Event Name'`, `'User Name'`, `'IP Address'`, `'Security Result'`

**Available Fields**:
- Time, 'Log Source', 'Event Name', 'User Name', 'IP Address'
- 'Security Result', 'Logon Type', 'Process Name', 'Message'

**Common Query Patterns**:
```sql
-- Failed logins
'Security Result' = 'failed' | head 100

-- Logon events
'Event Name' contains 'Logon' | head 50

-- User activity
'User Name' != null | stats count by 'User Name' | sort count desc
```

## Time Filtering and Variables

### Time Field Relationships
- **Primary Time Field**: `Time` (standardized across all log sources)
- **Alternative Names**: `datetime`, `eventTime`, `timestamp`
- **Format**: ISO 8601 UTC format (2024-01-15T10:30:00Z)

### Time Range Functions
```sql
-- Relative time filtering
Time > dateRelative(1h)    -- Last 1 hour
Time > dateRelative(24h)   -- Last 24 hours
Time > dateRelative(7d)    -- Last 7 days

-- Absolute time filtering
Time > '2024-01-15T00:00:00Z'
Time between '2024-01-15T00:00:00Z' and '2024-01-15T23:59:59Z'
```

### Supported Time Units
- `m` - minutes
- `h` - hours
- `d` - days

## Field Relationships and Correlations

### IP Address Fields
```
'IP Address' ←→ 'Source IP' ←→ 'Client IP'
```
These fields may contain the same IP addresses but represent different contexts:
- `'IP Address'`: General source IP (audit logs)
- `'Source IP'`: Network flow source (VCN flows)
- `'Client IP'`: HTTP client IP (WAF logs)

### User Identity Fields
```
'Principal Name' ←→ 'User Name'
```
- `'Principal Name'`: OCI-specific user/service principal
- `'User Name'`: Generic username field

### Action/Result Fields
```
'Action' ←→ 'Security Result'
```
- `'Action'`: Network/firewall actions (allow, deny, drop)
- `'Security Result'`: Authentication results (success, failed)

## Query Validation Rules

### Syntax Rules
1. **Field Names**: Fields with spaces must be quoted (`'Log Source'`, not `Log Source`)
2. **Time Filters**: Always include time filters for performance (`Time > dateRelative(1h)`)
3. **Result Limits**: Include limits to prevent large result sets (`| head 100`)

### Performance Guidelines
1. **Index Usage**: Use indexed fields for filtering (see field definitions)
2. **Time Range**: Limit time ranges to necessary periods
3. **Aggregations**: Use aggregatable fields for statistics

### Common Operators
```sql
-- String operations
'Field' = 'value'              -- Exact match
'Field' != 'value'             -- Not equal
'Field' contains 'substring'   -- Contains text
'Field' in ('val1', 'val2')   -- In list

-- Numeric operations
'Status' > 400                 -- Greater than
'Status' < 300                 -- Less than
'Status' between 200 and 299   -- Range

-- Aggregation operations
| stats count by 'Field'       -- Count by field
| stats sum('Bytes') by 'IP'   -- Sum by field
| top 10 'Field'               -- Top N values
```

## Example Correlation Queries

### Security Incident Investigation
```sql
-- Correlate failed logins with source IPs
'Security Result' = 'failed' and Time > dateRelative(24h)
| stats count by 'IP Address', 'User Name'
| where count > 5
| sort count desc
```

### Network Traffic Analysis
```sql
-- Correlate blocked network traffic with source IPs
'Action' = 'REJECT' and Time > dateRelative(1h)
| stats count, sum('Bytes') by 'Source IP'
| sort count desc
| head 20
```

### Web Attack Detection
```sql
-- Correlate WAF blocks with client IPs and countries
'Action' = 'BLOCK' and Time > dateRelative(24h)
| stats count by 'Client IP', 'Country Code', 'Rule ID'
| where count > 10
| sort count desc
```

## Best Practices

1. **Always filter by time** to improve performance
2. **Use specific log sources** when possible
3. **Combine related fields** for better correlation
4. **Limit result sets** to manageable sizes
5. **Validate field names** before executing queries
6. **Use aggregations** for trending and analysis
7. **Consider field relationships** when building complex queries

This field mapping system ensures consistent and efficient querying across all OCI Logging Analytics log sources while maintaining proper relationships between time variables and report data.