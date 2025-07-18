# OCI Threat Intelligence Integration

This document describes the integration of Oracle Cloud Infrastructure (OCI) Threat Intelligence service with the Logan Security Dashboard.

## Overview

The OCI Threat Intelligence integration allows the Logan Security Dashboard to:

- **Check individual indicators** against OCI's threat intelligence database
- **Batch verify multiple indicators** for efficiency
- **Enhance threat data** with OCI-verified information
- **Display threat attributes** and metadata from OCI
- **Track verification status** of indicators

## Architecture

### Components

1. **Python Client** (`scripts/oci_threat_intel.py`)
   - Direct interface to OCI Threat Intelligence service
   - Handles authentication and API calls
   - Supports CLI usage and programmatic integration

2. **API Endpoint** (`/api/threat-intelligence`)
   - Next.js API route that bridges frontend and Python client
   - Handles request/response formatting
   - Manages temporary file operations for batch requests

3. **UI Components** (`components/ThreatHunting/ThreatIntelligence.tsx`)
   - Enhanced threat intelligence interface
   - Real-time indicator verification
   - OCI data visualization and management

## Features

### 1. Individual Indicator Checking

Check single indicators (IP addresses, domains, hashes, etc.) against OCI threat intelligence:

```javascript
// API Call
POST /api/threat-intelligence
{
  "action": "check",
  "indicator": "185.159.157.131",
  "type": "ip"
}

// Response
{
  "success": true,
  "found": true,
  "indicators": [{
    "id": "ocid1.threatintelligenceindicator...",
    "value": "185.159.157.131",
    "type": "ip",
    "confidence": 85,
    "threat_types": ["malware", "c2"],
    "attributes": [...],
    "time_created": "2024-01-15T10:30:00Z",
    "time_last_seen": "2024-07-18T15:20:00Z"
  }]
}
```

### 2. Batch Verification

Verify multiple indicators efficiently:

```javascript
// API Call
POST /api/threat-intelligence
{
  "action": "batch",
  "indicators": [
    {"value": "185.159.157.131", "type": "ip"},
    {"value": "malicious-domain.com", "type": "domain"},
    {"value": "sha256hash...", "type": "hash"}
  ]
}

// Response
{
  "success": true,
  "total_checked": 3,
  "found_count": 2,
  "indicators": [...]
}
```

### 3. Statistics and Monitoring

Get threat intelligence statistics:

```javascript
// API Call
GET /api/threat-intelligence?action=stats&type=ip

// Response
{
  "success": true,
  "compartment_id": "ocid1.compartment...",
  "total_indicators": 1500,
  "indicator_type": "ip"
}
```

## Setup and Configuration

### Prerequisites

1. **OCI Account** with Threat Intelligence service access
2. **OCI CLI configured** with appropriate credentials
3. **Python dependencies**: `pip install oci`

### Configuration

1. **OCI Configuration** (Required)
   ```bash
   # Standard OCI config file location
   ~/.oci/config
   
   # Example configuration
   [DEFAULT]
   user=ocid1.user.oc1..aaaaaaaa...
   fingerprint=aa:bb:cc:dd:ee:ff...
   key_file=~/.oci/oci_api_key.pem
   tenancy=ocid1.tenancy.oc1..aaaaaaaa...
   region=us-ashburn-1
   ```

2. **Environment Variables** (Optional)
   ```bash
   # Override default compartment
   LOGAN_COMPARTMENT_ID=ocid1.compartment.oc1..aaaaaaaa...
   
   # Override default region
   LOGAN_REGION=eu-frankfurt-1
   ```

### Testing the Integration

1. **Test OCI Connection**
   ```bash
   cd scripts
   python3 oci_threat_intel.py test
   ```

2. **Check Single Indicator**
   ```bash
   python3 oci_threat_intel.py check --indicator "8.8.8.8" --type "ip"
   ```

3. **Batch Check from File**
   ```bash
   echo '[{"value": "1.2.3.4", "type": "ip"}]' > indicators.json
   python3 oci_threat_intel.py batch --file indicators.json
   ```

## UI Integration Features

### Enhanced Threat Intelligence Interface

The UI provides several enhancements for OCI integration:

1. **Connection Status Indicator**
   - Shows OCI connection status (Connected/Error/Unknown)
   - Test connection button

2. **Indicator Verification**
   - Individual "Verify with OCI" buttons for each indicator
   - Batch verification for all unverified indicators
   - Visual verification status badges

3. **OCI Data Display**
   - Threat types from OCI service
   - Detailed attributes and metadata
   - Attribution information
   - OCI-specific timestamps

4. **Add New Indicators**
   - Input form for new indicators
   - Automatic OCI verification upon addition
   - Support for multiple indicator types

### Visual Indicators

- **Green Badge**: "OCI Verified" - Indicator confirmed by OCI
- **Cloud Icon**: Click to verify with OCI
- **Loading Spinner**: Verification in progress
- **Confidence Percentage**: OCI confidence score

## API Reference

### Endpoints

#### POST /api/threat-intelligence

**Check Single Indicator**
```json
{
  "action": "check",
  "indicator": "string",
  "type": "ip|domain|hash|email|url",
  "compartment_id": "string (optional)"
}
```

**Batch Check**
```json
{
  "action": "batch",
  "indicators": [
    {"value": "string", "type": "string"}
  ],
  "compartment_id": "string (optional)"
}
```

**Get Statistics**
```json
{
  "action": "stats",
  "type": "string (optional)",
  "compartment_id": "string (optional)"
}
```

#### GET /api/threat-intelligence

Query parameters:
- `action`: "check", "stats", or "test"
- `indicator`: Indicator value (for check action)
- `type`: Indicator type (optional)
- `compartment_id`: OCI compartment ID (optional)

### Response Format

**Success Response**
```json
{
  "success": true,
  "indicator_value": "string",
  "found": boolean,
  "count": number,
  "indicators": [
    {
      "id": "string",
      "value": "string",
      "type": "string",
      "confidence": number,
      "threat_types": ["string"],
      "attributes": [
        {
          "name": "string",
          "value": "string",
          "attribution": "string"
        }
      ],
      "time_created": "ISO8601",
      "time_updated": "ISO8601",
      "time_last_seen": "ISO8601"
    }
  ]
}
```

**Error Response**
```json
{
  "success": false,
  "error": "string",
  "details": "string"
}
```

## Data Flow

1. **User Action**: User clicks "Verify with OCI" or adds new indicator
2. **Frontend Request**: UI sends request to `/api/threat-intelligence`
3. **API Processing**: Next.js API route validates and processes request
4. **Python Execution**: API spawns Python script with appropriate arguments
5. **OCI API Call**: Python script calls OCI Threat Intelligence service
6. **Response Processing**: Results are formatted and returned to frontend
7. **UI Update**: Interface updates with OCI verification status and data

## Error Handling

### Common Errors

1. **Authentication Errors**
   - Invalid OCI configuration
   - Expired API keys
   - Insufficient permissions

2. **Network Errors**
   - Connection timeouts
   - Service unavailable
   - Rate limiting

3. **Data Errors**
   - Invalid indicator format
   - Unsupported indicator types
   - Missing required fields

### Error Recovery

- **Graceful Degradation**: System continues to work without OCI verification
- **Retry Logic**: Automatic retries for transient failures
- **User Feedback**: Clear error messages and suggested actions
- **Fallback Mode**: Manual indicator management when OCI unavailable

## Security Considerations

1. **Credential Security**
   - OCI credentials stored securely in standard locations
   - No hardcoded credentials in source code
   - Resource Principal authentication recommended for production

2. **Data Privacy**
   - Temporary files cleaned up after batch operations
   - Sensitive data not logged
   - Secure communication with OCI services

3. **Access Control**
   - Proper OCI IAM policies required
   - Compartment-level isolation supported
   - Audit logging of all threat intelligence queries

## Performance Optimization

1. **Batch Processing**: Multiple indicators processed efficiently
2. **Caching**: Verification status cached to avoid redundant calls
3. **Async Operations**: Non-blocking UI during verification
4. **Rate Limiting**: Respects OCI service limits

## Future Enhancements

1. **Threat Data Submission**: Submit threat intelligence back to OCI
2. **Real-time Feeds**: Integration with OCI threat intelligence feeds
3. **Custom Attributes**: Support for custom threat attributes
4. **Advanced Analytics**: Trend analysis and threat correlation
5. **Automated Workflows**: Trigger incident response based on OCI findings

## Troubleshooting

### Common Issues

1. **"OCI SDK not installed"**
   ```bash
   pip install oci
   ```

2. **"Authentication failed"**
   - Check OCI config file
   - Verify API key permissions
   - Ensure correct tenancy/user OCIDs

3. **"No indicators found"**
   - Verify indicator format
   - Check compartment access
   - Confirm threat intelligence service availability

4. **"Python script failed"**
   - Check Python version (3.8+ required)
   - Verify script permissions
   - Review error logs

### Debug Mode

Enable detailed logging:
```bash
export LOGAN_DEBUG=true
python3 oci_threat_intel.py check --indicator "1.2.3.4"
```

## Support

For issues related to:
- **OCI Service**: Contact Oracle Cloud Support
- **Integration**: Check Logan Security Dashboard documentation
- **API Usage**: Review OCI Threat Intelligence API documentation