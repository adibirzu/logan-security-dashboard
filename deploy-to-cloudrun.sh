#!/bin/bash

# Logan Security Dashboard - Quick Cloud Run Deployment Script
# This script simplifies the deployment process by handling all the steps

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [[ ! -f .env.production ]]; then
    log_error ".env.production file not found!"
    log_info "Creating from template..."
    
    if [[ -f .env.production.example ]]; then
        cp .env.production.example .env.production
        log_warning "Created .env.production from template."
        log_warning "Please edit .env.production with your actual credentials before continuing."
        log_info "Required changes:"
        log_info "  - ORACLE_DB_PASSWORD: Your database password"
        log_info "  - LOGAN_COMPARTMENT_ID: Your OCI compartment ID"
        log_info "  - LOGAN_NAMESPACE: Your OCI namespace"
        log_info ""
        log_info "Generate secure secrets with: ./scripts/generate-secrets.sh production"
        exit 1
    else
        log_error ".env.production.example template not found!"
        exit 1
    fi
fi

# Default values
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
REGION="us-central1"
SERVICE_NAME="logan-dashboard"

# Get project ID if not set
if [[ -z "${PROJECT_ID}" ]]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [[ -z "${PROJECT_ID}" ]]; then
        log_error "Google Cloud Project ID not set!"
        log_info "Set it with: gcloud config set project YOUR_PROJECT_ID"
        log_info "Or set the GOOGLE_CLOUD_PROJECT environment variable"
        exit 1
    fi
fi

log_info "🚀 Starting Logan Security Dashboard deployment to Cloud Run"
log_info "Project: ${PROJECT_ID}"
log_info "Region: ${REGION}"
log_info "Service: ${SERVICE_NAME}"
echo ""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_ID="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project ID       Google Cloud Project ID"
            echo "  --region REGION    GCP region (default: us-central1)"
            echo "  --service NAME     Cloud Run service name (default: logan-dashboard)"
            echo "  --help             Show this help"
            echo ""
            echo "Before running this script:"
            echo "  1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install"
            echo "  2. Authenticate: gcloud auth login"
            echo "  3. Set project: gcloud config set project YOUR_PROJECT_ID"
            echo "  4. Update .env.production with your credentials"
            echo "  5. Generate secrets: ./scripts/generate-secrets.sh production"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Export values for the deployment script
export GOOGLE_CLOUD_PROJECT="${PROJECT_ID}"
export GCP_REGION="${REGION}"
export CLOUD_RUN_SERVICE="${SERVICE_NAME}"

# Check if deployment script exists
if [[ ! -f deploy/deploy-cloudrun.sh ]]; then
    log_error "Deployment script not found: deploy/deploy-cloudrun.sh"
    exit 1
fi

# Make sure the deployment script is executable
chmod +x deploy/deploy-cloudrun.sh

# Run the deployment
log_info "Starting deployment..."
echo "=================================================="
exec ./deploy/deploy-cloudrun.sh \
    --project "${PROJECT_ID}" \
    --region "${REGION}" \
    --service "${SERVICE_NAME}" \
    --env production