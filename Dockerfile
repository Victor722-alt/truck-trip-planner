# Multi-stage build for Django + React
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ARG REACT_APP_API_URL=/api/
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Python/Django stage
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend-build/

# Organize frontend files: index.html to templates, static assets to staticfiles
RUN mkdir -p templates staticfiles && \
    cp frontend-build/index.html templates/ && \
    if [ -d frontend-build/static ]; then \
        cp -r frontend-build/static/* staticfiles/; \
    fi && \
    find frontend-build -maxdepth 1 -type f \( -name "*.ico" -o -name "*.json" -o -name "*.png" -o -name "*.svg" -o -name "*.webmanifest" \) -exec cp {} staticfiles/ \; 2>/dev/null || true && \
    rm -rf frontend-build

# Collect Django static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Use start script for migrations and server startup
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
