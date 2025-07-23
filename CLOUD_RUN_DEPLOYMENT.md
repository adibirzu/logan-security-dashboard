# Logan Security Dashboard - Google Cloud Run Deployment Guide

This guide will walk you through deploying the Logan Security Dashboard to Google Cloud Run.

## Prerequisites

### 1. Required Tools
- **Docker**: Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)
- **Google Cloud CLI**: Install from [cloud.google.com](https://cloud.google.com/sdk/docs/install)
- **Git**: For cloning and managing the repository

### 2. Google Cloud Setup
```bash
# Install Google Cloud CLI (if not already installed)
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate with Google Cloud
gcloud auth login

# Set your project (replace with your actual project ID)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

### 3. Environment Configuration
```bash
# Copy the production environment template
cp .env.production.example .env.production

# Generate secure secrets
./scripts/generate-secrets.sh production

# Edit .env.production with your actual credentials
vim .env.production
```

## Required Environment Variables

Update these values in your `.env.production` file:

### Critical Settings (Must be changed)
```bash
# Oracle Database (REQUIRED)
ORACLE_DB_PASSWORD=your-actual-database-password
ORACLE_DB_CONNECTION_STRING=your-connection-string
ORACLE_DB_HOST=your-database-host
ORACLE_DB_SERVICE=your-service-name

# OCI Logan Configuration (REQUIRED)
LOGAN_COMPARTMENT_ID=ocid1.compartment.oc1..your-compartment-id
LOGAN_NAMESPACE=your-namespace

# Security Keys (Generated automatically by generate-secrets.sh)
ENCRYPTION_KEY=your-32-char-encryption-key
SESSION_SECRET=your-64-char-session-secret
JWT_SECRET=your-48-char-jwt-secret
```

### Optional Settings
```bash
# Neo4j Graph Database (Optional)
NEO4J_PASSWORD=your-neo4j-password

# Redis Cache (Optional but recommended)
REDIS_PASSWORD=your-redis-password

# Email Notifications (Optional)
SMTP_PASSWORD=your-smtp-password
SECURITY_TEAM_EMAIL=security@your-domain.com
```

## Deployment Methods

### Method 1: Automated Deployment (Recommended)

```bash
# Make the deployment script executable
chmod +x deploy/deploy-cloudrun.sh

# Deploy to Google Cloud Run
./deploy/deploy-cloudrun.sh \
  --project YOUR_PROJECT_ID \
  --region us-central1 \
  --service logan-dashboard \
  --env production
```

### Method 2: Manual Deployment

#### Step 1: Create Artifact Registry Repository
```bash
gcloud artifacts repositories create logan-security \
  --repository-format=docker \
  --location=us-central1 \
  --description="Logan Security Dashboard images"
```

#### Step 2: Build and Push Docker Image
```bash
# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -f Dockerfile.cloudrun -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/logan-security/logan-dashboard:latest .

# Push the image
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/logan-security/logan-dashboard:latest
```

#### Step 3: Create Google Cloud Secrets
```bash
# Create secrets for sensitive data
echo -n "your-database-password" | gcloud secrets create oracle-db-password --data-file=-
echo -n "your-encryption-key" | gcloud secrets create encryption-key --data-file=-
echo -n "your-session-secret" | gcloud secrets create session-secret --data-file=-
```

#### Step 4: Deploy to Cloud Run
```bash
gcloud run deploy logan-dashboard \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/logan-security/logan-dashboard:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --concurrency=100 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,LOGAN_REGION=us-ashburn-1,LOGAN_COMPARTMENT_ID=your-compartment-id" \
  --set-secrets="ORACLE_DB_PASSWORD=oracle-db-password:latest,ENCRYPTION_KEY=encryption-key:latest,SESSION_SECRET=session-secret:latest"
```

## Post-Deployment Verification

### 1. Health Check
```bash
# Get the service URL
SERVICE_URL=$(gcloud run services describe logan-dashboard --platform=managed --region=us-central1 --format="value(status.url)")

# Test health endpoint
curl -f "$SERVICE_URL/api/health"
```

### 2. Check Logs
```bash
# View deployment logs
gcloud run services logs tail logan-dashboard --region=us-central1

# View specific log entries
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=logan-dashboard" --limit=50
```

### 3. Test Application
```bash
# Open the application in browser
open $SERVICE_URL

# Test specific endpoints
curl "$SERVICE_URL/api/health"
curl "$SERVICE_URL/api/version"
```

## Configuration Examples

### Environment Variables for Cloud Run
```yaml
NODE_ENV: production
NEXT_TELEMETRY_DISABLED: "1"
LOGAN_REGION: us-ashburn-1
LOGAN_COMPARTMENT_ID: ocid1.compartment.oc1..your-compartment-id
LOGAN_NAMESPACE: your-namespace
TARGET_SCHEMA: LOGAN_USER
ORACLE_DB_USER: ADMIN
LOG_LEVEL: info
CACHE_TTL: "3600"
MAX_QUERY_RESULTS: "10000"
QUERY_TIMEOUT: "30000"
```

### Cloud Run Service Configuration
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: logan-dashboard
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/minScale: "0"
        run.googleapis.com/memory: "2Gi"
        run.googleapis.com/cpu: "2"
        run.googleapis.com/timeout: "300"
    spec:
      containerConcurrency: 100
      containers:
      - image: us-central1-docker.pkg.dev/YOUR_PROJECT_ID/logan-security/logan-dashboard:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "2Gi"
            cpu: "2"
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOGAN_REGION
          value: "us-ashburn-1"
        # Add other environment variables...
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check Dockerfile syntax
docker build --no-cache -f Dockerfile.cloudrun .

# Check for missing dependencies
npm audit
npm install
```

#### 2. Authentication Issues
```bash
# Re-authenticate with Google Cloud
gcloud auth login
gcloud auth application-default login

# Check project access
gcloud projects list
gcloud config get-value project
```

#### 3. Memory Issues
```bash
# Increase memory allocation
gcloud run services update logan-dashboard \
  --region=us-central1 \
  --memory=4Gi \
  --cpu=4
```

#### 4. Database Connection Issues
```bash
# Test Oracle DB connection
gcloud run services logs tail logan-dashboard --region=us-central1 | grep -i oracle

# Verify wallet files are included in the image
docker run --rm -it YOUR_IMAGE_URL ls -la /app/wallet_unzipped/
```

### Monitoring and Logging

#### 1. Enable Detailed Logging
```bash
# Update service with detailed logging
gcloud run services update logan-dashboard \
  --region=us-central1 \
  --set-env-vars="LOG_LEVEL=debug,VERBOSE_LOGGING=true"
```

#### 2. Monitor Performance
```bash
# View metrics in Cloud Console
gcloud run services describe logan-dashboard --region=us-central1

# Set up uptime monitoring
gcloud alpha monitoring uptime-check-configs create \
  --display-name="Logan Dashboard Health Check" \
  --http-check-path="/api/health" \
  --hostname="YOUR_SERVICE_URL"
```

## Security Considerations

### 1. Environment Variables
- Never commit `.env.production` to version control
- Use Google Cloud Secret Manager for sensitive data
- Rotate secrets regularly

### 2. Access Control
```bash
# Remove public access (if needed)
gcloud run services remove-iam-policy-binding logan-dashboard \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"

# Add specific user access
gcloud run services add-iam-policy-binding logan-dashboard \
  --region=us-central1 \
  --member="user:admin@your-domain.com" \
  --role="roles/run.invoker"
```

### 3. Network Security
- Configure VPC connector for private database access
- Enable Cloud Armor for DDoS protection
- Use custom domains with SSL certificates

## Cost Optimization

### 1. Resource Allocation
```bash
# Optimize for cost (smaller instances)
gcloud run services update logan-dashboard \
  --region=us-central1 \
  --memory=1Gi \
  --cpu=1 \
  --max-instances=3 \
  --concurrency=200
```

### 2. Scaling Configuration
```bash
# Set minimum instances to 0 for cost savings
gcloud run services update logan-dashboard \
  --region=us-central1 \
  --min-instances=0 \
  --max-instances=5
```

## Support and Maintenance

### 1. Updates and Rollbacks
```bash
# Deploy new version
./deploy/deploy-cloudrun.sh --tag=v2.0.0

# Rollback if needed
gcloud run services update logan-dashboard \
  --region=us-central1 \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/logan-security/logan-dashboard:v1.0.0
```

### 2. Backup and Recovery
```bash
# Backup configuration
gcloud run services describe logan-dashboard \
  --region=us-central1 \
  --format="export" > logan-dashboard-backup.yaml

# Export secrets (for backup)
gcloud secrets versions access latest --secret="oracle-db-password" > db-password-backup.txt
```

## Additional Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Oracle Cloud Infrastructure Documentation](https://docs.oracle.com/en-us/iaas/)

---

**Need Help?**
- Check the troubleshooting section above
- Review Cloud Run logs: `gcloud run services logs tail logan-dashboard`
- Open an issue in the repository
- Contact the development team