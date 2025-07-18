#!/bin/bash

# Logan Security Dashboard - Server Stop Script
# This script stops all related development processes

set -e

echo "🛑 Stopping Logan Security Dashboard..."
echo "====================================="

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
            sleep 1
            
            # Double-check if port is now free
            if check_port $port; then
                echo "❌ Some processes may still be running on port $port"
            else
                echo "✅ Port $port is now free."
            fi
        fi
    else
        echo "✅ Port $port is already free."
    fi
}

# Function to stop all related processes
stop_all_processes() {
    echo "🧹 Stopping all related processes..."
    
    # Kill all npm processes
    echo "   Stopping npm processes..."
    pkill -f "npm" 2>/dev/null || true
    
    # Kill all node processes related to Next.js development
    echo "   Stopping Next.js processes..."
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "logan-security-dashboard" 2>/dev/null || true
    
    # Kill any node processes running on common development ports
    echo "   Cleaning ports..."
    for port in 3000 3001 3002 3003 3004 3005; do
        kill_port $port
    done
    
    # Kill any Python MCP servers that might be running
    echo "   Stopping MCP servers..."
    pkill -f "logan_mcp.py" 2>/dev/null || true
    pkill -f "logan-fastmcp" 2>/dev/null || true
    
    echo "✅ All processes stopped successfully."
}

# Main execution
stop_all_processes

echo ""
echo "🎯 Logan Security Dashboard has been stopped."
echo "   You can restart it using: ./start-server.sh or ./restart-server.sh"
