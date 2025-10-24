"""
CRUD operations for database models
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc
from .schema import User, Prediction, ModelInfo
from datetime import datetime
import bcrypt

class UserCRUD:
    """CRUD operations for User model"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    @staticmethod
    def create_user(db: Session, username: str, password: str, email: str = None, is_superuser: bool = False) -> User:
        """Create a new user with hashed password"""
        password_hash = UserCRUD.hash_password(password)
        user = User(username=username, password_hash=password_hash, email=email, is_superuser=is_superuser)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        user = db.query(User).filter(User.username == username).first()
        if user and UserCRUD.verify_password(password, user.password_hash):
            return user
        return None
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_all_users(db: Session) -> List[User]:
        """Get all users"""
        return db.query(User).all()
    
    @staticmethod
    def get_superusers(db: Session) -> List[User]:
        """Get all superusers"""
        return db.query(User).filter(User.is_superuser == True).all()
    
    @staticmethod
    def make_superuser(db: Session, user_id: str) -> bool:
        """Make user a superuser"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_superuser = True
            db.commit()
            return True
        return False
    
    @staticmethod
    def remove_superuser(db: Session, user_id: str) -> bool:
        """Remove superuser status from user"""
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_superuser = False
            db.commit()
            return True
        return False

class PredictionCRUD:
    """CRUD operations for Prediction model"""
    
    @staticmethod
    def create_prediction(
        db: Session,
        model: str,
        results: Dict[str, Any],
        user_id: str = None,
        image_url: str = None,
        image_base64: str = None,
        image_hash: str = None,
        confidence: float = None,
        rfdetr_confidence: float = None,
        yolo_confidence: float = None,
        confidence_threshold: float = None,
        rfdetr_threshold: float = None,
        yolo_threshold: float = None,
        comment: str = None
    ) -> Prediction:
        """Create a new prediction"""
        prediction = Prediction(
            user_id=user_id,
            model=model,
            image_url=image_url,
            image_base64=image_base64,
            image_hash=image_hash,
            results=results,
            confidence=confidence,
            rfdetr_confidence=rfdetr_confidence,
            yolo_confidence=yolo_confidence,
            confidence_threshold=confidence_threshold,
            rfdetr_threshold=rfdetr_threshold,
            yolo_threshold=yolo_threshold,
            comment=comment
        )
        db.add(prediction)
        db.commit()
        db.refresh(prediction)
        return prediction
    
    @staticmethod
    def get_prediction_by_id(db: Session, prediction_id: str) -> Optional[Prediction]:
        """Get prediction by ID"""
        return db.query(Prediction).options(joinedload(Prediction.user)).filter(Prediction.id == prediction_id).first()
    
    @staticmethod
    def get_predictions(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        user_id: str = None,
        model: str = None,
        search_text: str = None,
        min_confidence: float = None,
        max_confidence: float = None
    ) -> List[Prediction]:
        """Get predictions with filters"""
        query = db.query(Prediction)
        
        # Apply filters
        if user_id:
            query = query.filter(Prediction.user_id == user_id)
        
        if model and model != 'all':
            query = query.filter(Prediction.model == model)
        
        if search_text:
            query = query.filter(
                or_(
                    Prediction.comment.ilike(f"%{search_text}%"),
                    User.username.ilike(f"%{search_text}%"),
                    Prediction.id.ilike(f"%{search_text}%")
                )
            ).join(User, Prediction.user_id == User.id, isouter=True)
        
        if min_confidence is not None or max_confidence is not None:
            confidence_filter = []
            if min_confidence is not None:
                confidence_filter.append(Prediction.confidence >= min_confidence)
            if max_confidence is not None:
                confidence_filter.append(Prediction.confidence <= max_confidence)
            
            if confidence_filter:
                query = query.filter(and_(*confidence_filter))
        
        return query.options(joinedload(Prediction.user)).order_by(desc(Prediction.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_prediction_comment(db: Session, prediction_id: str, comment: str) -> Optional[Prediction]:
        """Update prediction comment"""
        prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if prediction:
            prediction.comment = comment
            db.commit()
            db.refresh(prediction)
        return prediction
    
    @staticmethod
    def delete_prediction(db: Session, prediction_id: str) -> bool:
        """Delete prediction"""
        prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if prediction:
            db.delete(prediction)
            db.commit()
            return True
        return False
    
    @staticmethod
    def get_predictions_count(db: Session) -> int:
        """Get total count of predictions"""
        return db.query(Prediction).count()
    
    @staticmethod
    def get_predictions_by_model(db: Session, model: str) -> int:
        """Get count of predictions by model"""
        return db.query(Prediction).filter(Prediction.model == model).count()

class ModelInfoCRUD:
    """CRUD operations for ModelInfo model"""
    
    @staticmethod
    def create_model_info(
        db: Session,
        model_name: str,
        model_path: str,
        model_type: str,
        version: str = None,
        description: str = None
    ) -> ModelInfo:
        """Create new model info"""
        model_info = ModelInfo(
            model_name=model_name,
            model_path=model_path,
            model_type=model_type,
            version=version,
            description=description
        )
        db.add(model_info)
        db.commit()
        db.refresh(model_info)
        return model_info
    
    @staticmethod
    def get_all_models(db: Session) -> List[ModelInfo]:
        """Get all model info"""
        return db.query(ModelInfo).filter(ModelInfo.is_active == True).all()
    
    @staticmethod
    def get_model_by_name(db: Session, model_name: str) -> Optional[ModelInfo]:
        """Get model info by name"""
        return db.query(ModelInfo).filter(ModelInfo.model_name == model_name).first()
