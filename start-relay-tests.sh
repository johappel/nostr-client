#!/bin/bash

# Script to start the test server and open the relay test page
echo "🚀 Starting Nostr RelayManager Test Suite..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the framework if needed
echo "🔨 Building framework..."
cd framework
npm run build
cd ..

# Build tests if needed
echo "🔨 Building tests..."
cd tests
npm run build
cd ..

echo "🌐 Starting test server on http://localhost:3002..."
echo "📊 Relay tests will be available at: http://localhost:3002/relay"
echo ""
echo "The test will:"
echo "  ✅ Connect to real Nostr relays"
echo "  ✅ Query real events from the network" 
echo "  ✅ Create live subscriptions"
echo "  ✅ Test relay performance and connectivity"
echo ""
echo "Press Ctrl+C to stop the server"

# Start the test server
cd tests
npm run dev