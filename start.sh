#!/bin/bash
set -e

echo "🚀 Starting Truck Trip Planner — Benin Edition (FMCSA-Compliant Logs)"
echo "Time: $(date) | WAT: $(date -u +%Y-%m-%dT%H:%M:%SZ) | PWD: $(pwd)"

# ——— VERIFY RUNTIMES (Railway installs via nixpacks.toml) ———
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found — ensure nixpacks.toml has 'python312'"
    exit 1
fi
echo "✅ Python: $(python3 --version)"

if ! command -v node &> /dev/null; then
    echo "❌ Node not found — ensure nixpacks.toml has 'nodejs_20'"
    exit 1
fi
echo "✅ Node: $(node --version)"

# ——— 1. BACKEND: Install deps, migrate, collect static ———
echo "📦 Installing Python deps..."
cd backend
python3 -m pip install --upgrade pip --quiet
python3 -m pip install -r requirements.txt --no-cache-dir --quiet

echo "🗄️ Running migrations..."
python3 manage.py migrate --noinput

echo "📁 Collecting static files..."
python3 manage.py collectstatic --noinput --clear

# ——— 2. FRONTEND: Build React ———
echo "🏗️ Building React..."
cd ../frontend
npm ci --silent  # Faster than npm install
export REACT_APP_API_URL=${REACT_APP_API_URL:-/api/}
npm run build --silent

# ——— 3. COPY REACT TO DJANGO (Django serves SPA) ———
echo "📋 Copying React build to Django..."
mkdir -p ../backend/templates
cp build/index.html ../backend/templates/index.html || true
mkdir -p ../backend/staticfiles
if [ -d "build/static" ]; then
    cp -r build/static/* ../backend/staticfiles/ 2>/dev/null || true
fi
# Copy root assets (favicon, manifest, etc.)
find build -maxdepth 1 -type f \( -name "*.ico" -o -name "*.json" -o -name "*.png" -o -name "*.svg" -o -name "*.webmanifest" \) -exec cp {} ../backend/staticfiles/ \; 2>/dev/null || true

# ——— 4. START GUNICORN (Production Server) ———
echo "✅ Starting Gunicorn on PORT $PORT..."
cd ../backend

# Replace 'backend' with your actual Django project name (e.g., 'truckplanner' from wsgi.py)
exec gunicorn backend.wsgi:application \
  --name "trucklog-benin" \
  --bind "0.0.0.0:$PORT" \
  --workers 3 \
  --worker-class sync \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --log-level info \
  --access-logfile "-" \
  --error-logfile "-"