#!/bin/bash

# Logan Security Dashboard - Database Connection Test Script
# This script tests Oracle Autonomous Database connections using environment variables

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

# Function to validate environment variables
validate_environment() {
    log_info "Validating database environment variables..."
    
    local missing_vars=()
    local required_vars=(
        "ORACLE_DB_PASSWORD"
        "WALLET_PATH"
    )
    
    # Check for required variables
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    # Check for placeholder values
    if [[ "${ORACLE_DB_PASSWORD:-}" == *"your-"* ]] || [[ "${ORACLE_DB_PASSWORD:-}" == *"password"* ]]; then
        log_error "ORACLE_DB_PASSWORD contains placeholder value"
        missing_vars+=("ORACLE_DB_PASSWORD")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing or invalid environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        echo ""
        log_error "Required environment variables:"
        log_error "  ORACLE_DB_PASSWORD - Your Autonomous Database ADMIN password"
        log_error "  WALLET_PATH - Path to your wallet directory"
        echo ""
        log_error "Optional environment variables:"
        log_error "  ORACLE_DB_USER - Database user (default: ADMIN)"
        log_error "  ORACLE_DB_CONNECTION_STRING - Connection string"
        log_error "  ORACLE_DB_SERVICES - Service names (comma-separated)"
        echo ""
        log_error "Example setup:"
        log_error "  export ORACLE_DB_PASSWORD=\"your-actual-admin-password\""
        log_error "  export WALLET_PATH=\"./wallet_unzipped\""
        return 1
    fi
    
    log_success "Environment variables validated"
    return 0
}

# Function to check wallet files
check_wallet_files() {
    log_info "Checking wallet files..."
    
    local wallet_path="${WALLET_PATH:-./wallet_unzipped}"
    
    if [[ ! -d "$wallet_path" ]]; then
        log_error "Wallet directory not found: $wallet_path"
        return 1
    fi
    
    local required_files=(
        "tnsnames.ora"
        "sqlnet.ora"
        "cwallet.sso"
    )
    
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$wallet_path/$file" ]]; then
            missing_files+=("$file")
        else
            log_success "Found: $file"
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing wallet files:"
        for file in "${missing_files[@]}"; do
            log_error "  - $file"
        done
        log_error "Please ensure your wallet is extracted to: $wallet_path"
        return 1
    fi
    
    log_success "All required wallet files found"
    return 0
}

# Function to run database connection tests
run_connection_tests() {
    log_info "Running database connection tests..."
    
    local test_files=(
        "test-oracle-connection.js"
        "test-autonomous-db.js"
        "test-thin-mode.js"
        "test-all-connections.js"
    )
    
    local passed=0
    local failed=0
    
    for test_file in "${test_files[@]}"; do
        if [[ -f "$test_file" ]]; then
            log_info "Running: $test_file"
            if node "$test_file"; then
                log_success "PASSED: $test_file"
                ((passed++))
            else
                log_error "FAILED: $test_file"
                ((failed++))
            fi
            echo ""
        else
            log_warning "Test file not found: $test_file"
        fi
    done
    
    echo "=================================="
    log_info "Test Results Summary:"
    log_success "Passed: $passed"
    if [[ $failed -gt 0 ]]; then
        log_error "Failed: $failed"
        return 1
    else
        log_success "All tests passed!"
        return 0
    fi
}

# Function to create environment template
create_env_template() {
    local env_file="${1:-.env.database}"
    
    if [[ -f "$env_file" ]]; then
        log_warning "File $env_file already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    log_info "Creating database environment template: $env_file"
    
    cat > "$env_file" << 'EOF'
# Logan Security Dashboard - Database Configuration
# Copy and customize this file for your environment

# Oracle Autonomous Database Configuration
ORACLE_DB_USER=ADMIN
ORACLE_DB_PASSWORD=your-autonomous-database-admin-password

# Oracle Wallet Configuration
WALLET_PATH=./wallet_unzipped
TNS_ADMIN=/app/wallet_unzipped
ORACLE_WALLET_PASSWORD=

# Database Services (comma-separated)
ORACLE_DB_SERVICES=finopsmvpdb_high,finopsmvpdb_medium,finopsmvpdb_low

# Connection String (optional - can be read from tnsnames.ora)
ORACLE_DB_CONNECTION_STRING=

# Connection String alternatives for testing
ORACLE_CONNECTION_STRINGS=

# Target Schema
TARGET_SCHEMA=LOGAN_USER

# Neo4j Configuration (for graph analysis)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
EOF
    
    chmod 600 "$env_file"
    log_success "Database environment template created: $env_file"
    log_warning "Please update the file with your actual credentials"
}

# Function to show database information
show_database_info() {
    log_info "Database Configuration Information:"
    echo "=================================="
    echo "Database User: ${ORACLE_DB_USER:-ADMIN}"
    echo "Wallet Path: ${WALLET_PATH:-./wallet_unzipped}"
    echo "TNS Admin: ${TNS_ADMIN:-/app/wallet_unzipped}"
    echo "Services: ${ORACLE_DB_SERVICES:-finopsmvpdb_high,finopsmvpdb_medium,finopsmvpdb_low}"
    
    if [[ -n "${ORACLE_DB_CONNECTION_STRING:-}" ]]; then
        echo "Connection String: [SET]"
    else
        echo "Connection String: [Not Set - will use tnsnames.ora]"
    fi
    
    if [[ -n "${ORACLE_DB_PASSWORD:-}" ]]; then
        echo "Database Password: [SET]"
    else
        echo "Database Password: [NOT SET - REQUIRED]"
    fi
    echo "=================================="
}

# Main function
main() {
    echo "Logan Security Dashboard - Database Setup and Test"
    echo "=================================================="
    
    case "${1:-help}" in
        "validate")
            validate_environment
            ;;
        "check-wallet")
            check_wallet_files
            ;;
        "test")
            if validate_environment && check_wallet_files; then
                run_connection_tests
            else
                log_error "Environment validation failed. Cannot run tests."
                exit 1
            fi
            ;;
        "info")
            show_database_info
            ;;
        "create-template")
            create_env_template "${2:-.env.database}"
            ;;
        "setup")
            log_info "Setting up database configuration..."
            create_env_template ".env.database"
            log_info "Next steps:"
            log_info "1. Edit .env.database with your actual credentials"
            log_info "2. Source the file: source .env.database"
            log_info "3. Run validation: $0 validate"
            log_info "4. Run tests: $0 test"
            ;;
        "help"|*)
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  validate      - Validate environment variables"
            echo "  check-wallet  - Check wallet files"
            echo "  test          - Run database connection tests"
            echo "  info          - Show current database configuration"
            echo "  create-template [file] - Create environment template"
            echo "  setup         - Interactive setup"
            echo "  help          - Show this help"
            echo ""
            echo "Environment Variables Required:"
            echo "  ORACLE_DB_PASSWORD - Autonomous Database ADMIN password"
            echo "  WALLET_PATH        - Path to wallet directory"
            echo ""
            echo "Environment Variables Optional:"
            echo "  ORACLE_DB_USER           - Database user (default: ADMIN)"
            echo "  ORACLE_DB_CONNECTION_STRING - Connection string"
            echo "  ORACLE_DB_SERVICES       - Service names"
            echo "  TNS_ADMIN               - TNS admin directory"
            echo ""
            echo "Examples:"
            echo "  $0 setup                    # Interactive setup"
            echo "  $0 validate                 # Validate configuration"
            echo "  $0 test                     # Run all connection tests"
            echo "  source .env.database && $0 test  # Load env and test"
            ;;
    esac
}

# Execute main function
main "$@"