#!/bin/bash
set -e

echo "🚀 Starting Truck Trip Planner deployment..."

# Detect Python executable
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "❌ Error: Python not found. Please ensure Python is installed."
    exit 1
fi

echo "📌 Using Python: $PYTHON ($($PYTHON --version))"

# Navigate to backend directory
cd backend

# Install Python dependencies
echo "📦 Installing Python dependencies..."
$PYTHON -m pip install --upgrade pip
$PYTHON -m pip install -r requirements.txt

# Run database migrations
echo "🗄️  Running database migrations..."
$PYTHON manage.py migrate --noinput

# Collect static files
echo "📁 Collecting static files..."
$PYTHON manage.py collectstatic --noinput

# Navigate to frontend directory and build
echo "🏗️  Building React frontend..."
cd ../frontend

# Install Node dependencies
echo "📦 Installing Node dependencies..."
npm install

# Build React app
echo "🔨 Building React app..."
# Set API URL to relative path if not already set (since we're serving from same domain)
export REACT_APP_API_URL=${REACT_APP_API_URL:-/api/}
npm run build

# Copy built frontend to Django
echo "📋 Copying frontend build to Django..."
# Create templates directory for index.html
mkdir -p ../backend/templates
# Copy index.html to templates
cp build/index.html ../backend/templates/

# Create staticfiles directory and copy static assets
mkdir -p ../backend/staticfiles
# Copy all static assets (JS, CSS, etc.) from React build
if [ -d "build/static" ]; then
    cp -r build/static/* ../backend/staticfiles/ 2>/dev/null || true
fi
# Copy other root-level assets (favicon, manifest, etc.) if they exist
find build -maxdepth 1 -type f \( -name "*.ico" -o -name "*.json" -o -name "*.png" -o -name "*.svg" -o -name "*.webmanifest" \) -exec cp {} ../backend/staticfiles/ \; 2>/dev/null || true

# Go back to backend
cd ../backend

# Start Django server
echo "✅ Starting Django server..."
exec $PYTHON manage.py runserver 0.0.0.0:${PORT:-8000}

