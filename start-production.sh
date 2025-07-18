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
