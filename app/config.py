"""
Configuration settings for the CV Shelves backend application.
Contains model paths, default parameters, and other configuration options.
"""

import os
from pathlib import Path
from typing import Dict, Any


class Config:
    """Configuration class for the application."""
    
    # Base paths
    BASE_DIR = Path(__file__).parent.parent
    MODELS_DIR = BASE_DIR / "app" / "data" / "ml_models"
    
    # Model configurations
    RFDETR_CONFIG = {
        "model_name": "checkpoint_best_ema_01.pth",
        "device": "cpu",  # Change to "cuda" if GPU is available
        "default_confidence_threshold": 0.5
    }
    
    YOLO_CONFIG = {
        "model_name": "best_01.pt",
        "device": "cpu",  # Change to "cuda" if GPU is available
        "default_confidence_threshold": 0.4,
        "default_save": False,
        "default_show": False
    }
    
    # API configuration
    API_CONFIG = {
        "title": "CV Shelves Backend",
        "description": "ML Backend service for CV Shelves application with RFDETR and YOLO models",
        "version": "0.1.0",
        "prefix": "/api/ml"
    }
    
    # CORS configuration
    CORS_CONFIG = {
        "allow_origins": ["*"],  # Configure properly for production
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"]
    }
    
    # Database configuration
    DB_CONFIG = {
        "url": str((BASE_DIR / "shelf_detection.db").absolute()),
        "echo": False,
    }
    
    # File upload configuration
    UPLOAD_CONFIG = {
        "max_file_size": int(os.getenv("MAX_FILE_SIZE_MB", "50")) * 1024 * 1024,  # Default 50MB, configurable via env
        "allowed_extensions": [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".webp"],
        "temp_dir": "/tmp"
    }
    
    @classmethod
    def get_model_path(cls, model_type: str) -> Path:
        """
        Get the full path to a model file.
        
        Args:
            model_type: Type of model ('rfdetr' or 'yolo')
            
        Returns:
            Path to the model file
        """
        if model_type.lower() == "rfdetr":
            return cls.MODELS_DIR / "rfdetr" / cls.RFDETR_CONFIG["model_name"]
        elif model_type.lower() == "yolo":
            return cls.MODELS_DIR / "yolo" / cls.YOLO_CONFIG["model_name"]
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    @classmethod
    def validate_model_files(cls) -> Dict[str, bool]:
        """
        Validate that all required model files exist.
        
        Returns:
            Dictionary with validation results for each model
        """
        validation_results = {}
        
        # Check RFDETR model
        rfdetr_path = cls.get_model_path("rfdetr")
        validation_results["rfdetr"] = rfdetr_path.exists()
        
        # Check YOLO model
        yolo_path = cls.get_model_path("yolo")
        validation_results["yolo"] = yolo_path.exists()
        
        return validation_results
    
    @classmethod
    def get_environment_config(cls) -> Dict[str, Any]:
        """
        Get configuration from environment variables.
        
        Returns:
            Dictionary with environment-based configuration
        """
        return {
            "device": os.getenv("ML_DEVICE", "cpu"),
            "rfdetr_confidence": float(os.getenv("RFDETR_CONFIDENCE", "0.5")),
            "yolo_confidence": float(os.getenv("YOLO_CONFIDENCE", "0.4")),
            "debug": os.getenv("DEBUG", "false").lower() == "true"
        }


# Global configuration instance
config = Config()

