#!/bin/bash

# Truck Trip Planner Setup Script

echo "Setting up Truck Trip Planner..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cat > .env << EOF
# Django Settings
SECRET_KEY=dev-key-change-in-production-$(openssl rand -hex 32)
DEBUG=1

# Database Settings
DB_HOST=db
DB_NAME=truckdb
DB_USER=truckuser
DB_PASS=truckpass123

# OpenRouteService API Key (optional, for better routing)
ORS_API_KEY=your_ors_key_here
EOF
    echo ".env file created!"
else
    echo ".env file already exists, skipping..."
fi

# Build and start containers
echo "Building and starting Docker containers..."
docker-compose up --build -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Run migrations
echo "Running database migrations..."
docker-compose exec -T backend python manage.py migrate

echo ""
echo "Setup complete!"
echo ""
echo "Access the application at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend: http://localhost:8000"
echo "  Admin: http://localhost:8000/admin"
echo ""
echo "To create a superuser, run:"
echo "  docker-compose exec backend python manage.py createsuperuser"

