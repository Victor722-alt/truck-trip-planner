#!/bin/bash
set -e

echo "🚀 Starting Truck Trip Planner deployment..."

# Debug: Show environment
echo "🔍 Debugging environment..."
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "PWD: $(pwd)"

# Detect Python executable - try multiple methods
PYTHON=""

# Method 1: Check command availability
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
fi

# Method 2: Check common Python locations
if [ -z "$PYTHON" ]; then
    for py_path in \
        "/usr/bin/python3" \
        "/usr/local/bin/python3" \
        "/opt/homebrew/bin/python3" \
        "/usr/bin/python" \
        "/usr/local/bin/python" \
        "$HOME/.local/bin/python3" \
        "$HOME/.local/bin/python"
    do
        if [ -f "$py_path" ] && [ -x "$py_path" ]; then
            PYTHON="$py_path"
            echo "📌 Found Python at: $py_path"
            break
        fi
    done
fi

# Method 3: Use which/whereis if available
if [ -z "$PYTHON" ]; then
    if command -v which &> /dev/null; then
        PYTHON=$(which python3 2>/dev/null || which python 2>/dev/null || echo "")
    fi
fi

# Method 4: Check if there's a virtual environment
if [ -z "$PYTHON" ] && [ -d "venv" ]; then
    if [ -f "venv/bin/python" ]; then
        PYTHON="venv/bin/python"
        echo "📌 Using Python from venv"
    fi
fi

# Final check
if [ -z "$PYTHON" ] || ! $PYTHON --version &> /dev/null; then
    echo "❌ Error: Python not found. Please ensure Python is installed."
    echo "💡 Tip: Railpack may need Python to be installed via buildpacks or environment variables."
    exit 1
fi

echo "✅ Using Python: $PYTHON"
$PYTHON --version

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

