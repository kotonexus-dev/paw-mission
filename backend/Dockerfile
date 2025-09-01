# Simplified Dockerfile to fix Prisma permissions issue
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install prisma

# Copy application code
COPY . .

# Generate Prisma client as root - this ensures all files are accessible
RUN prisma generate

# Create cache directories with proper permissions
RUN mkdir -p /root/.cache /tmp && \
    chmod -R 755 /root/.cache /tmp

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Health check for ALB
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use production server without reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
