# ==============================================================================
# EduFocus AI - Backend Dockerfile
# Production-ready container image for FastAPI AI & Blockchain backend
# ==============================================================================

FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DATABASE_PATH=/app/data/edufocus.db

WORKDIR /app

# Install minimal build essentials for cryptographic / native packages (e.g. web3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create directory for persistent SQLite database volume
RUN mkdir -p /app/data

# Copy backend application source code
COPY . /app/

# Expose backend service port
EXPOSE 8000

# Health check to ensure FastAPI is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start FastAPI uvicorn ASGI server with dynamic port support
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
