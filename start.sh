#!/bin/bash

echo "🚀 Starting Truck Trip Planner — Benin Edition (FMCSA-Compliant Logs)"
echo "Time: $(date) | WAT: $(date -u +%Y-%m-%dT%H:%M:%SZ) | PWD: $(pwd)"

# Python should be available in Docker container
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi
echo "✅ Python: $(python3 --version)"

# ——— RUN MIGRATIONS ———
echo "🗄️ Running migrations..."
if python3 manage.py migrate --noinput; then
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migration failed, but continuing to start server..."
fi

# ——— START GUNICORN ———
echo "✅ Starting Gunicorn on PORT ${PORT:-8000}..."
echo "🔗 Server will be available at http://0.0.0.0:${PORT:-8000}"

# Use exec to replace shell process and keep container running
# This ensures gunicorn is PID 1 and receives signals properly
exec gunicorn backend.wsgi:application \
  --name "trucklog-benin" \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 3 \
  --worker-class sync \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --log-level info \
  --access-logfile "-" \
  --error-logfile "-" \
  --capture-output \
  --enable-stdio-inheritance
