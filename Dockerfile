# Use official Python + uv image
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# Set working directory
WORKDIR /app

# Install system dependencies in separate layers for better caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies with uv (from lockfile)
RUN uv sync --frozen

# Copy only necessary application files (not everything)
COPY app/ ./app/
COPY DB/ ./DB/
COPY alembic/ ./alembic/
COPY alembic.ini ./
COPY main.py ./

# Copy and prepare scripts
COPY scripts/ ./scripts/
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
