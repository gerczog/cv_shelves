#!/bin/bash

# Application startup script with model checking
# Checks for ML models and downloads them if necessary

echo "🚀 Starting CV Shelves Backend..."

# Check and download models if needed
/app/scripts/download_models_docker.sh

# Start the application
echo "🌐 Starting FastAPI server..."
exec uv run uvicorn main:app --host 0.0.0.0 --port 8000
