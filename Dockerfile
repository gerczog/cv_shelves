# Use Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY pyproject.toml uv.lock ./

# Install uv for faster package management
RUN pip install uv

# Install Python dependencies
RUN uv sync --frozen

# Copy application code
COPY . .

# Copy scripts and make them executable
COPY scripts/run_migrations.sh /app/scripts/run_migrations.sh
COPY scripts/start_app.sh /app/scripts/start_app.sh
COPY scripts/download_models_docker.sh /app/scripts/download_models_docker.sh
RUN chmod +x /app/scripts/run_migrations.sh /app/scripts/start_app.sh /app/scripts/download_models_docker.sh

# Create necessary directories
RUN mkdir -p /app/app/data/ml_models/rfdetr
RUN mkdir -p /app/app/data/ml_models/yolo
RUN mkdir -p /app/logs

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with model checking
CMD ["/app/scripts/start_app.sh"]
