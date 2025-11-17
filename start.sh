#!/bin/bash
set -e

echo "Starting Truck Trip Planner Benin Edition (FMCSA-Compliant)"
echo "Time: $(date) | Country: Benin (WAT)"

# ——— 1. Verify Python & Node are available (Railway guarantees this with nixpacks.toml) ———
echo "Python version:"
python3 --version

echo "Node version:"
node --version

# ——— 2. Backend: Install Python deps, migrate, collect static ———
echo "Installing Python dependencies..."
cd backend
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt --no-cache-dir

echo "Running database migrations..."
python3 manage.py migrate --noinput

echo "Collecting static files..."
python3 manage.py collectstatic --noinput --clear --no-input

# ——— 3. Frontend: Build React app ———
echo "Building React frontend..."
cd ../frontend
npm install --silent
npm run build

# Set API URL to same domain (important for production)
export REACT_APP_API_URL=/api/

# ——— 4. Serve React build from Django (so Django handles all routes) ———
echo "Copying React build to Django..."
cp -r build/* ../backend/ || true
cp -r build/static/* ../backend/staticfiles/ 2>/dev/null || true

# ——— 5. Start Django with Gunicorn (production server) ———
echo "Starting Gunicorn on port $PORT..."

# Replace "backend" with your actual Django project name (check backend/backend/wsgi.py)
# Common names: backend, truckplanner, config, myproject → change below if needed
exec gunicorn backend.wsgi:application \
  --name trucklog-benin \
  --bind 0.0.0.0:$PORT \
  --workers 3 \
  --worker-class sync \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --log-level=info \
  --access-logfile - \
  --error-logfile -