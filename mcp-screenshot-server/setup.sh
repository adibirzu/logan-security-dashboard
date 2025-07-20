#!/bin/bash

# Logan Screenshot MCP Server Setup Script

echo "🚀 Setting up Logan Screenshot MCP Server..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Step 2: Build the project
echo -e "${BLUE}🔨 Building the project...${NC}"
npm run build

# Step 3: Create screenshots directory
echo -e "${BLUE}📁 Creating screenshots directory...${NC}"
mkdir -p ../screenshots

# Step 4: Configure MCP
echo -e "${YELLOW}⚙️  MCP Configuration${NC}"
echo ""
echo "Add the following to your Claude Desktop configuration:"
echo "Location: ~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo -e "${GREEN}{
  \"mcpServers\": {
    \"logan-screenshot\": {
      \"command\": \"node\",
      \"args\": [\"${SCRIPT_DIR}/dist/index.js\"],
      \"env\": {}
    }
  }
}${NC}"
echo ""
echo "Or for development mode:"
echo -e "${GREEN}{
  \"mcpServers\": {
    \"logan-screenshot\": {
      \"command\": \"npm\",
      \"args\": [\"run\", \"dev\"],
      \"cwd\": \"${SCRIPT_DIR}\",
      \"env\": {}
    }
  }
}${NC}"
echo ""

# Step 5: Test the build
echo -e "${BLUE}🧪 Testing the build...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed. Please check for errors above.${NC}"
    exit 1
fi

# Step 6: Instructions
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy the configuration above to your Claude Desktop config"
echo "2. Restart Claude Desktop"
echo "3. Start Logan Security Dashboard: cd .. && npm run dev"
echo "4. In Claude, say: 'Take all screenshots of the Logan Security Dashboard'"
echo ""
echo -e "${BLUE}📸 Happy screenshotting!${NC}"