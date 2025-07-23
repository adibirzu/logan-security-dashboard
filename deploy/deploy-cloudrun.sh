#!/bin/bash

# Logan Security Dashboard - Google Cloud Run Deployment Script
# Automated deployment to Google Cloud Run

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

# Default values
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${CLOUD_RUN_SERVICE:-logan-dashboard}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REPOSITORY="${ARTIFACT_REGISTRY_REPO:-logan-security}"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"

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
    
    # Check gcloud CLI
    if ! command -v gcloud &> /dev/null; then
        log_error "Google Cloud CLI is not installed"
        log_error "Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        log_error "Not authenticated with Google Cloud"
        log_error "Run: gcloud auth login"
        exit 1
    fi
    
    log_success "System requirements satisfied"
}

validate_configuration() {
    log_info "Validating configuration..."
    
    # Check if PROJECT_ID is set
    if [[ -z "${PROJECT_ID}" ]]; then
        # Try to get from gcloud config
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
        
        if [[ -z "${PROJECT_ID}" ]]; then
            log_error "Google Cloud Project ID not set"
            log_error "Set PROJECT_ID environment variable or run: gcloud config set project YOUR_PROJECT_ID"
            exit 1
        fi
    fi
    
    # Set computed values
    REPOSITORY_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}"
    IMAGE_URL="${REPOSITORY_URL}/${SERVICE_NAME}:${IMAGE_TAG}"
    
    log_success "Configuration validated"
    log_info "Project ID: ${PROJECT_ID}"
    log_info "Region: ${REGION}"
    log_info "Service Name: ${SERVICE_NAME}"
    log_info "Image URL: ${IMAGE_URL}"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Required environment variables for Cloud Run
    local required_vars=(
        "ORACLE_DB_PASSWORD"
        "ENCRYPTION_KEY"
        "SESSION_SECRET"
        "LOGAN_COMPARTMENT_ID"
    )
    
    # Source environment file
    local env_file=".env.${DEPLOYMENT_ENV}"
    if [[ -f "${env_file}" ]]; then
        # Load environment variables
        set -a
        source "${env_file}"
        set +a
        log_info "Loaded environment from ${env_file}"
    else
        log_error "Environment file ${env_file} not found"
        log_error "Create it from .env.production.example"
        exit 1
    fi
    
    local missing_vars=()
    
    # Check for required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]] || [[ "${!var}" == *"your-"* ]] || [[ "${!var}" == *"example"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    # Check encryption key length
    if [[ -n "${ENCRYPTION_KEY}" ]] && [[ ${#ENCRYPTION_KEY} -lt 32 ]]; then
        log_error "ENCRYPTION_KEY must be at least 32 characters long"
        missing_vars+=("ENCRYPTION_KEY")
    fi
    
    # Check session secret length
    if [[ -n "${SESSION_SECRET}" ]] && [[ ${#SESSION_SECRET} -lt 32 ]]; then
        log_error "SESSION_SECRET must be at least 32 characters long"
        missing_vars+=("SESSION_SECRET")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing or invalid environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        log_error ""
        log_error "Use './scripts/generate-secrets.sh ${DEPLOYMENT_ENV}' to generate secure secrets."
        exit 1
    fi
    
    log_success "Environment validation passed"
}

enable_apis() {
    log_info "Enabling required Google Cloud APIs..."
    
    local apis=(
        "cloudbuild.googleapis.com"
        "run.googleapis.com"
        "artifactregistry.googleapis.com"
        "secretmanager.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        log_info "Enabling ${api}..."
        gcloud services enable "${api}" --project="${PROJECT_ID}"
    done
    
    log_success "APIs enabled"
}

create_artifact_registry() {
    log_info "Setting up Artifact Registry..."
    
    # Check if repository exists
    if ! gcloud artifacts repositories describe "${REPOSITORY}" \
        --location="${REGION}" \
        --project="${PROJECT_ID}" &>/dev/null; then
        
        log_info "Creating Artifact Registry repository..."
        gcloud artifacts repositories create "${REPOSITORY}" \
            --repository-format=docker \
            --location="${REGION}" \
            --description="Logan Security Dashboard container images" \
            --project="${PROJECT_ID}"
        
        log_success "Artifact Registry repository created"
    else
        log_info "Artifact Registry repository already exists"
    fi
    
    # Configure Docker authentication
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
    
    log_success "Artifact Registry configured"
}

build_and_push_image() {
    log_info "Building and pushing Docker image..."
    
    cd "${PROJECT_DIR}"
    
    # Source environment variables for build
    set -a
    source .env.${DEPLOYMENT_ENV} 2>/dev/null || {
        log_error "Environment file .env.${DEPLOYMENT_ENV} not found"
        exit 1
    }
    set +a
    
    # Build the image with environment variables as build args
    log_info "Building Docker image with environment variables..."
    docker build \
        -f Dockerfile.cloudrun \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_TELEMETRY_DISABLED=1 \
        --build-arg LOGAN_REGION="${LOGAN_REGION}" \
        --build-arg LOGAN_COMPARTMENT_ID="${LOGAN_COMPARTMENT_ID}" \
        --build-arg LOGAN_NAMESPACE="${LOGAN_NAMESPACE}" \
        --build-arg TARGET_SCHEMA="${TARGET_SCHEMA}" \
        --build-arg ORACLE_DB_USER="${ORACLE_DB_USER}" \
        -t "${IMAGE_URL}" \
        -t "${REPOSITORY_URL}/${SERVICE_NAME}:latest" \
        .
    
    # Push the image
    log_info "Pushing Docker image to Artifact Registry..."
    docker push "${IMAGE_URL}"
    docker push "${REPOSITORY_URL}/${SERVICE_NAME}:latest"
    
    log_success "Docker image built and pushed successfully"
}

create_secrets() {
    log_info "Creating Google Cloud Secrets..."
    
    # Source environment variables
    set -a
    source .env.${DEPLOYMENT_ENV}
    set +a
    
    # Define secrets mapping (variable_name:secret_name)
    local secrets_map=(
        "ORACLE_DB_PASSWORD:oracle_db_password"
        "ENCRYPTION_KEY:encryption_key"
        "SESSION_SECRET:session_secret"
        "JWT_SECRET:jwt_secret"
        "NEO4J_PASSWORD:neo4j_password"
        "REDIS_PASSWORD:redis_password"
        "SMTP_PASSWORD:smtp_password"
    )
    
    for secret_mapping in "${secrets_map[@]}"; do
        local var_name="${secret_mapping%:*}"
        local secret_name="${secret_mapping#*:}"
        local secret_value="${!var_name:-}"
        
        if [[ -n "${secret_value}" ]] && [[ "${secret_value}" != *"your-"* ]]; then
            # Check if secret exists
            if ! gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &>/dev/null; then
                log_info "Creating secret: ${secret_name} (from ${var_name})"
                echo -n "${secret_value}" | gcloud secrets create "${secret_name}" \
                    --data-file=- \
                    --project="${PROJECT_ID}"
            else
                log_info "Updating secret: ${secret_name} (from ${var_name})"
                echo -n "${secret_value}" | gcloud secrets versions add "${secret_name}" \
                    --data-file=- \
                    --project="${PROJECT_ID}"
            fi
        else
            log_warning "Skipping ${var_name} (empty or placeholder value)"
        fi
    done
    
    # Grant Cloud Run service account access to secrets
    log_info "Configuring secret access for Cloud Run..."
    local service_account="$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
    
    for secret_mapping in "${secrets_map[@]}"; do
        local secret_name="${secret_mapping#*:}"
        
        if gcloud secrets describe "${secret_name}" --project="${PROJECT_ID}" &>/dev/null; then
            gcloud secrets add-iam-policy-binding "${secret_name}" \
                --member="serviceAccount:${service_account}" \
                --role="roles/secretmanager.secretAccessor" \
                --project="${PROJECT_ID}" \
                --quiet || true
        fi
    done
    
    log_success "Secrets created/updated and access configured"
}

deploy_to_cloud_run() {
    log_info "Deploying to Cloud Run..."
    
    # Source environment variables
    set -a
    source .env.${DEPLOYMENT_ENV}
    set +a
    
    # Prepare environment variables (non-secret ones from .env file)
    local env_vars=(
        "NODE_ENV=${NODE_ENV:-production}"
        "NEXT_TELEMETRY_DISABLED=${NEXT_TELEMETRY_DISABLED:-1}"
        "LOGAN_REGION=${LOGAN_REGION}"
        "LOGAN_COMPARTMENT_ID=${LOGAN_COMPARTMENT_ID}"
        "LOGAN_NAMESPACE=${LOGAN_NAMESPACE}"
        "TARGET_SCHEMA=${TARGET_SCHEMA:-LOGAN_USER}"
        "ORACLE_DB_USER=${ORACLE_DB_USER:-ADMIN}"
        "ORACLE_DB_HOST=${ORACLE_DB_HOST}"
        "ORACLE_DB_PORT=${ORACLE_DB_PORT:-1521}"
        "ORACLE_DB_SERVICE=${ORACLE_DB_SERVICE}"
        "ORACLE_DB_SERVICES=${ORACLE_DB_SERVICES}"
        "TNS_ADMIN=${TNS_ADMIN:-/app/wallet_unzipped}"
        "WALLET_PATH=${WALLET_PATH:-./wallet_unzipped}"
        "LOG_LEVEL=${LOG_LEVEL:-info}"
        "LOG_FORMAT=${LOG_FORMAT:-json}"
        "CACHE_TTL=${CACHE_TTL:-3600}"
        "MAX_QUERY_RESULTS=${MAX_QUERY_RESULTS:-10000}"
        "QUERY_TIMEOUT=${QUERY_TIMEOUT:-30000}"
        "MAX_CONCURRENT_QUERIES=${MAX_CONCURRENT_QUERIES:-5}"
        "MEMORY_LIMIT=${MEMORY_LIMIT:-2048}"
        "REDIS_ENABLED=${REDIS_ENABLED:-false}"
        "REDIS_HOST=${REDIS_HOST:-redis}"
        "REDIS_PORT=${REDIS_PORT:-6379}"
        "REDIS_MAX_MEMORY=${REDIS_MAX_MEMORY:-256mb}"
        "REDIS_TTL=${REDIS_TTL:-3600}"
        "FEATURE_PLUGINS_ENABLED=${FEATURE_PLUGINS_ENABLED:-false}"
        "FEATURE_MODULE_SYSTEM_ENABLED=${FEATURE_MODULE_SYSTEM_ENABLED:-true}"
        "FEATURE_ADVANCED_ANALYTICS=${FEATURE_ADVANCED_ANALYTICS:-true}"
        "FEATURE_THREAT_INTELLIGENCE=${FEATURE_THREAT_INTELLIGENCE:-true}"
        "METRICS_ENABLED=${METRICS_ENABLED:-true}"
        "HEALTH_CHECK_ENABLED=${HEALTH_CHECK_ENABLED:-true}"
        "PYTHON_PATH=/usr/bin/python3"
    )
    
    # Join environment variables
    local env_vars_string=""
    for env_var in "${env_vars[@]}"; do
        # Only add non-empty values
        if [[ "${env_var#*=}" != "" ]]; then
            env_vars_string="${env_vars_string}${env_var},"
        fi
    done
    env_vars_string="${env_vars_string%,}"  # Remove trailing comma
    
    # Prepare secrets mapping
    local secrets_string=""
    if [[ -n "${ORACLE_DB_PASSWORD}" ]]; then
        secrets_string="${secrets_string}ORACLE_DB_PASSWORD=oracle_db_password:latest,"
    fi
    if [[ -n "${ENCRYPTION_KEY}" ]]; then
        secrets_string="${secrets_string}ENCRYPTION_KEY=encryption_key:latest,"
    fi
    if [[ -n "${SESSION_SECRET}" ]]; then
        secrets_string="${secrets_string}SESSION_SECRET=session_secret:latest,"
    fi
    if [[ -n "${JWT_SECRET}" ]]; then
        secrets_string="${secrets_string}JWT_SECRET=jwt_secret:latest,"
    fi
    if [[ -n "${REDIS_PASSWORD}" ]]; then
        secrets_string="${secrets_string}REDIS_PASSWORD=redis_password:latest,"
    fi
    if [[ -n "${NEO4J_PASSWORD}" ]]; then
        secrets_string="${secrets_string}NEO4J_PASSWORD=neo4j_password:latest,"
    fi
    secrets_string="${secrets_string%,}"  # Remove trailing comma
    
    # Deploy to Cloud Run
    local deploy_cmd="gcloud run deploy ${SERVICE_NAME} \
        --image=${IMAGE_URL} \
        --platform=managed \
        --region=${REGION} \
        --project=${PROJECT_ID} \
        --allow-unauthenticated \
        --port=8080 \
        --memory=2Gi \
        --cpu=2 \
        --timeout=300 \
        --concurrency=100 \
        --min-instances=0 \
        --max-instances=10 \
        --execution-environment=gen2 \
        --cpu-boost \
        --no-use-http2"
    
    # Add environment variables if present
    if [[ -n "${env_vars_string}" ]]; then
        deploy_cmd="${deploy_cmd} --set-env-vars=${env_vars_string}"
    fi
    
    # Add secrets if present
    if [[ -n "${secrets_string}" ]]; then
        deploy_cmd="${deploy_cmd} --set-secrets=${secrets_string}"
    fi
    
    # Execute deployment
    eval "${deploy_cmd}"
    
    log_success "Cloud Run deployment completed"
    
    # Get service URL
    local service_url=$(gcloud run services describe "${SERVICE_NAME}" \
        --platform=managed \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)")
    
    log_success "Service deployed at: ${service_url}"
    
    # Test the deployment
    log_info "Testing deployment..."
    sleep 10  # Wait for deployment to be ready
    if curl -f -s "${service_url}/api/health" > /dev/null; then
        log_success "Health check passed!"
    else
        log_warning "Health check failed. Check service logs with:"
        log_warning "gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
    fi
    
    return 0
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo "=========================="
    echo "Project ID: ${PROJECT_ID}"
    echo "Service Name: ${SERVICE_NAME}"
    echo "Region: ${REGION}"
    echo "Image: ${IMAGE_URL}"
    echo ""
    
    # Get service URL
    local service_url=$(gcloud run services describe "${SERVICE_NAME}" \
        --platform=managed \
        --region="${REGION}" \
        --project="${PROJECT_ID}" \
        --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    echo "Service URL: ${service_url}"
    echo "Health Check: ${service_url}/api/health"
    echo ""
    echo "Useful commands:"
    echo "  View logs: gcloud run services logs tail ${SERVICE_NAME} --region=${REGION}"
    echo "  Update service: gcloud run services update ${SERVICE_NAME} --region=${REGION}"
    echo "  Delete service: gcloud run services delete ${SERVICE_NAME} --region=${REGION}"
}

cleanup_old_images() {
    log_info "Cleaning up old images..."
    
    # Keep only the latest 5 images
    local images_to_delete=$(gcloud artifacts docker images list "${REPOSITORY_URL}/${SERVICE_NAME}" \
        --format="value(IMAGE)" \
        --sort-by="~CREATE_TIME" \
        --limit=999 \
        --filter="NOT tags:(latest)" | tail -n +6)
    
    if [[ -n "${images_to_delete}" ]]; then
        echo "${images_to_delete}" | while read -r image; do
            log_info "Deleting old image: ${image}"
            gcloud artifacts docker images delete "${image}" --quiet
        done
    fi
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    log_info "Starting Logan Security Dashboard deployment to Cloud Run..."
    
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
            --tag)
                IMAGE_TAG="$2"
                shift 2
                ;;
            --env)
                DEPLOYMENT_ENV="$2"
                shift 2
                ;;
            --cleanup)
                CLEANUP_OLD_IMAGES=true
                shift
                ;;
            --no-secrets)
                SKIP_SECRETS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --project ID       Google Cloud Project ID"
                echo "  --region REGION    GCP region (default: us-central1)"
                echo "  --service NAME     Cloud Run service name (default: logan-dashboard)"
                echo "  --tag TAG          Docker image tag (default: latest)"
                echo "  --env ENV          Environment name (default: production)"
                echo "  --cleanup          Clean up old Docker images"
                echo "  --no-secrets       Skip secret creation"
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
    validate_configuration
    validate_environment
    enable_apis
    create_artifact_registry
    build_and_push_image
    
    if [[ "${SKIP_SECRETS:-false}" != "true" ]]; then
        create_secrets
    fi
    
    deploy_to_cloud_run
    show_deployment_info
    
    if [[ "${CLEANUP_OLD_IMAGES:-false}" == "true" ]]; then
        cleanup_old_images
    fi
    
    log_success "Logan Security Dashboard deployment completed successfully!"
}

# Execute main function
main "$@"