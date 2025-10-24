"""
ML service for handling model predictions and inference.
Provides high-level interface for RFDETR and YOLO model operations.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional, Union


from app.utils.model_loader import model_loader


class MLService:
    """Service class for ML model operations."""
    
    def __init__(self):
        """Initialize the ML service."""
        self.model_loader = model_loader
    
    def predict_rfdetr(self, image_path: Union[str, Path], confidence_threshold: float = 0.5) -> Dict[str, Any]:
        """
        Run RFDETR prediction on an image.
        
        Args:
            image_path: Path to the input image
            confidence_threshold: Minimum confidence threshold for detections
            
        Returns:
            Dictionary containing detection results
        """
        # Load model if not already loaded
        if not self.model_loader.is_rfdetr_loaded():
            self.model_loader.load_rfdetr_model()
        
        model = self.model_loader.get_rfdetr_model()
        
        # Run prediction
        detections = model.predict(str(image_path))
        
        # Debug logging
        print(f"DEBUG: Raw detections: {detections}")
        print(f"DEBUG: Confidence values: {detections.confidence if hasattr(detections, 'confidence') else 'No confidence'}")
        print(f"DEBUG: Confidence threshold: {confidence_threshold}")
        
        # Filter by confidence threshold
        if hasattr(detections, 'confidence') and detections.confidence is not None and len(detections.confidence) > 0:
            mask = detections.confidence >= confidence_threshold
            filtered_detections = {
                'xyxy': detections.xyxy[mask].tolist() if detections.xyxy is not None and len(detections.xyxy) > 0 else [],
                'confidence': detections.confidence[mask].tolist() if detections.confidence is not None and len(detections.confidence) > 0 else [],
                'class_id': detections.class_id[mask].tolist() if detections.class_id is not None and len(detections.class_id) > 0 else [],
                'mask': detections.mask[mask] if detections.mask is not None and len(detections.mask) > 0 else None,
                'tracker_id': detections.tracker_id[mask] if detections.tracker_id is not None and len(detections.tracker_id) > 0 else None,
                'data': detections.data,
                'metadata': detections.metadata
            }
        else:
            # Convert to lists for JSON serialization
            filtered_detections = {
                'xyxy': detections.xyxy.tolist() if detections.xyxy is not None and len(detections.xyxy) > 0 else [],
                'confidence': detections.confidence.tolist() if detections.confidence is not None and len(detections.confidence) > 0 else [],
                'class_id': detections.class_id.tolist() if detections.class_id is not None and len(detections.class_id) > 0 else [],
                'mask': detections.mask,
                'tracker_id': detections.tracker_id,
                'data': detections.data,
                'metadata': detections.metadata
            }
        
        # Debug logging for filtered results
        print(f"DEBUG: Filtered detections: {filtered_detections}")
        print(f"DEBUG: Number of detections after filtering: {len(filtered_detections['xyxy'])}")
        
        # Calculate average confidence for the result
        confidences = filtered_detections.get('confidence', [])
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        # Convert to YOLO-like format (array of detection objects)
        detections_list = []
        xyxy_list = filtered_detections.get('xyxy', [])
        class_id_list = filtered_detections.get('class_id', [])
        
        for i in range(len(xyxy_list)):
            if i < len(confidences):
                detection = {
                    'xyxy': xyxy_list[i],
                    'confidence': confidences[i],
                    'class_id': class_id_list[i] if i < len(class_id_list) else 0,
                    'class_name': 'item'  # Default class name for RFDETR
                }
                detections_list.append(detection)
        
        # Return in YOLO format with additional metadata
        result = {
            'detections': detections_list,
            'confidence': avg_confidence,  # Average confidence for the whole result
            'model': 'rfdetr'
        }
        
        return result
    
    def predict_yolo(self, image_path: Union[str, Path], confidence_threshold: float = 0.4, 
                    save: bool = False, show: bool = False) -> List[Dict[str, Any]]:
        """
        Run YOLO prediction on an image.
        
        Args:
            image_path: Path to the input image
            confidence_threshold: Minimum confidence threshold for detections
            save: Whether to save the results
            show: Whether to show the results
            
        Returns:
            List of detection results
        """
        # Load model if not already loaded
        if not self.model_loader.is_yolo_loaded():
            self.model_loader.load_yolo_model()
        
        model = self.model_loader.get_yolo_model()
        
        # Run prediction
        results = model.predict(
            source=str(image_path),
            conf=confidence_threshold,
            save=save,
            show=show
        )
        
        # Convert results to a more usable format
        detections = []
        for result in results:
            if result.boxes is not None and len(result.boxes) > 0:
                # Get all detections at once for better performance
                xyxy = result.boxes.xyxy.cpu().numpy()
                conf = result.boxes.conf.cpu().numpy()
                cls = result.boxes.cls.cpu().numpy()
                
                for i in range(len(result.boxes)):
                    detection = {
                        'xyxy': xyxy[i].tolist(),
                        'confidence': float(conf[i]),
                        'class_id': int(cls[i]),
                        'class_name': result.names[int(cls[i])]
                    }
                    detections.append(detection)
        
        # Calculate average confidence
        avg_confidence = sum(d['confidence'] for d in detections) / len(detections) if detections else 0.0
        
        # Return in unified format
        result = {
            'detections': detections,
            'confidence': avg_confidence,  # Average confidence for the whole result
            'model': 'yolo'
        }
        
        return result
    
    def predict_yolo_raw(self, image_path: Union[str, Path], confidence_threshold: float = 0.4, 
                        save: bool = False, show: bool = False) -> List[Dict[str, Any]]:
        """
        Run YOLO prediction and return raw results structure.
        
        Args:
            image_path: Path to the input image
            confidence_threshold: Minimum confidence threshold for detections
            save: Whether to save the results
            show: Whether to show the results
            
        Returns:
            List of raw YOLO results with all attributes
        """
        # Load model if not already loaded
        if not self.model_loader.is_yolo_loaded():
            self.model_loader.load_yolo_model()
        
        model = self.model_loader.get_yolo_model()
        
        # Run prediction
        results = model.predict(
            source=str(image_path),
            conf=confidence_threshold,
            save=save,
            show=show
        )
        
        # Convert to raw format with all YOLO attributes
        raw_results = []
        for result in results:
            if result.boxes is not None and len(result.boxes) > 0:
                raw_result = {
                    'xyxy': result.boxes.xyxy.cpu().numpy().tolist(),
                    'xywh': result.boxes.xywh.cpu().numpy().tolist(),
                    'xyxyn': result.boxes.xyxyn.cpu().numpy().tolist(),
                    'xywhn': result.boxes.xywhn.cpu().numpy().tolist(),
                    'conf': result.boxes.conf.cpu().numpy().tolist(),
                    'cls': result.boxes.cls.cpu().numpy().tolist(),
                    'data': result.boxes.data.cpu().numpy().tolist(),
                    'orig_shape': result.boxes.orig_shape,
                    'shape': list(result.boxes.shape),
                    'is_track': result.boxes.is_track,
                    'id': result.boxes.id.cpu().numpy().tolist() if result.boxes.id is not None else None,
                    'names': result.names
                }
                raw_results.append(raw_result)
        
        return raw_results
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about available models.
        
        Returns:
            Dictionary containing model information
        """
        info = {
            'rfdetr': {
                'loaded': self.model_loader.is_rfdetr_loaded(),
                'model_path': str(self.model_loader.models_dir / "rfdetr"),
                'available_files': []
            },
            'yolo': {
                'loaded': self.model_loader.is_yolo_loaded(),
                'model_path': str(self.model_loader.models_dir / "yolo"),
                'available_files': []
            }
        }
        
        # Check available model files
        rfdetr_dir = self.model_loader.models_dir / "rfdetr"
        if rfdetr_dir.exists():
            info['rfdetr']['available_files'] = [f.name for f in rfdetr_dir.iterdir() if f.is_file()]
        
        yolo_dir = self.model_loader.models_dir / "yolo"
        if yolo_dir.exists():
            info['yolo']['available_files'] = [f.name for f in yolo_dir.iterdir() if f.is_file()]
        
        return info


# Global ML service instance
ml_service = MLService()

