#!/bin/bash

# Logan Security Dashboard - Secret Generation Script
# This script generates secure random secrets for the application

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to generate a secure random string
generate_secret() {
    local length=$1
    openssl rand -base64 $((length * 3/4)) | tr -d "=+/" | cut -c1-${length}
}

# Function to generate a hex string
generate_hex() {
    local length=$1
    openssl rand -hex $((length / 2))
}

# Function to generate UUID
generate_uuid() {
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        openssl rand -hex 16 | sed 's/\(..\)/\1/g' | sed 's/^\(.{8}\)\(.{4}\)\(.{4}\)\(.{4}\)\(.{12}\)$/\1-\2-\3-\4-\5/'
    fi
}

# Check if OpenSSL is available
check_dependencies() {
    if ! command -v openssl &> /dev/null; then
        log_error "OpenSSL is required but not installed."
        exit 1
    fi
    log_success "Dependencies satisfied"
}

# Generate secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    cat << EOF
# =============================================================================
# GENERATED SECRETS FOR LOGAN SECURITY DASHBOARD
# Generated on: $(date)
# =============================================================================
# 
# IMPORTANT SECURITY NOTES:
# - Store these secrets securely (e.g., in a password manager)
# - Never commit these to version control
# - Use different secrets for each environment (dev, staging, prod)
# - Rotate secrets regularly
# - Grant access only to authorized personnel
#
# =============================================================================

# Application Security Keys
ENCRYPTION_KEY=$(generate_secret 32)
SESSION_SECRET=$(generate_secret 64)
JWT_SECRET=$(generate_secret 48)

# API Keys
LOGAN_API_KEY=$(generate_uuid)
LOGAN_AGENT_API_KEY=$(generate_uuid)

# Database Secrets
# ORACLE_DB_PASSWORD=your-secure-database-password-here

# Redis Configuration
REDIS_PASSWORD=$(generate_secret 32)

# External Service API Keys
# N8N_API_KEY=your-n8n-api-key-here
# RITA_API_KEY=your-rita-api-key-here

# Email Service Credentials
# SMTP_PASSWORD=your-smtp-password-here

# Cloud Provider Credentials
# AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
# AZURE_CLIENT_SECRET=your-azure-client-secret
# GOOGLE_APPLICATION_CREDENTIALS_JSON=your-gcp-service-account-json

# Ludus Cloud Integration (if enabled)
# LUDUS_API_KEY=your-ludus-api-key-here
# LUDUS_WEBHOOK_SECRET=$(generate_secret 32)

# Ansible Vault Password (if using Ansible integration)
# ANSIBLE_VAULT_PASSWORD=$(generate_secret 32)

# =============================================================================
# BASE64 ENCODED SECRETS FOR KUBERNETES
# =============================================================================
# Use these values in your Kubernetes Secret manifests
# Generate command: echo -n "secret-value" | base64

ENCRYPTION_KEY_BASE64=$(echo -n "$(generate_secret 32)" | base64)
SESSION_SECRET_BASE64=$(echo -n "$(generate_secret 64)" | base64)
REDIS_PASSWORD_BASE64=$(echo -n "$(generate_secret 32)" | base64)

# =============================================================================
# VALIDATION
# =============================================================================
# Verify these secrets meet security requirements:
# - ENCRYPTION_KEY: 32 characters minimum
# - SESSION_SECRET: 64 characters minimum  
# - JWT_SECRET: 48 characters minimum
# - All secrets use cryptographically secure random generation
# - Base64 encoded values are properly formatted

EOF
}

# Generate environment-specific secrets
generate_env_secrets() {
    local env=$1
    local output_file=".env.${env}.secrets"
    
    log_info "Generating secrets for ${env} environment..."
    
    # Check if file already exists
    if [[ -f "${output_file}" ]]; then
        log_warning "File ${output_file} already exists."
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping ${env} environment"
            return
        fi
    fi
    
    # Generate secrets and save to file
    generate_secrets > "${output_file}"
    chmod 600 "${output_file}"  # Restrict file permissions
    
    log_success "Secrets generated for ${env} environment: ${output_file}"
    log_warning "Please review and update the commented values with your actual credentials"
}

# Generate Kubernetes secret manifest
generate_k8s_secrets() {
    local namespace=${1:-logan-security}
    local output_file="k8s-secrets.yaml"
    
    log_info "Generating Kubernetes secret manifest..."
    
    local encryption_key=$(generate_secret 32)
    local session_secret=$(generate_secret 64)
    local redis_password=$(generate_secret 32)
    
    cat << EOF > "${output_file}"
# Logan Security Dashboard - Kubernetes Secrets
# Generated on: $(date)
# 
# IMPORTANT: Replace placeholder values with your actual secrets
# Apply with: kubectl apply -f ${output_file}

apiVersion: v1
kind: Secret
metadata:
  name: logan-secrets
  namespace: ${namespace}
  labels:
    app: logan-dashboard
type: Opaque
data:
  # Application secrets (auto-generated)
  ENCRYPTION_KEY: $(echo -n "${encryption_key}" | base64)
  SESSION_SECRET: $(echo -n "${session_secret}" | base64)
  REDIS_PASSWORD: $(echo -n "${redis_password}" | base64)
  
  # Database credentials (UPDATE THESE)
  ORACLE_DB_USER: $(echo -n "your-db-user" | base64)
  ORACLE_DB_PASSWORD: $(echo -n "your-db-password" | base64)
  ORACLE_DB_CONNECTION_STRING: $(echo -n "your-connection-string" | base64)
  LOGAN_COMPARTMENT_ID: $(echo -n "your-compartment-id" | base64)
  
  # API Keys (UPDATE THESE)
  LOGAN_API_KEY: $(echo -n "$(generate_uuid)" | base64)
  LOGAN_AGENT_API_KEY: $(echo -n "$(generate_uuid)" | base64)
  
  # External service keys (UPDATE THESE)
  N8N_API_KEY: $(echo -n "your-n8n-api-key" | base64)
  RITA_API_KEY: $(echo -n "your-rita-api-key" | base64)

---
# Redis password secret (if using external Redis)
apiVersion: v1
kind: Secret
metadata:
  name: redis-auth
  namespace: ${namespace}
  labels:
    app: redis
type: Opaque
data:
  redis-password: $(echo -n "${redis_password}" | base64)
EOF
    
    chmod 600 "${output_file}"
    log_success "Kubernetes secrets generated: ${output_file}"
    log_warning "Review and update placeholder values before applying to cluster"
}

# Main function
main() {
    log_info "Logan Security Dashboard - Secret Generation Tool"
    echo "================================================="
    
    check_dependencies
    
    case "${1:-interactive}" in
        "development"|"dev")
            generate_env_secrets "development"
            ;;
        "production"|"prod")
            generate_env_secrets "production"
            ;;
        "staging")
            generate_env_secrets "staging"
            ;;
        "kubernetes"|"k8s")
            generate_k8s_secrets "${2:-logan-security}"
            ;;
        "all")
            generate_env_secrets "development"
            generate_env_secrets "staging" 
            generate_env_secrets "production"
            generate_k8s_secrets
            ;;
        "interactive"|*)
            echo "Select secret generation option:"
            echo "1) Development environment"
            echo "2) Production environment"
            echo "3) Staging environment"
            echo "4) Kubernetes secrets"
            echo "5) All environments"
            echo "6) Display secrets to stdout"
            echo ""
            read -p "Enter your choice (1-6): " choice
            
            case $choice in
                1) generate_env_secrets "development" ;;
                2) generate_env_secrets "production" ;;
                3) generate_env_secrets "staging" ;;
                4) generate_k8s_secrets ;;
                5) 
                    generate_env_secrets "development"
                    generate_env_secrets "staging"
                    generate_env_secrets "production"
                    generate_k8s_secrets
                    ;;
                6) generate_secrets ;;
                *) log_error "Invalid choice" && exit 1 ;;
            esac
            ;;
    esac
    
    log_info "Secret generation complete!"
    log_warning "Remember to:"
    log_warning "1. Store secrets securely"
    log_warning "2. Update placeholder values with actual credentials"
    log_warning "3. Set appropriate file permissions (600)"
    log_warning "4. Never commit secrets to version control"
    log_warning "5. Use different secrets for each environment"
}

# Execute main function with all arguments
main "$@"