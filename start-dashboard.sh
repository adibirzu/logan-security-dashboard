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
