# Logan Security Dashboard - Quick Deployment Guide

Deploy the Logan Security Dashboard to Google Cloud Run in just a few steps!

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Google Cloud CLI
curl https://sdk.cloud.google.com | bash

# Authenticate
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Configure Environment
```bash
# Generate secure secrets
./scripts/generate-secrets.sh production

# Edit the production environment file
vim .env.production
```

**Required changes in `.env.production`:**
- `ORACLE_DB_PASSWORD`: Your Autonomous Database password
- `LOGAN_COMPARTMENT_ID`: Your OCI compartment OCID
- `LOGAN_NAMESPACE`: Your OCI Logging Analytics namespace

### 3. Deploy to Cloud Run
```bash
# One-command deployment
./deploy-to-cloudrun.sh
```

That's it! The script will:
- ✅ Build the Docker image
- ✅ Push to Google Artifact Registry
- ✅ Create Google Cloud Secrets
- ✅ Deploy to Cloud Run
- ✅ Test the deployment

## 📋 What You Get

After deployment, you'll have:

- **Secure Application**: All credentials stored in Google Cloud Secret Manager
- **Auto-scaling**: Scales from 0 to 10 instances based on traffic
- **Health Monitoring**: Built-in health checks and logging
- **Production Ready**: Optimized Docker image with security best practices

## 🔧 Configuration

### Environment Variables Used
The deployment uses your `.env.production` file to configure:

- **Database**: Oracle Autonomous Database connection
- **Security**: Encryption keys and session management
- **Features**: Enable/disable application features
- **Performance**: Memory, CPU, and caching settings
- **Logging**: Debug levels and output formats

### Secrets Management
Sensitive data is automatically stored in Google Cloud Secret Manager:

- `oracle_db_password` - Database password
- `encryption_key` - Application encryption key
- `session_secret` - Session management secret
- `jwt_secret` - JWT token secret
- `redis_password` - Redis cache password

## 🔍 Monitoring

### Health Check
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe logan-dashboard --platform=managed --region=us-central1 --format="value(status.url)")

# Test health endpoint
curl $SERVICE_URL/api/health
```

### View Logs
```bash
# Real-time logs
gcloud run services logs tail logan-dashboard --region=us-central1

# Specific timeframe
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=logan-dashboard" --limit=100
```

## ⚙️ Advanced Options

### Custom Configuration
```bash
# Deploy to different region
./deploy-to-cloudrun.sh --region=europe-west1

# Use custom service name
./deploy-to-cloudrun.sh --service=my-logan-dashboard

# Specify project explicitly
./deploy-to-cloudrun.sh --project=my-gcp-project
```

### Manual Deployment
For more control, use the detailed deployment script:
```bash
./deploy/deploy-cloudrun.sh --project=YOUR_PROJECT --region=us-central1 --env=production
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Authentication Error
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Missing Environment File
```bash
cp .env.production.example .env.production
./scripts/generate-secrets.sh production
# Edit .env.production with your values
```

#### 3. Build Failures
```bash
# Check Docker is running
docker --version
docker info

# Clear build cache
docker system prune -f
```

#### 4. Deployment Fails
```bash
# Check enabled APIs
gcloud services list --enabled

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
```

### Getting Help
- Check the deployment logs: `gcloud run services logs tail logan-dashboard`
- View the detailed guide: [CLOUD_RUN_DEPLOYMENT.md](./CLOUD_RUN_DEPLOYMENT.md)
- Open an issue in the repository

## 🔒 Security Notes

- All secrets are stored in Google Cloud Secret Manager
- The application runs with minimal privileges
- HTTPS is enforced by default
- Environment files are never included in the Docker image
- Regular security updates are applied to the base image

## 🎯 Next Steps

After successful deployment:

1. **Configure Domain**: Set up a custom domain for your service
2. **Set up Monitoring**: Enable Cloud Monitoring and alerting
3. **Backup Strategy**: Configure automated backups
4. **Access Control**: Set up IAM policies for your team
5. **CI/CD Pipeline**: Automate deployments with Cloud Build

---

**Need more details?** Check the complete deployment guide: [CLOUD_RUN_DEPLOYMENT.md](./CLOUD_RUN_DEPLOYMENT.md)