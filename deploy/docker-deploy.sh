#!/bin/bash

# Logan Security Dashboard - Docker Deployment Script
# Supports deployment to any cloud provider

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
REGISTRY="${DOCKER_REGISTRY:-logan-security}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

# Functions
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

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    log_success "System requirements satisfied"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Required environment variables
    local required_vars=(
        "ORACLE_DB_USER"
        "ORACLE_DB_PASSWORD"
        "ENCRYPTION_KEY"
        "SESSION_SECRET"
        "LOGAN_COMPARTMENT_ID"
    )
    
    # Source environment file
    if [[ -f .env.${DEPLOYMENT_ENV} ]]; then
        source .env.${DEPLOYMENT_ENV}
    else
        log_error ".env.${DEPLOYMENT_ENV} file not found"
        return 1
    fi
    
    local missing_vars=()
    
    # Check for required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]] || [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"example"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    # Check encryption key length
    if [[ -n "${ENCRYPTION_KEY}" ]] && [[ ${#ENCRYPTION_KEY} -lt 32 ]]; then
        log_error "ENCRYPTION_KEY must be at least 32 characters long"
        return 1
    fi
    
    # Check session secret length
    if [[ -n "${SESSION_SECRET}" ]] && [[ ${#SESSION_SECRET} -lt 32 ]]; then
        log_error "SESSION_SECRET must be at least 32 characters long"
        return 1
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing or placeholder values for required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error ""
        log_error "Please update .env.${DEPLOYMENT_ENV} with actual values."
        log_error "Use './scripts/generate-secrets.sh ${DEPLOYMENT_ENV}' to generate secure secrets."
        return 1
    fi
    
    log_success "Environment validation passed"
}

setup_environment() {
    log_info "Setting up environment..."
    
    cd "${PROJECT_DIR}"
    
    # Create .env file if it doesn't exist
    if [[ ! -f .env.${DEPLOYMENT_ENV} ]]; then
        if [[ -f .env.${DEPLOYMENT_ENV}.example ]]; then
            cp .env.${DEPLOYMENT_ENV}.example .env.${DEPLOYMENT_ENV}
            log_warning "Created .env.${DEPLOYMENT_ENV} from example."
            log_warning "Please run './scripts/generate-secrets.sh ${DEPLOYMENT_ENV}' to generate secure secrets."
            log_warning "Then update .env.${DEPLOYMENT_ENV} with your actual credentials."
            exit 1
        else
            log_error ".env.${DEPLOYMENT_ENV} file not found"
            exit 1
        fi
    fi
    
    # Validate environment variables
    if ! validate_environment; then
        exit 1
    fi
    
    # Create necessary directories
    mkdir -p logs temp uploads config/ssl nginx/ssl
    
    # Set proper permissions
    chmod 755 logs temp uploads
    chmod 600 .env.${DEPLOYMENT_ENV}  # Secure environment file
    
    log_success "Environment setup complete"
}

build_image() {
    log_info "Building Docker image..."
    
    cd "${PROJECT_DIR}"
    
    # Build the image
    docker build \
        -f Dockerfile.production \
        -t "${REGISTRY}/logan-dashboard:${IMAGE_TAG}" \
        -t "${REGISTRY}/logan-dashboard:latest" \
        .
    
    log_success "Docker image built successfully"
}

generate_ssl_certificates() {
    log_info "Generating SSL certificates..."
    
    local ssl_dir="${PROJECT_DIR}/nginx/ssl"
    
    if [[ ! -f "${ssl_dir}/logan.crt" ]] || [[ ! -f "${ssl_dir}/logan.key" ]]; then
        # Generate self-signed certificate for development/testing
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${ssl_dir}/logan.key" \
            -out "${ssl_dir}/logan.crt" \
            -subj "/CN=logan-dashboard/O=Logan Security/C=US"
        
        log_warning "Generated self-signed SSL certificate. Use proper certificates in production."
    else
        log_info "SSL certificates already exist"
    fi
}

deploy_application() {
    log_info "Deploying Logan Security Dashboard..."
    
    cd "${PROJECT_DIR}"
    
    # Pull latest images (if using registry)
    if [[ "${PULL_IMAGES:-false}" == "true" ]]; then
        docker-compose -f "${COMPOSE_FILE}" pull
    fi
    
    # Start services
    docker-compose -f "${COMPOSE_FILE}" up -d
    
    log_success "Application deployed successfully"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s http://localhost:${LOGAN_PORT:-3000}/api/health > /dev/null 2>&1; then
            log_success "Logan Dashboard is ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - waiting for Logan Dashboard..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Logan Dashboard failed to start within the expected time"
    return 1
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo "========================"
    echo "Application: Logan Security Dashboard"
    echo "Environment: ${DEPLOYMENT_ENV}"
    echo "URL: http://localhost:${LOGAN_PORT:-3000}"
    echo "Health Check: http://localhost:${LOGAN_PORT:-3000}/api/health"
    echo ""
    echo "Services:"
    docker-compose -f "${COMPOSE_FILE}" ps
    echo ""
    echo "Logs: docker-compose -f ${COMPOSE_FILE} logs -f"
    echo "Stop: docker-compose -f ${COMPOSE_FILE} down"
}

cleanup_old_resources() {
    log_info "Cleaning up old resources..."
    
    # Remove old containers
    docker container prune -f
    
    # Remove old images
    docker image prune -f
    
    # Remove old volumes (be careful with this in production)
    if [[ "${CLEANUP_VOLUMES:-false}" == "true" ]]; then
        log_warning "Removing old volumes..."
        docker volume prune -f
    fi
    
    log_success "Cleanup complete"
}

backup_data() {
    log_info "Creating backup..."
    
    local backup_dir="${PROJECT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "${backup_dir}"
    
    # Backup configuration
    cp -r config/ "${backup_dir}/" 2>/dev/null || true
    
    # Backup logs
    cp -r logs/ "${backup_dir}/" 2>/dev/null || true
    
    # Backup uploads
    cp -r uploads/ "${backup_dir}/" 2>/dev/null || true
    
    # Create archive
    tar -czf "${backup_dir}.tar.gz" -C "${PROJECT_DIR}/backups" "$(basename "${backup_dir}")"
    rm -rf "${backup_dir}"
    
    log_success "Backup created: ${backup_dir}.tar.gz"
}

# Cloud Provider Specific Deployments

deploy_to_aws() {
    log_info "Deploying to AWS..."
    
    # AWS specific deployment logic
    # This could include ECS, EKS, or EC2 deployment
    
    export AWS_REGION="${AWS_REGION:-us-east-1}"
    
    # Example: Deploy to ECS
    if [[ "${AWS_DEPLOY_TARGET}" == "ecs" ]]; then
        # Push image to ECR
        aws ecr get-login-password --region "${AWS_REGION}" | \
            docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        
        docker tag "${REGISTRY}/logan-dashboard:${IMAGE_TAG}" \
            "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/logan-dashboard:${IMAGE_TAG}"
        
        docker push "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/logan-dashboard:${IMAGE_TAG}"
        
        # Update ECS service
        aws ecs update-service \
            --cluster "${ECS_CLUSTER}" \
            --service "${ECS_SERVICE}" \
            --force-new-deployment
    fi
    
    log_success "AWS deployment complete"
}

deploy_to_azure() {
    log_info "Deploying to Azure..."
    
    # Azure specific deployment logic
    # This could include ACI, AKS, or VM deployment
    
    if [[ "${AZURE_DEPLOY_TARGET}" == "aci" ]]; then
        # Deploy to Azure Container Instances
        az container create \
            --resource-group "${AZURE_RESOURCE_GROUP}" \
            --name "logan-dashboard" \
            --image "${REGISTRY}/logan-dashboard:${IMAGE_TAG}" \
            --ports 3000 \
            --environment-variables \
                NODE_ENV=production \
                LOGAN_REGION="${LOGAN_REGION}" \
            --restart-policy Always
    fi
    
    log_success "Azure deployment complete"
}

deploy_to_gcp() {
    log_info "Deploying to Google Cloud..."
    
    # GCP specific deployment logic
    # This could include Cloud Run, GKE, or Compute Engine deployment
    
    if [[ "${GCP_DEPLOY_TARGET}" == "cloudrun" ]]; then
        # Push to Google Container Registry
        docker tag "${REGISTRY}/logan-dashboard:${IMAGE_TAG}" \
            "gcr.io/${GOOGLE_CLOUD_PROJECT}/logan-dashboard:${IMAGE_TAG}"
        
        docker push "gcr.io/${GOOGLE_CLOUD_PROJECT}/logan-dashboard:${IMAGE_TAG}"
        
        # Deploy to Cloud Run
        gcloud run deploy logan-dashboard \
            --image="gcr.io/${GOOGLE_CLOUD_PROJECT}/logan-dashboard:${IMAGE_TAG}" \
            --platform=managed \
            --region="${GCP_REGION:-us-central1}" \
            --allow-unauthenticated \
            --port=3000 \
            --set-env-vars="NODE_ENV=production,LOGAN_REGION=${LOGAN_REGION}"
    fi
    
    log_success "GCP deployment complete"
}

# Main execution
main() {
    log_info "Starting Logan Security Dashboard deployment..."
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                DEPLOYMENT_ENV="$2"
                shift 2
                ;;
            --tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --cloud)
                CLOUD_PROVIDER="$2"
                shift 2
                ;;
            --backup)
                BACKUP_BEFORE_DEPLOY=true
                shift
                ;;
            --cleanup)
                CLEANUP_VOLUMES=true
                shift
                ;;
            --pull)
                PULL_IMAGES=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --env ENV          Deployment environment (default: production)"
                echo "  --tag TAG          Docker image tag (default: latest)"
                echo "  --registry REG     Docker registry (default: logan-security)"
                echo "  --cloud PROVIDER   Cloud provider (aws|azure|gcp)"
                echo "  --backup           Create backup before deployment"
                echo "  --cleanup          Clean up old volumes"
                echo "  --pull             Pull latest images"
                echo "  --help             Show this help"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_requirements
    setup_environment
    
    if [[ "${BACKUP_BEFORE_DEPLOY:-false}" == "true" ]]; then
        backup_data
    fi
    
    build_image
    generate_ssl_certificates
    
    # Cloud-specific deployment
    case "${CLOUD_PROVIDER:-local}" in
        aws)
            deploy_to_aws
            ;;
        azure)
            deploy_to_azure
            ;;
        gcp)
            deploy_to_gcp
            ;;
        local|*)
            deploy_application
            wait_for_services
            ;;
    esac
    
    if [[ "${CLOUD_PROVIDER:-local}" == "local" ]]; then
        show_deployment_info
    fi
    
    if [[ "${CLEANUP_AFTER_DEPLOY:-false}" == "true" ]]; then
        cleanup_old_resources
    fi
    
    log_success "Logan Security Dashboard deployment completed successfully!"
}

# Execute main function
main "$@"