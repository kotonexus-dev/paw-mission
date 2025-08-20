# Multi-stage build for production
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN groupadd --gid 1001 fastapi && \
    useradd --uid 1001 --gid fastapi --shell /bin/bash --create-home fastapi

# Copy dependencies from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=fastapi:fastapi . .

# Generate Prisma client as root
RUN prisma generate

# Create necessary directories with proper permissions  
RUN mkdir -p /tmp /app/.cache /home/fastapi/.cache /root/.cache && \
    chown -R fastapi:fastapi /tmp /app/.cache /home/fastapi/.cache && \
    chmod -R 755 /root/.cache

# Switch to non-root user
USER fastapi

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PRISMA_BINARIES_PATH=/home/fastapi/.cache/prisma-python
ENV XDG_CACHE_HOME=/home/fastapi/.cache

EXPOSE 8000

# Health check for ALB
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Use production server without reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
