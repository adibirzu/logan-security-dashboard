#!/bin/bash
set -e

echo "🚀 Installing Logan Security Dashboard..."
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is required but not installed."
    print_error "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is required but not installed."
    exit 1
fi

# Check Python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python found: $PYTHON_VERSION"
else
    print_error "Python 3 is required but not installed."
    print_error "Please install Python 3.8+ from https://python.org/"
    exit 1
fi

# Check pip
if command -v pip3 >/dev/null 2>&1; then
    PIP_VERSION=$(pip3 --version)
    print_success "pip3 found: $PIP_VERSION"
else
    print_error "pip3 is required but not installed."
    exit 1
fi

# Check OCI CLI
if command -v oci >/dev/null 2>&1; then
    OCI_VERSION=$(oci --version)
    print_success "OCI CLI found: $OCI_VERSION"
else
    print_warning "OCI CLI not found. You'll need to install and configure it."
    print_warning "Installation guide: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm"
fi

# Check Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version)
    print_success "Git found: $GIT_VERSION"
else
    print_warning "Git not found. Some features may not work properly."
fi

print_success "Prerequisites check completed!"
echo ""

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
if npm install; then
    print_success "Node.js dependencies installed successfully"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

echo ""

# Install Python dependencies
print_status "Installing Python dependencies..."
if [ -f "scripts/requirements.txt" ]; then
    if pip3 install -r scripts/requirements.txt; then
        print_success "Python dependencies installed successfully"
    else
        print_error "Failed to install Python dependencies"
        exit 1
    fi
else
    print_warning "scripts/requirements.txt not found, skipping Python dependencies"
fi

echo ""

# Copy environment file
print_status "Setting up configuration..."
if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        print_success "Created .env.local from template"
        print_warning "Please edit .env.local with your OCI configuration:"
        print_warning "  - NEXT_PUBLIC_LOGAN_REGION"
        print_warning "  - NEXT_PUBLIC_LOGAN_NAMESPACE"
        print_warning "  - NEXT_PUBLIC_LOGAN_COMPARTMENT_ID"
        print_warning "  - LOGAN_MCP_SERVER_PATH"
    else
        print_error ".env.local.example not found"
        exit 1
    fi
else
    print_warning ".env.local already exists, skipping configuration copy"
fi

echo ""

# Verify OCI configuration
print_status "Checking OCI configuration..."
if command -v oci >/dev/null 2>&1; then
    if oci iam user list --auth-purpose service >/dev/null 2>&1; then
        print_success "OCI CLI is properly configured"
    else
        print_warning "OCI CLI is installed but not configured properly"
        print_warning "Run 'oci setup config' to configure OCI CLI"
    fi
fi

echo ""

# Create start script
print_status "Creating startup scripts..."

cat > start-dashboard.sh << 'EOF'
#!/bin/bash
echo "Starting Logan Security Dashboard..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "ERROR: .env.local not found. Please copy .env.local.example and configure it."
    exit 1
fi

# Start the development server
echo "Starting Next.js development server..."
npm run dev
EOF

chmod +x start-dashboard.sh
print_success "Created start-dashboard.sh"

cat > start-production.sh << 'EOF'
#!/bin/bash
echo "Starting Logan Security Dashboard in production mode..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "ERROR: .env.local not found. Please copy .env.local.example and configure it."
    exit 1
fi

# Build the application
echo "Building application..."
npm run build

# Start the production server
echo "Starting production server..."
npm run start
EOF

chmod +x start-production.sh
print_success "Created start-production.sh"

echo ""
print_success "🎉 Installation completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Edit .env.local with your OCI configuration"
echo "2. Ensure OCI CLI is configured: oci setup config"
echo "3. Start the MCP server (see README.md for details)"
echo "4. Start the dashboard: ./start-dashboard.sh"
echo ""
print_status "For detailed instructions, see README.md"
echo "For production deployment, use: ./start-production.sh"
