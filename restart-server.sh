#!/bin/bash

# Logan Security Dashboard - Server Restart Script
# This script completely restarts the development server

set -e

echo "🔄 Restarting Logan Security Dashboard..."
echo "========================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    
    if check_port $port; then
        echo "⚠️  Port $port is in use. Killing processes..."
        
        # Get PIDs of processes using the port
        pids=$(lsof -ti:$port)
        
        if [ ! -z "$pids" ]; then
            echo "   Killing PIDs: $pids"
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 2
            
            # Double-check if port is now free
            if check_port $port; then
                echo "❌ Failed to free port $port. Some processes may still be running."
                echo "   You may need to manually kill them or restart your terminal."
            else
                echo "✅ Port $port is now free."
            fi
        fi
    else
        echo "✅ Port $port is free."
    fi
}

# Function to completely stop all related processes
stop_all_processes() {
    echo "🛑 Stopping all Logan Security Dashboard processes..."
    
    # Kill all npm processes
    echo "   Killing npm processes..."
    pkill -f "npm" 2>/dev/null || true
    
    # Kill all node processes related to Next.js development
    echo "   Killing Next.js processes..."
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "logan-security-dashboard" 2>/dev/null || true
    
    # Kill any node processes running on common development ports
    echo "   Checking and cleaning ports..."
    for port in 3000 3001 3002 3003 3004 3005; do
        kill_port $port
    done
    
    # Kill any Python MCP servers that might be running
    echo "   Cleaning up MCP servers..."
    pkill -f "logan_mcp.py" 2>/dev/null || true
    pkill -f "logan-fastmcp" 2>/dev/null || true
    
    echo "✅ All processes stopped."
    sleep 2
}

# Function to clear Next.js cache
clear_cache() {
    echo "🧹 Clearing Next.js cache..."
    
    # Remove .next directory if it exists
    if [ -d ".next" ]; then
        rm -rf .next
        echo "   Removed .next directory"
    fi
    
    # Remove node_modules/.cache if it exists
    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        echo "   Removed node_modules/.cache"
    fi
    
    echo "✅ Cache cleared."
}

# Function to restart the server
restart_server() {
    echo "🚀 Starting fresh development server..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ Error: package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check dependencies
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    else
        echo "📦 Dependencies already installed."
    fi
    
    # Start the development server
    echo "🌟 Starting Next.js development server on http://localhost:3000"
    echo "   Press Ctrl+C to stop the server"
    echo ""
    
    npm run dev
}

# Main execution
echo "1️⃣  Stopping all related processes..."
stop_all_processes

echo ""
echo "2️⃣  Clearing cache..."
clear_cache

echo ""
echo "3️⃣  Starting fresh server..."
restart_server
