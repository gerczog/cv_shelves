"""
Database schema definitions using SQLAlchemy
"""
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    """User model for storing user information"""
    __tablename__ = 'users'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # Hashed password
    email = Column(String(255), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)  # Super user status for admin access
    
    # Relationship to predictions
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")

class Prediction(Base):
    """Prediction model for storing ML model predictions"""
    __tablename__ = 'predictions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id'), nullable=True)
    model = Column(String(50), nullable=False)  # 'rfdetr', 'yolo', 'both'
    image_url = Column(Text, nullable=True)  # Optional URL for external images
    image_base64 = Column(Text, nullable=True)  # Base64 encoded image data
    image_hash = Column(String(64), nullable=True, index=True)  # Hash of the image for duplicate detection
    results = Column(JSON, nullable=False)  # Store detection results as JSON
    confidence = Column(Float, nullable=True)  # For single model predictions
    rfdetr_confidence = Column(Float, nullable=True)  # For both model predictions
    yolo_confidence = Column(Float, nullable=True)  # For both model predictions
    confidence_threshold = Column(Float, nullable=True)  # User-set confidence threshold
    rfdetr_threshold = Column(Float, nullable=True)  # RFDETR confidence threshold
    yolo_threshold = Column(Float, nullable=True)  # YOLO confidence threshold
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship to user
    user = relationship("User", back_populates="predictions")

class ModelInfo(Base):
    """Model information and metadata"""
    __tablename__ = 'model_info'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(100), unique=True, nullable=False)
    model_path = Column(String(500), nullable=False)
    model_type = Column(String(50), nullable=False)  # 'rfdetr', 'yolo'
    version = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
