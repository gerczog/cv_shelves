"""
Model loader utility for loading and managing ML models.
Supports RFDETR and YOLO models for computer vision tasks.
"""

import os
from pathlib import Path
from typing import Optional, Union
from ultralytics import YOLO
from rfdetr import RFDETRMedium


class ModelLoader:
    """Utility class for loading and managing ML models."""
    
    def __init__(self, models_dir: str = "app/data/ml_models"):
        """
        Initialize the model loader.
        
        Args:
            models_dir: Path to the directory containing model files
        """
        self.models_dir = Path(models_dir)
        self._rfdetr_model = None
        self._yolo_model = None
    
    def load_rfdetr_model(self, model_name: str = "checkpoint_best_ema_01.pth", device: str = "cpu") -> RFDETRMedium:
        """
        Load RFDETR model.
        
        Args:
            model_name: Name of the model file
            device: Device to run the model on ('cpu' or 'cuda')
            
        Returns:
            Loaded RFDETR model
        """
        model_path = self.models_dir / "rfdetr" / model_name
        
        if not model_path.exists():
            raise FileNotFoundError(f"RFDETR model not found at {model_path}")
        
        self._rfdetr_model = RFDETRMedium(
            pretrain_weights=str(model_path),
            device=device
        )
        
        return self._rfdetr_model
    
    def load_yolo_model(self, model_name: str = "best_01.pt", device: str = "cpu") -> YOLO:
        """
        Load YOLO model.
        
        Args:
            model_name: Name of the model file
            device: Device to run the model on ('cpu' or 'cuda')
            
        Returns:
            Loaded YOLO model
        """
        model_path = self.models_dir / "yolo" / model_name
        
        if not model_path.exists():
            raise FileNotFoundError(f"YOLO model not found at {model_path}")
        
        self._yolo_model = YOLO(str(model_path))
        
        return self._yolo_model
    
    def get_rfdetr_model(self) -> Optional[RFDETRMedium]:
        """Get the currently loaded RFDETR model."""
        return self._rfdetr_model
    
    def get_yolo_model(self) -> Optional[YOLO]:
        """Get the currently loaded YOLO model."""
        return self._yolo_model
    
    def is_rfdetr_loaded(self) -> bool:
        """Check if RFDETR model is loaded."""
        return self._rfdetr_model is not None
    
    def is_yolo_loaded(self) -> bool:
        """Check if YOLO model is loaded."""
        return self._yolo_model is not None


# Global model loader instance
model_loader = ModelLoader()

