#!/bin/bash
set -e

echo "🚀 Starting Truck Trip Planner — Benin Edition (FMCSA-Compliant Logs)"
echo "Time: $(date) | WAT: $(date -u +%Y-%m-%dT%H:%M:%SZ) | PWD: $(pwd)"

# ——— SOURCE NIX ENVIRONMENT (Nixpacks installs packages via Nix) ———
# Nixpacks uses Nix, so we need to ensure the environment is set up
if [ -f /nix/var/nix/profiles/default/etc/profile.d/nix.sh ]; then
    source /nix/var/nix/profiles/default/etc/profile.d/nix.sh
fi

# Try to find Python - Nixpacks should have it in PATH, but let's be thorough
if ! command -v python3 &> /dev/null; then
    # Method 1: Check Nix store using find (more reliable than glob)
    PYTHON_PATH=$(find /nix/store -name python3 -type f -executable 2>/dev/null | head -1)
    if [ -n "$PYTHON_PATH" ] && [ -x "$PYTHON_PATH" ]; then
        export PATH="$(dirname "$PYTHON_PATH"):$PATH"
        echo "📌 Found Python in Nix store: $PYTHON_PATH"
    fi
fi

# Method 2: Check common system locations
if ! command -v python3 &> /dev/null; then
    for py_path in \
        "/usr/bin/python3" \
        "/usr/local/bin/python3" \
        "$HOME/.nix-profile/bin/python3" \
        "/nix/var/nix/profiles/default/bin/python3"
    do
        if [ -f "$py_path" ] && [ -x "$py_path" ] 2>/dev/null; then
            export PATH="$(dirname "$py_path"):$PATH"
            echo "📌 Found Python at: $py_path"
            break
        fi
    done
fi

# ——— VERIFY RUNTIMES (Railway installs via nixpacks.toml) ———
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found — checking environment..."
    echo "PATH: $PATH"
    echo "Available in /usr/bin: $(ls -la /usr/bin/python* 2>/dev/null || echo 'none')"
    echo "Available in /nix/store: $(find /nix/store -name python3 -type f 2>/dev/null | head -3 || echo 'none')"
    exit 1
fi
echo "✅ Python: $(python3 --version) at $(which python3)"

if ! command -v node &> /dev/null; then
    echo "❌ Node not found — ensure nixpacks.toml has 'nodejs_20'"
    exit 1
fi
echo "✅ Node: $(node --version) at $(which node)"

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