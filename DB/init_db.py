"""
Initialize local database with sample data
"""
import os
import sys
from datetime import datetime
from sqlalchemy.orm import Session
from .database import get_db_session, create_tables
from .schema import User, Prediction, ModelInfo

def init_database():
    """Initialize the database with tables and sample data"""
    print("Initializing database...")
    
    # Create all tables
    create_tables()
    print("✓ Tables created")
    
    db = get_db_session()
    try:
        # Create default users
        users_data = [
            {"username": "admin", "email": "admin@example.com"},
            {"username": "user1", "email": "user1@example.com"},
            {"username": "test_user", "email": "test@example.com"},
        ]
        
        for user_data in users_data:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                user = User(**user_data)
                db.add(user)
                print(f"✓ Created user: {user_data['username']}")
            else:
                print(f"✓ User already exists: {user_data['username']}")
        
        # Create model info entries
        models_data = [
            {
                "model_name": "rfdetr",
                "model_path": "app/data/ml_models/rfdetr/checkpoint_best_ema_01.pth",
                "model_type": "rfdetr",
                "version": "1.0",
                "description": "RFDETR model for shelf detection"
            },
            {
                "model_name": "yolo",
                "model_path": "app/data/ml_models/yolo/best_01.pt",
                "model_type": "yolo",
                "version": "1.0",
                "description": "YOLO model for object detection"
            }
        ]
        
        for model_data in models_data:
            existing_model = db.query(ModelInfo).filter(ModelInfo.model_name == model_data["model_name"]).first()
            if not existing_model:
                model = ModelInfo(**model_data)
                db.add(model)
                print(f"✓ Created model info: {model_data['model_name']}")
            else:
                print(f"✓ Model info already exists: {model_data['model_name']}")
        
        # Create some sample predictions with base64 images
        # Simple 1x1 pixel images in base64 format
        sample_base64_images = {
            "rfdetr": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "yolo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
            "both": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        }
        
        sample_predictions = [
            {
                "model": "rfdetr",
                "image_base64": sample_base64_images["rfdetr"],
                "results": {
                    "detections": [
                        {"class": "shelf", "confidence": 0.95, "bbox": [100, 100, 200, 200]},
                        {"class": "shelf", "confidence": 0.87, "bbox": [300, 150, 400, 250]}
                    ]
                },
                "confidence": 0.95,
                "comment": "Sample RFDETR prediction"
            },
            {
                "model": "yolo",
                "image_base64": sample_base64_images["yolo"],
                "results": {
                    "detections": [
                        {"class": "shelf", "confidence": 0.92, "bbox": [50, 50, 150, 150]},
                        {"class": "product", "confidence": 0.78, "bbox": [200, 200, 250, 300]}
                    ]
                },
                "confidence": 0.92,
                "comment": "Sample YOLO prediction"
            },
            {
                "model": "both",
                "image_base64": sample_base64_images["both"],
                "results": {
                    "rfdetr": {
                        "detections": [{"class": "shelf", "confidence": 0.88, "bbox": [100, 100, 200, 200]}]
                    },
                    "yolo": {
                        "detections": [{"class": "shelf", "confidence": 0.85, "bbox": [100, 100, 200, 200]}]
                    }
                },
                "rfdetr_confidence": 0.88,
                "yolo_confidence": 0.85,
                "comment": "Sample both models prediction"
            }
        ]
        
        # Get the first user to assign predictions to
        first_user = db.query(User).first()
        
        for pred_data in sample_predictions:
            prediction = Prediction(
                user_id=first_user.id if first_user else None,
                **pred_data
            )
            db.add(prediction)
            print(f"✓ Created sample prediction: {pred_data['model']}")
        
        db.commit()
        print("✓ Database initialized successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error initializing database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
