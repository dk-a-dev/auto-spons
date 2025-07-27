#!/bin/bash

# Auto-Spons Startup Script
echo "🚀 Starting Auto-Spons Application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start services
echo "📦 Building and starting services..."
docker-compose up --build

echo "✅ Auto-Spons is now running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "📚 API Documentation: http://localhost:5000/api/docs"
echo ""
echo "To stop the application, press Ctrl+C"
