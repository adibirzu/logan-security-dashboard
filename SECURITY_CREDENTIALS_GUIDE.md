# Logan Security Dashboard - Credentials & Security Guide

## 🔒 Security Overview

This document provides comprehensive guidance on securely managing credentials and secrets for the Logan Security Dashboard. **All hardcoded credentials have been removed from the codebase** and replaced with environment variables.

## ⚠️ IMPORTANT SECURITY NOTICE

**NO HARDCODED CREDENTIALS**: This codebase contains NO hardcoded passwords, API keys, or other sensitive information. All credentials must be provided through environment variables or secure secret management systems.

## 🔧 Quick Setup

### 1. Generate Secure Secrets

Use the provided script to generate cryptographically secure secrets:

```bash
# Generate secrets for all environments
./scripts/generate-secrets.sh all

# Generate for specific environment
./scripts/generate-secrets.sh production

# Generate Kubernetes secrets
./scripts/generate-secrets.sh kubernetes
```

### 2. Environment Configuration

Copy the appropriate template and configure it:

```bash
# For development
cp .env.example .env.local

# For production
cp .env.production.example .env.production
```

### 3. Set Required Credentials

**Minimum required environment variables:**

```bash
# Oracle Cloud Infrastructure
NEXT_PUBLIC_LOGAN_REGION=us-ashburn-1
NEXT_PUBLIC_LOGAN_COMPARTMENT_ID=ocid1.compartment.oc1..your-actual-id
LOGAN_COMPARTMENT_ID=ocid1.compartment.oc1..your-actual-id
LOGAN_NAMESPACE=your-actual-namespace

# Database (REQUIRED)
ORACLE_DB_USER=your-actual-username
ORACLE_DB_PASSWORD=your-actual-password
ORACLE_DB_CONNECTION_STRING=your-actual-connection-string

# Security (REQUIRED - Use generated values)
ENCRYPTION_KEY=your-32-character-encryption-key
SESSION_SECRET=your-64-character-session-secret
JWT_SECRET=your-48-character-jwt-secret

# Redis (REQUIRED if using Redis)
REDIS_PASSWORD=your-secure-redis-password

# Email (REQUIRED for notifications)
SECURITY_TEAM_EMAIL=security-team@your-domain.com
SECURITY_CONTACT_EMAIL=security@your-domain.com
```

## 🛡️ Security Requirements

### Secret Generation Requirements

| Secret Type | Minimum Length | Character Set | Rotation Frequency |
|-------------|----------------|---------------|-------------------|
| Encryption Key | 32 characters | Alphanumeric + symbols | Every 90 days |
| Session Secret | 64 characters | Alphanumeric + symbols | Every 30 days |
| JWT Secret | 48 characters | Alphanumeric + symbols | Every 60 days |
| Database Password | 16 characters | Complex | Every 180 days |
| API Keys | UUID format | UUID v4 | On compromise |

### Environment-Specific Security

#### Development Environment
- Use separate credentials from production
- Enable debug logging if needed
- Use self-signed SSL certificates (acceptable)
- Redis password still required

#### Production Environment
- **NEVER** use development credentials
- All secrets must be cryptographically secure
- Use proper SSL/TLS certificates
- Enable security headers
- Implement proper backup encryption

## 📋 Credential Categories

### 1. Application Core Credentials

```bash
# Required for application functionality
ENCRYPTION_KEY=                 # 32-char encryption key
SESSION_SECRET=                 # 64-char session secret  
JWT_SECRET=                     # 48-char JWT signing key
```

### 2. Database Credentials

```bash
# Oracle Database connection
ORACLE_DB_USER=                 # Database username
ORACLE_DB_PASSWORD=             # Database password
ORACLE_DB_CONNECTION_STRING=    # Full connection string
ORACLE_DB_HOST=                 # Database host
ORACLE_DB_PORT=1521            # Database port
TARGET_SCHEMA=                  # Schema name
```

### 3. Oracle Cloud Infrastructure

```bash
# OCI Configuration
LOGAN_REGION=                   # OCI region
LOGAN_COMPARTMENT_ID=           # Compartment OCID
LOGAN_NAMESPACE=                # Logging Analytics namespace
```

### 4. External Service Integration

```bash
# Redis
REDIS_PASSWORD=                 # Redis authentication

# Email Services
SMTP_PASSWORD=                  # SMTP password
SECURITY_TEAM_EMAIL=            # Security team notifications
SECURITY_CONTACT_EMAIL=         # Security contact

# N8N Workflows (Optional)
N8N_API_KEY=                    # N8N API key

# RITA Integration (Optional)
RITA_API_KEY=                   # RITA API key

# Ludus Cloud (Optional)
LUDUS_API_KEY=                  # Ludus API key
LUDUS_WEBHOOK_SECRET=           # Webhook verification
```

### 5. Cloud Provider Credentials

```bash
# AWS
AWS_ACCESS_KEY_ID=              # AWS access key
AWS_SECRET_ACCESS_KEY=          # AWS secret key

# Azure
AZURE_CLIENT_SECRET=            # Azure client secret

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS= # Path to service account JSON
```

## 🚀 Deployment-Specific Configuration

### Docker Deployment

1. **Create Environment File**:
```bash
cp .env.production.example .env.production
./scripts/generate-secrets.sh production
```

2. **Update .env.production** with your actual values:
```bash
# Copy generated secrets from .env.production.secrets
cat .env.production.secrets >> .env.production
```

3. **Deploy**:
```bash
./deploy/docker-deploy.sh --env production
```

### Kubernetes Deployment

1. **Generate Kubernetes Secrets**:
```bash
./scripts/generate-secrets.sh kubernetes
```

2. **Update Secret Values**:
```bash
# Edit k8s-secrets.yaml with your actual base64-encoded values
# Generate base64: echo -n "your-secret" | base64
vim k8s-secrets.yaml
```

3. **Apply Secrets**:
```bash
kubectl apply -f k8s-secrets.yaml
```

4. **Deploy Application**:
```bash
kubectl apply -f deploy/kubernetes.yml
```

### Helm Deployment

1. **Create Values Override**:
```bash
cat > values-production.yaml << EOF
oracle:
  user: "your-db-user"
  password: "your-db-password"
  connectionString: "your-connection-string"

security:
  encryptionKey: "your-32-char-key"
  sessionSecret: "your-64-char-secret"

redis:
  auth:
    password: "your-redis-password"

logan:
  compartmentId: "your-compartment-id"
EOF
```

2. **Deploy with Helm**:
```bash
helm install logan-dashboard deploy/helm/ -f values-production.yaml
```

## 🔐 Secret Management Best Practices

### 1. Secret Storage

#### Recommended Tools:
- **HashiCorp Vault** (Enterprise)
- **AWS Secrets Manager** (AWS)
- **Azure Key Vault** (Azure)
- **Google Secret Manager** (GCP)
- **Oracle Vault** (OCI)
- **Kubernetes Secrets** (K8s)

#### Basic File Storage:
```bash
# Set restrictive permissions
chmod 600 .env.production
chown app:app .env.production

# Encrypt sensitive files
gpg --cipher-algo AES256 --compress-algo 1 \
    --symmetric --output .env.production.gpg .env.production
```

### 2. Secret Rotation

#### Automated Rotation Script:
```bash
#!/bin/bash
# rotate-secrets.sh - Automated secret rotation

OLD_ENV_FILE=".env.production"
NEW_ENV_FILE=".env.production.new"

# Generate new secrets
./scripts/generate-secrets.sh production

# Update with new secrets while preserving other values
# [Implementation depends on your deployment method]

# Test with new secrets
./scripts/test-deployment.sh --env production --file ${NEW_ENV_FILE}

# If test passes, rotate secrets
mv ${NEW_ENV_FILE} ${OLD_ENV_FILE}
```

### 3. Access Control

#### Role-Based Access:
- **Developers**: Development environment secrets only
- **DevOps**: All environments, no direct access to production secrets
- **Security Team**: Full access to all secrets and rotation capabilities
- **Operators**: Read-only access to non-sensitive configuration

#### Audit Requirements:
- Log all secret access
- Monitor for unauthorized access attempts
- Implement break-glass procedures
- Regular access reviews

## 🚨 Security Incidents

### Credential Compromise Response

1. **Immediate Actions**:
```bash
# Disable compromised credentials immediately
kubectl patch secret logan-secrets -p='{"data":{"COMPROMISED_KEY":""}}'

# Generate new credentials
./scripts/generate-secrets.sh production

# Update and redeploy
kubectl apply -f k8s-secrets-new.yaml
kubectl rollout restart deployment/logan-dashboard
```

2. **Investigation**:
- Review access logs
- Identify compromise scope
- Document incident timeline
- Implement additional controls

3. **Recovery**:
- Rotate all potentially affected secrets
- Update monitoring rules
- Conduct security review
- Update incident response procedures

## 📊 Monitoring & Alerting

### Security Monitoring

```bash
# Monitor for failed authentication attempts
# Alert on multiple failed database connections
# Track API key usage patterns
# Monitor for credential scanning attempts
```

### Health Checks

The application includes credential validation in health checks:

```bash
curl http://localhost:3000/api/health
```

Expected response includes database connectivity and credential validation status.

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Failures
```bash
# Check credentials
echo "ORACLE_DB_USER: ${ORACLE_DB_USER}"
echo "ORACLE_DB_CONNECTION_STRING: ${ORACLE_DB_CONNECTION_STRING}"

# Test connection
./scripts/test-oracle-connection.js
```

#### 2. Redis Authentication Failures
```bash
# Verify Redis password
redis-cli -a "${REDIS_PASSWORD}" ping
```

#### 3. Missing Environment Variables
```bash
# Check for required variables
./scripts/validate-environment.sh
```

### Validation Script

```bash
#!/bin/bash
# validate-environment.sh - Check for required environment variables

REQUIRED_VARS=(
    "ORACLE_DB_USER"
    "ORACLE_DB_PASSWORD"
    "ENCRYPTION_KEY"
    "SESSION_SECRET"
    "LOGAN_COMPARTMENT_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "ERROR: Required environment variable $var is not set"
        exit 1
    fi
done

echo "All required environment variables are set"
```

## 📝 Compliance & Auditing

### Compliance Requirements

- **SOC 2**: Encrypt secrets at rest and in transit
- **ISO 27001**: Implement access controls and monitoring
- **PCI DSS**: Secure key management practices
- **GDPR**: Data protection and breach notification

### Audit Trail

All credential operations should be logged:
- Secret generation timestamps
- Access patterns and frequency
- Rotation events
- Failed authentication attempts
- Configuration changes

## 🔄 Migration from Hardcoded Credentials

If migrating from a version with hardcoded credentials:

1. **Identify all hardcoded values**
2. **Generate secure replacements**
3. **Update configuration files**
4. **Test thoroughly**
5. **Deploy with zero downtime**
6. **Verify functionality**
7. **Document changes**

## 📞 Support & Contact

For security-related issues:
- **Security Team**: security-team@your-domain.com
- **Emergency**: Follow your organization's incident response procedures
- **General Support**: Check logs and health endpoints first

---

**Remember**: Security is everyone's responsibility. Always follow the principle of least privilege and never commit secrets to version control.