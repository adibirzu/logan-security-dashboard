#!/bin/bash

# Logan Security Dashboard - Server Start Script
# This script kills any existing npm/node processes and starts the dashboard

set -e

echo "🚀 Starting Logan Security Dashboard..."
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

# Function to kill npm/node processes
kill_npm_processes() {
    echo "🧹 Cleaning up existing npm/node processes..."
    
    # Kill all npm processes
    pkill -f "npm" 2>/dev/null || true
    
    # Kill all node processes related to Next.js development
    pkill -f "next-server" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    
    # Kill any node processes running on common development ports
    for port in 3000 3001 3002 3003 3004 3005; do
        kill_port $port
    done
    
    echo "✅ Cleanup completed."
    sleep 1
}

# Function to start the development server
start_server() {
    echo "🚀 Starting development server..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        echo "❌ Error: package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Start the development server
    echo "🌟 Starting Next.js development server on http://localhost:3000"
    echo "   Press Ctrl+C to stop the server"
    echo ""
    
    npm run dev
}

# Main execution
echo "1️⃣  Cleaning up existing processes..."
kill_npm_processes

echo ""
echo "2️⃣  Starting development server..."
start_server
