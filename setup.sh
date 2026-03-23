#!/bin/bash

set -e  # stop immediately if any command fails

echo "Setting up ResolveAI..."

# 1. Check .env
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "📄 Creating .env from .env.example..."
    cp .env.example .env
  else
    echo "❌ .env.example not found. Cannot continue."
    exit 1
  fi
else
  echo "⚠️ .env already exists. Skipping..."
fi

# 2. Backend setup
if [ -f "backend/requirements.txt" ]; then
  echo "Installing backend dependencies..."
  pip install -r backend/requirements.txt
fi

# 3. Frontend setup (if exists)
if [ -f "package.json" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

# 4. Docker setup
if command -v docker &> /dev/null; then
  echo "🐳 Docker detected."

  if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo "🚀 Starting services with Docker..."

    docker compose down
    docker compose up --build -d

    echo "✅ Backend services are running in Docker"
    echo "👉 Use: docker compose logs -f to view logs"
  else
    echo "❌ docker compose not found. Install Docker Desktop."
    exit 1
  fi

else
  echo "❌ Docker not installed. Cannot continue."
  exit 1
fi