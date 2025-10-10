@echo off
REM Script to start the test server and open the relay test page
echo 🚀 Starting Nostr RelayManager Test Suite...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: package.json not found. Please run this script from the project root.
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Build the framework if needed
echo 🔨 Building framework...
cd framework
call npm run build
cd ..

REM Build tests if needed  
echo 🔨 Building tests...
cd tests
call npm run build
cd ..

echo 🌐 Starting test server on http://localhost:3002...
echo 📊 Relay tests will be available at: http://localhost:3002/relay
echo.
echo The test will:
echo   ✅ Connect to real Nostr relays
echo   ✅ Query real events from the network
echo   ✅ Create live subscriptions
echo   ✅ Test relay performance and connectivity
echo.
echo Press Ctrl+C to stop the server

REM Start the test server
cd tests
npm run dev