# Use official Python + uv image
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies (compiler, PostgreSQL, OpenCV deps, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    postgresql-client \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies with uv (from lockfile)
RUN uv sync --frozen

# Copy the full project
COPY . .

# Copy and prepare scripts
COPY scripts/run_migrations.sh /app/scripts/run_migrations.sh
COPY scripts/start_app.sh /app/scripts/start_app.sh
COPY scripts/download_models_docker.sh /app/scripts/download_models_docker.sh
RUN chmod +x /app/scripts/*.sh

# Create necessary directories
RUN mkdir -p /app/app/data/ml_models/rfdetr \
             /app/app/data/ml_models/yolo \
             /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the app
CMD ["/app/scripts/start_app.sh"]
