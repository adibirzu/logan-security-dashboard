# Logan Security Dashboard - n8n Incident Response Workflows

This directory contains n8n workflow templates for automated incident response integrated with the Logan Security Dashboard.

## Overview

The Logan Security Dashboard includes comprehensive incident response capabilities powered by n8n workflow automation. These workflows provide:

- **Automated Detection Response**: Immediate response to security alerts
- **Incident Management**: Streamlined incident creation and tracking
- **Multi-Channel Notifications**: Slack, PagerDuty, email integration
- **Evidence Collection**: Automated forensic evidence preservation
- **Compliance Support**: Regulatory notification assistance
- **Escalation Procedures**: Automatic escalation based on severity

## Quick Start

### 1. Install n8n

```bash
# Using npm
npm install n8n -g

# Using Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n

# Using Docker Compose (recommended for production)
curl -o docker-compose.yml https://raw.githubusercontent.com/n8n-io/n8n/master/docker/compose/withPostgres/docker-compose.yml
docker-compose up -d
```

### 2. Configure n8n

1. Access n8n at `http://localhost:5678`
2. Create your admin account
3. Configure webhook settings:
   - Base URL: `http://your-domain.com:5678`
   - Webhook URL: `http://your-domain.com:5678/webhook`

### 3. Import Workflows

1. In n8n interface, click **"Templates"** → **"Import from file"**
2. Import the following workflows:
   - `incident-response-malware.json` - Malware detection response
   - `incident-response-data-breach.json` - Data breach response
   - Additional workflows as needed

### 4. Configure Credentials

Set up the following credentials in n8n:

#### Required Integrations

**Slack Integration:**
- Credential Type: `Slack API`
- OAuth Token: `xoxb-your-bot-token`
- Channels: `#soc-alerts`, `#security-team`, `#legal-team`

**PagerDuty Integration:**
- Credential Type: `HTTP Header Auth`
- Header Name: `Authorization`
- Header Value: `Token token=your-pagerduty-api-key`

**Ticketing System (Jira/ServiceNow):**
- Credential Type: `HTTP Basic Auth`
- Username: Your ticketing system username
- Password: Your ticketing system API token

**Logan Dashboard API:**
- Credential Type: `HTTP Header Auth`
- Header Name: `Authorization`
- Header Value: `Bearer your-logan-api-key`

**Security Tools APIs:**
- EDR/XDR Platform API keys
- Firewall management API
- DLP system API
- Forensics platform API
- Threat intelligence APIs

### 5. Configure Webhooks

Configure webhook URLs in Logan Dashboard:

```bash
# Environment variables for Logan Dashboard
N8N_WEBHOOK_URL=http://your-n8n-instance:5678/webhook
N8N_API_KEY=your-n8n-api-key

# Webhook endpoints
MALWARE_RESPONSE_WEBHOOK=http://your-n8n-instance:5678/webhook/logan-malware-response
DATA_BREACH_RESPONSE_WEBHOOK=http://your-n8n-instance:5678/webhook/logan-data-breach-response
```

## Workflow Details

### 1. Malware Incident Response (`incident-response-malware.json`)

**Trigger:** Malware detection from EDR/XDR systems

**Automated Actions:**
- **Critical Severity**: Immediate host isolation
- **All Severities**: 
  - Create incident ticket
  - Notify SOC team via Slack
  - Collect threat intelligence
  - Preserve forensic evidence
  - Update Logan dashboard

**Escalation:**
- High-threat malware triggers PagerDuty alert
- Automatic evidence collection
- Timeline documentation

### 2. Data Breach Response (`incident-response-data-breach.json`)

**Trigger:** Data exfiltration detected by DLP systems

**Automated Actions:**
- **Immediate Containment**: Block external communication
- **Emergency Response**: Page security manager
- **Team Assembly**: Create incident war room, invite response team
- **Legal Notification**: Alert legal team for regulatory requirements
- **Evidence Preservation**: Comprehensive digital forensics
- **Compliance Support**: Track regulatory deadlines

**Compliance Features:**
- GDPR 72-hour notification tracking
- Data classification analysis
- Chain of custody maintenance
- Regulatory body identification

## Customization

### Adding New Workflows

1. **Create Workflow**: Design your workflow in n8n interface
2. **Export Template**: Export as JSON from n8n
3. **Add to Repository**: Save to this directory
4. **Update Documentation**: Add details to this README

### Modifying Existing Workflows

1. **Import Workflow**: Load existing workflow in n8n
2. **Make Changes**: Modify nodes, connections, or logic
3. **Test Thoroughly**: Validate all paths and error handling
4. **Export Updated**: Export and replace in repository
5. **Version Control**: Document changes in git

### Environment-Specific Configuration

Create environment-specific credential sets:

```bash
# Development Environment
N8N_ENV=development
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/DEV/...
PAGERDUTY_SERVICE_ID=dev-service-id

# Production Environment
N8N_ENV=production
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/PROD/...
PAGERDUTY_SERVICE_ID=prod-service-id
```

## Security Considerations

### Credential Management
- **Never commit credentials** to version control
- Use **environment variables** for sensitive data
- Implement **credential rotation** policies
- Enable **audit logging** for credential access

### Network Security
- **Firewall Rules**: Restrict n8n access to authorized networks
- **TLS Encryption**: Use HTTPS for all webhook endpoints
- **API Authentication**: Secure all API integrations
- **VPN Access**: Consider VPN for production deployments

### Data Protection
- **Data Minimization**: Only collect necessary incident data
- **Encryption**: Encrypt sensitive data in transit and at rest
- **Retention Policies**: Implement data retention schedules
- **Access Controls**: Limit workflow access to authorized personnel

## Monitoring and Maintenance

### Health Monitoring

```bash
# Check n8n health
curl http://localhost:5678/healthz

# Monitor workflow executions
curl -H "Authorization: Bearer $N8N_API_KEY" \
     http://localhost:5678/rest/executions

# Check webhook status
curl http://localhost:5678/webhook/test
```

### Performance Optimization

- **Execution History**: Regularly clean old execution data
- **Resource Monitoring**: Monitor CPU, memory, and disk usage
- **Workflow Optimization**: Review and optimize slow workflows
- **Database Maintenance**: Regular database cleanup and optimization

### Backup and Recovery

```bash
# Backup n8n data
docker exec n8n-db pg_dump -U n8n n8n > n8n-backup.sql

# Export all workflows
curl -H "Authorization: Bearer $N8N_API_KEY" \
     http://localhost:5678/rest/workflows > workflows-backup.json

# Backup credentials (encrypted)
docker exec n8n-app n8n export:credentials --output=credentials-backup.json
```

## Troubleshooting

### Common Issues

1. **Webhook Not Triggering**
   - Check webhook URL configuration
   - Verify network connectivity
   - Review n8n logs: `docker logs n8n-app`

2. **Authentication Failures**
   - Verify credential configuration
   - Check API key validity
   - Review authentication headers

3. **Workflow Errors**
   - Check execution history in n8n interface
   - Review error logs and stack traces
   - Verify external service availability

### Debug Mode

Enable debug logging:

```bash
# Environment variable
N8N_LOG_LEVEL=debug

# Docker command
docker run -e N8N_LOG_LEVEL=debug n8nio/n8n
```

### Support Resources

- **n8n Documentation**: https://docs.n8n.io/
- **Community Forum**: https://community.n8n.io/
- **Logan Dashboard Issues**: https://github.com/your-org/logan-security-dashboard/issues

## Integration Examples

### Logan Dashboard API Integration

```javascript
// Trigger workflow from Logan Dashboard
const triggerWorkflow = async (workflowId, incidentData) => {
  const response = await fetch('/api/n8n/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId,
      incidentId: incidentData.id,
      data: incidentData,
      priority: incidentData.severity
    })
  })
  return response.json()
}

// Handle webhook from n8n
app.post('/api/n8n/webhook', (req, res) => {
  const { workflowId, status, data } = req.body
  
  // Update incident based on workflow status
  updateIncident(data.incidentId, {
    status: status === 'success' ? 'contained' : 'investigating',
    timeline: [{
      timestamp: new Date(),
      type: 'response',
      description: `Workflow ${workflowId} ${status}`,
      automated: true
    }]
  })
  
  res.json({ success: true })
})
```

### Custom Security Tool Integration

```json
{
  "name": "Custom EDR Integration",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "{{ $json.edr_api_url }}/isolate",
    "method": "POST",
    "bodyParametersJson": "={\"host_id\": \"{{ $json.host_id }}\", \"action\": \"isolate\"}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth"
  }
}
```

## License

These n8n workflows are provided under the same license as the Logan Security Dashboard project.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add/modify workflows
4. Test thoroughly
5. Update documentation
6. Submit pull request

For questions or support, please open an issue in the main repository.