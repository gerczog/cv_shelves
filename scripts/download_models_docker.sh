#!/bin/bash

# Script for checking and downloading models at container startup
# Automatically downloads models if they are missing

echo "🔍 Checking ML models availability..."

# Create directories if they don't exist
mkdir -p /app/app/data/ml_models/rfdetr
mkdir -p /app/app/data/ml_models/yolo

# Check for models
RF_DETR_MODEL="/app/app/data/ml_models/rfdetr/checkpoint_best_ema_01.pth"
YOLO_MODEL="/app/app/data/ml_models/yolo/best_01.pt"

models_missing=false

if [ ! -f "$RF_DETR_MODEL" ]; then
    echo "⚠️  RFDETR model not found: $RF_DETR_MODEL"
    models_missing=true
else
    echo "✅ RFDETR model found"
fi

if [ ! -f "$YOLO_MODEL" ]; then
    echo "⚠️  YOLO model not found: $YOLO_MODEL"
    models_missing=true
else
    echo "✅ YOLO model found"
fi

# If models are missing, download them
if [ "$models_missing" = true ]; then
    echo "🔄 Downloading missing models..."
    
    # Check for HF_TOKEN
    if [ -z "$HF_TOKEN" ]; then
        echo "❌ Error: HF_TOKEN is not set"
        echo "Set HF_TOKEN environment variable to download models"
        echo "Or provide models through volume mount"
        exit 1
    fi
    
    # Run download script
    uv run python /app/scripts/download_models.py
    
    echo "✅ Model download completed!"
else
    echo "✅ All models already present, download not required"
fi
