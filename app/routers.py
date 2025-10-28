"""
API routers for the CV Shelves backend application.
Contains endpoints for ML model predictions and model management.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
import tempfile
import os
import base64
from pathlib import Path
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.services.ml_service import ml_service
from app.middleware import get_current_user, get_optional_user, get_superuser
from DB.database import get_db
from DB.crud import PredictionCRUD, UserCRUD, ModelInfoCRUD
from DB.schema import Prediction, User

# Pydantic models for authentication
class UserRegister(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    user_id: str
    username: str
    email: Optional[str]
    message: str

# Create router instances
ml_router = APIRouter(prefix="/v1/api/ml", tags=["Machine Learning"])
history_router = APIRouter(prefix="/v1/api/history", tags=["History"])
auth_router = APIRouter(prefix="/v1/api/auth", tags=["Authentication"])


def validate_image_file(image: UploadFile) -> None:
    """
    Validate that the uploaded file is an image and within size limits.
    
    Args:
        image: Uploaded file to validate
        
    Raises:
        HTTPException: If file is not a valid image or exceeds size limit
    """
    from app.config import Config
    
    # Check file size first
    if hasattr(image, 'size') and image.size is not None:
        if image.size > Config.UPLOAD_CONFIG["max_file_size"]:
            max_size_mb = Config.UPLOAD_CONFIG["max_file_size"] / (1024 * 1024)
            raise HTTPException(
                status_code=413, 
                detail=f"File size exceeds maximum allowed size of {max_size_mb:.1f}MB"
            )
    
    # Check content type first
    if image.content_type is not None and image.content_type.startswith('image/'):
        return
    
    # Fallback: check file extension
    if image.filename:
        file_ext = Path(image.filename).suffix.lower()
        valid_extensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']
        if file_ext in valid_extensions:
            return
    
    raise HTTPException(status_code=400, detail="File must be an image")


def image_to_base64(image_path: str) -> str:
    """
    Convert image file to base64 string.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Base64 encoded string with data URL prefix
    """
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        # Determine MIME type from file extension
        file_ext = Path(image_path).suffix.lower()
        mime_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.bmp': 'image/bmp',
            '.tiff': 'image/tiff',
            '.tif': 'image/tiff'
        }
        mime_type = mime_types.get(file_ext, 'image/jpeg')
        return f"data:{mime_type};base64,{encoded_string}"


def generate_image_hash(image_path: str) -> str:
    """Generate SHA-256 hash of image file for duplicate detection"""
    import hashlib
    with open(image_path, "rb") as image_file:
        return hashlib.sha256(image_file.read()).hexdigest()


@ml_router.get("/models/info")
async def get_model_info(current_user: User = Depends(get_current_user)):
    """
    Get information about available models and their status.
    
    Returns:
        Dictionary containing model information
    """
    try:
        info = ml_service.get_model_info()
        return JSONResponse(content=info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")


@ml_router.get("/config")
async def get_config(current_user: User = Depends(get_current_user)):
    """
    Get application configuration including file upload limits.
    
    Returns:
        Dictionary containing configuration information
    """
    try:
        from app.config import Config
        
        config_info = {
            "upload": {
                "max_file_size_mb": Config.UPLOAD_CONFIG["max_file_size"] / (1024 * 1024),
                "max_file_size_bytes": Config.UPLOAD_CONFIG["max_file_size"],
                "allowed_extensions": Config.UPLOAD_CONFIG["allowed_extensions"]
            },
            "models": {
                "rfdetr": {
                    "default_confidence_threshold": Config.RFDETR_CONFIG["default_confidence_threshold"]
                },
                "yolo": {
                    "default_confidence_threshold": Config.YOLO_CONFIG["default_confidence_threshold"]
                }
            }
        }
        
        return JSONResponse(content=config_info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting config: {str(e)}")


@ml_router.post("/predict/rfdetr")
async def predict_rfdetr(
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.1),
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run RFDETR prediction on uploaded image.
    
    Args:
        image: Uploaded image file
        confidence_threshold: Minimum confidence threshold for detections
        user_id: Optional user ID for saving prediction
        comment: Optional comment for the prediction
        
    Returns:
        Dictionary containing detection results
    """
    try:
        # Validate file type
        validate_image_file(image)
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(image.filename).suffix) as tmp_file:
            content = await image.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Run prediction
            results = ml_service.predict_rfdetr(tmp_file_path, confidence_threshold)
            
            # Convert image to base64
            image_base64 = image_to_base64(tmp_file_path)
            
            # Generate image hash for duplicate detection
            image_hash = generate_image_hash(tmp_file_path)
            
            # Check for duplicates
            duplicate_query = db.query(Prediction).filter(
                Prediction.image_hash == image_hash,
                Prediction.model == "rfdetr",
                Prediction.rfdetr_threshold == confidence_threshold
            )
            duplicate = duplicate_query.first()
            if duplicate:
                return JSONResponse(content={
                    "error": "Duplicate prediction found", 
                    "is_duplicate": True,
                    "duplicate_id": duplicate.id
                })
            
            # Save prediction to database
            prediction = PredictionCRUD.create_prediction(
                db=db,
                model="rfdetr",
                results=results,
                user_id=current_user.id,
                image_base64=image_base64,
                image_hash=image_hash,
                confidence=results.get('confidence', 0.0),
                confidence_threshold=confidence_threshold,
                rfdetr_threshold=confidence_threshold,
                comment=comment
            )
            
            # Add prediction ID and image_base64 to results
            results['prediction_id'] = prediction.id
            results['image_base64'] = image_base64
            
            return JSONResponse(content=results)
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running RFDETR prediction: {str(e)}")


@ml_router.post("/predict/yolo")
async def predict_yolo(
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.4),
    save: bool = Form(False),
    show: bool = Form(False),
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run YOLO prediction on uploaded image.
    
    Args:
        image: Uploaded image file
        confidence_threshold: Minimum confidence threshold for detections
        save: Whether to save the results
        show: Whether to show the results
        user_id: Optional user ID for saving prediction
        comment: Optional comment for the prediction
        
    Returns:
        List of detection results
    """
    try:
        # Validate file type
        validate_image_file(image)
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(image.filename).suffix) as tmp_file:
            content = await image.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Run prediction
            results = ml_service.predict_yolo(
                tmp_file_path, 
                confidence_threshold, 
                save, 
                show
            )
            
            # Convert image to base64
            image_base64 = image_to_base64(tmp_file_path)
            
            # Generate image hash for duplicate detection
            image_hash = generate_image_hash(tmp_file_path)
            
            # Check for duplicates
            duplicate_query = db.query(Prediction).filter(
                Prediction.image_hash == image_hash,
                Prediction.model == "yolo",
                Prediction.yolo_threshold == confidence_threshold
            )
            duplicate = duplicate_query.first()
            if duplicate:
                return JSONResponse(content={
                    "error": "Duplicate prediction found", 
                    "is_duplicate": True,
                    "duplicate_id": duplicate.id
                })
            
            # Save prediction to database
            prediction = PredictionCRUD.create_prediction(
                db=db,
                model="yolo",
                results=results,
                user_id=current_user.id,
                image_base64=image_base64,
                image_hash=image_hash,
                confidence=results.get('confidence', 0.0),
                confidence_threshold=confidence_threshold,
                yolo_threshold=confidence_threshold,
                comment=comment
            )
            
            # Add prediction ID and image_base64 to results
            results['prediction_id'] = prediction.id
            results['image_base64'] = image_base64
            
            return JSONResponse(content=results)
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running YOLO prediction: {str(e)}")




@ml_router.post("/predict/both")
async def predict_both(
    image: UploadFile = File(...),
    rfdetr_confidence_threshold: float = Form(0.1),
    yolo_confidence_threshold: float = Form(0.4),
    comment: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run both RFDETR and YOLO predictions on uploaded image.
    
    Args:
        image: Uploaded image file
        rfdetr_confidence_threshold: Minimum confidence threshold for RFDETR detections
        yolo_confidence_threshold: Minimum confidence threshold for YOLO detections
        user_id: Optional user ID for saving prediction
        comment: Optional comment for the prediction
        
    Returns:
        Dictionary containing combined detection results
    """
    try:
        # Validate file type
        validate_image_file(image)
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(image.filename).suffix) as tmp_file:
            content = await image.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            # Run both predictions
            rfdetr_results = ml_service.predict_rfdetr(tmp_file_path, rfdetr_confidence_threshold)
            yolo_results = ml_service.predict_yolo(tmp_file_path, yolo_confidence_threshold)
            
            # Convert image to base64
            image_base64 = image_to_base64(tmp_file_path)
            
            # Generate image hash for duplicate detection
            image_hash = generate_image_hash(tmp_file_path)
            
            # Check for duplicates
            duplicate_query = db.query(Prediction).filter(
                Prediction.image_hash == image_hash,
                Prediction.model == "both",
                Prediction.rfdetr_threshold == rfdetr_confidence_threshold,
                Prediction.yolo_threshold == yolo_confidence_threshold
            )
            duplicate = duplicate_query.first()
            if duplicate:
                return JSONResponse(content={
                    "error": "Duplicate prediction found", 
                    "is_duplicate": True,
                    "duplicate_id": duplicate.id
                })
            
            # Create combined results
            combined_results = {
                "rfdetr": rfdetr_results,
                "yolo": yolo_results
            }
            
            # Save prediction to database
            prediction = PredictionCRUD.create_prediction(
                db=db,
                model="both",
                results=combined_results,
                user_id=current_user.id,
                image_base64=image_base64,
                image_hash=image_hash,
                confidence=None,  # No single confidence for combined results
                rfdetr_confidence=rfdetr_results.get('confidence', 0.0),
                yolo_confidence=yolo_results.get('confidence', 0.0),
                confidence_threshold=None,  # No single threshold for combined results
                rfdetr_threshold=rfdetr_confidence_threshold,
                yolo_threshold=yolo_confidence_threshold,
                comment=comment
            )
            
            # Add prediction ID and image_base64 to results
            combined_results['prediction_id'] = prediction.id
            combined_results['image_base64'] = image_base64
            
            return JSONResponse(content=combined_results)
        
        finally:
            # Clean up temporary file
            os.unlink(tmp_file_path)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running combined prediction: {str(e)}")


@ml_router.get("/health")
async def health_check(current_user: User = Depends(get_current_user)):
    """
    Health check endpoint for ML service.
    
    Returns:
        Status of the ML service
    """
    try:
        model_info = ml_service.get_model_info()
        return JSONResponse(content={
            "status": "healthy",
            "models": {
                "rfdetr_loaded": model_info["rfdetr"]["loaded"],
                "yolo_loaded": model_info["yolo"]["loaded"]
            }
        })
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "unhealthy", "error": str(e)}
        )


# History API endpoints

@history_router.get("/check-duplicate")
async def check_duplicate(
    image_hash: str = Query(..., description="Image hash to check"),
    model: str = Query(..., description="Model type"),
    rfdetr_threshold: Optional[float] = Query(None, description="RFDETR confidence threshold"),
    yolo_threshold: Optional[float] = Query(None, description="YOLO confidence threshold"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a prediction with the same image hash and parameters already exists.
    
    Returns:
        Boolean indicating if duplicate exists
    """
    try:
        # Build query based on model type
        query = db.query(Prediction).filter(
            Prediction.image_hash == image_hash,
            Prediction.model == model
        )
        
        if model == 'rfdetr':
            query = query.filter(Prediction.rfdetr_threshold == rfdetr_threshold)
        elif model == 'yolo':
            query = query.filter(Prediction.yolo_threshold == yolo_threshold)
        elif model == 'both':
            if rfdetr_threshold is not None:
                query = query.filter(Prediction.rfdetr_threshold == rfdetr_threshold)
            if yolo_threshold is not None:
                query = query.filter(Prediction.yolo_threshold == yolo_threshold)
        
        duplicate = query.first()
        if duplicate:
            return JSONResponse(content={
                "is_duplicate": True,
                "duplicate_id": duplicate.id
            })
        else:
            return JSONResponse(content={"is_duplicate": False})
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking duplicate: {str(e)}")


@history_router.get("/predictions")
async def get_predictions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    model: Optional[str] = Query(None, description="Filter by model type"),
    search_text: Optional[str] = Query(None, description="Search in comments and usernames"),
    min_confidence: Optional[float] = Query(None, ge=0, le=1, description="Minimum confidence threshold"),
    max_confidence: Optional[float] = Query(None, ge=0, le=1, description="Maximum confidence threshold"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get predictions with optional filtering.
    
    Returns:
        List of predictions with pagination and filtering
    """
    try:
        predictions = PredictionCRUD.get_predictions(
            db=db,
            skip=skip,
            limit=limit,
            user_id=user_id,
            model=model,
            search_text=search_text,
            min_confidence=min_confidence,
            max_confidence=max_confidence
        )
        
        # Convert to dict format for JSON response
        result = []
        if predictions:  # Check if predictions exist
            for pred in predictions:
                pred_dict = {
                    "id": pred.id,
                    "model": pred.model,
                    "imageUrl": pred.image_url,
                    "imageBase64": pred.image_base64,
                    "results": pred.results,
                    "confidence": pred.confidence,
                    "rfdetrConfidence": pred.rfdetr_confidence,
                    "yoloConfidence": pred.yolo_confidence,
                    "confidenceThreshold": pred.confidence_threshold,
                    "rfdetrThreshold": pred.rfdetr_threshold,
                    "yoloThreshold": pred.yolo_threshold,
                    "comment": pred.comment,
                    "timestamp": pred.created_at.isoformat(),
                    "user": pred.user.username if pred.user else None
                }
                result.append(pred_dict)
        
        return JSONResponse(content={
            "predictions": result,
            "total": len(result),
            "skip": skip,
            "limit": limit,
            "message": "No predictions found" if not result else None
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting predictions: {str(e)}")


@history_router.get("/predictions/{prediction_id}")
async def get_prediction_by_id(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific prediction by ID.
    
    Args:
        prediction_id: ID of the prediction to retrieve
        
    Returns:
        Prediction details
    """
    try:
        prediction = PredictionCRUD.get_prediction_by_id(db, prediction_id)
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        result = {
            "id": prediction.id,
            "model": prediction.model,
            "imageUrl": prediction.image_url,
            "imageBase64": prediction.image_base64,
            "results": prediction.results,
            "confidence": prediction.confidence,
            "rfdetrConfidence": prediction.rfdetr_confidence,
            "yoloConfidence": prediction.yolo_confidence,
            "confidenceThreshold": prediction.confidence_threshold,
            "rfdetrThreshold": prediction.rfdetr_threshold,
            "yoloThreshold": prediction.yolo_threshold,
            "comment": prediction.comment,
            "timestamp": prediction.created_at.isoformat(),
            "user": prediction.user.username if prediction.user else None
        }
        
        return JSONResponse(content=result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting prediction: {str(e)}")


@history_router.put("/predictions/{prediction_id}/comment")
async def update_prediction_comment(
    prediction_id: str,
    comment: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update prediction comment.
    
    Args:
        prediction_id: ID of the prediction to update
        comment: New comment text
        
    Returns:
        Updated prediction
    """
    try:
        prediction = PredictionCRUD.update_prediction_comment(db, prediction_id, comment)
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        result = {
            "id": prediction.id,
            "model": prediction.model,
            "imageUrl": prediction.image_url,
            "imageBase64": prediction.image_base64,
            "results": prediction.results,
            "confidence": prediction.confidence,
            "rfdetrConfidence": prediction.rfdetr_confidence,
            "yoloConfidence": prediction.yolo_confidence,
            "confidenceThreshold": prediction.confidence_threshold,
            "rfdetrThreshold": prediction.rfdetr_threshold,
            "yoloThreshold": prediction.yolo_threshold,
            "comment": prediction.comment,
            "timestamp": prediction.created_at.isoformat(),
            "user": prediction.user.username if prediction.user else None
        }
        
        return JSONResponse(content=result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating prediction comment: {str(e)}")


@history_router.delete("/predictions/{prediction_id}")
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a prediction.
    
    Args:
        prediction_id: ID of the prediction to delete
        
    Returns:
        Success message
    """
    try:
        success = PredictionCRUD.delete_prediction(db, prediction_id)
        if not success:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        return JSONResponse(content={"message": "Prediction deleted successfully"})
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting prediction: {str(e)}")


@history_router.get("/statistics")
async def get_statistics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get prediction statistics.
    
    Returns:
        Statistics about predictions
    """
    try:
        total_predictions = PredictionCRUD.get_predictions_count(db)
        rfdetr_count = PredictionCRUD.get_predictions_by_model(db, "rfdetr")
        yolo_count = PredictionCRUD.get_predictions_by_model(db, "yolo")
        both_count = PredictionCRUD.get_predictions_by_model(db, "both")
        
        return JSONResponse(content={
            "total": total_predictions,
            "byModel": {
                "rfdetr": rfdetr_count,
                "yolo": yolo_count,
                "both": both_count
            },
            "message": "No predictions found" if total_predictions == 0 else None
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")


@history_router.get("/users")
async def get_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Get all users.
    
    Returns:
        List of users
    """
    try:
        users = UserCRUD.get_all_users(db)
        result = []
        if users:  # Check if users exist
            for user in users:
                user_dict = {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "createdAt": user.created_at.isoformat(),
                    "isActive": user.is_active
                }
                result.append(user_dict)
        
        return JSONResponse(content={
            "users": result,
            "message": "No users found" if not result else None
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting users: {str(e)}")


@history_router.post("/users")
async def create_user(
    username: str = Form(...),
    email: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new user.
    
    Args:
        username: Username for the new user
        email: Optional email address
        
    Returns:
        Created user
    """
    try:
        # Check if user already exists
        existing_user = UserCRUD.get_user_by_username(db, username)
        if existing_user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        user = UserCRUD.create_user(db, username, email)
        result = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "createdAt": user.created_at.isoformat(),
            "isActive": user.is_active
        }
        
        return JSONResponse(content=result, status_code=201)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")


# Authentication endpoints

@auth_router.post("/register", response_model=AuthResponse)
async def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user with username and password.
    
    Args:
        user_data: User registration data
        db: Database session
        
    Returns:
        Created user information
    """
    try:
        # Check if user already exists
        existing_user = UserCRUD.get_user_by_username(db, user_data.username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Create new user
        user = UserCRUD.create_user(
            db=db,
            username=user_data.username,
            password=user_data.password,
            email=user_data.email
        )
        
        return AuthResponse(
            user_id=user.id,
            username=user.username,
            email=user.email,
            message="User registered successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering user: {str(e)}")


@auth_router.post("/login", response_model=AuthResponse)
async def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user with username and password.
    
    Args:
        user_data: User login data
        db: Database session
        
    Returns:
        User information if authentication successful
    """
    try:
        # Authenticate user
        user = UserCRUD.authenticate_user(db, user_data.username, user_data.password)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        if not user.is_active:
            raise HTTPException(status_code=401, detail="User account is disabled")
        
        # Return simple response with user_id as token
        return AuthResponse(
            user_id=user.id,
            username=user.username,
            email=user.email,
            message="Login successful"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {str(e)}")


@auth_router.get("/users")
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all users.
    
    Returns:
        List of all users
    """
    try:
        users = UserCRUD.get_all_users(db)
        result = []
        if users:  # Check if users exist
            for user in users:
                user_dict = {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "createdAt": user.created_at.isoformat(),
                    "isActive": user.is_active
                }
                result.append(user_dict)
        
        return JSONResponse(content={
            "users": result,
            "message": "No users found" if not result else None
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting users: {str(e)}")

@auth_router.get("/users/{user_id}")
async def get_user_info(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user information by ID.
    
    Args:
        user_id: User ID
        db: Database session
        
    Returns:
        User information
    """
    try:
        user = UserCRUD.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return JSONResponse(content={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "createdAt": user.created_at.isoformat(),
            "isActive": user.is_active
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting user info: {str(e)}")

@auth_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete user by ID.
    
    Args:
        user_id: User ID to delete
        db: Database session
        
    Returns:
        Success message
    """
    try:
        # Check if user exists
        user = UserCRUD.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent self-deletion
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Delete user (this will also delete related predictions due to cascade)
        db.delete(user)
        db.commit()
        
        return JSONResponse(content={
            "message": f"User {user.username} deleted successfully",
            "deleted_user_id": user_id
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

@auth_router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    username: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    is_active: Optional[bool] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user information.
    
    Args:
        user_id: User ID to update
        username: New username (optional)
        email: New email (optional)
        is_active: New active status (optional)
        db: Database session
        
    Returns:
        Updated user information
    """
    try:
        # Check if user exists
        user = UserCRUD.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update fields if provided
        if username is not None:
            # Check if new username is already taken by another user
            existing_user = UserCRUD.get_user_by_username(db, username)
            if existing_user and existing_user.id != user_id:
                raise HTTPException(status_code=400, detail="Username already taken")
            user.username = username
        
        if email is not None:
            user.email = email
        
        if is_active is not None:
            user.is_active = is_active
        
        db.commit()
        db.refresh(user)
        
        return JSONResponse(content={
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "createdAt": user.created_at.isoformat(),
            "isActive": user.is_active,
            "message": "User updated successfully"
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user: {str(e)}")

# Superuser management endpoints

@auth_router.get("/me/superuser")
async def check_superuser_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if current user is a superuser.
    
    Returns:
        Superuser status information
    """
    try:
        return JSONResponse(content={
            "is_superuser": current_user.is_superuser,
            "user_id": current_user.id,
            "username": current_user.username
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking superuser status: {str(e)}")

@auth_router.get("/superusers")
async def get_all_superusers(
    current_user: User = Depends(get_superuser),
    db: Session = Depends(get_db)
):
    """
    Get all superusers (requires superuser privileges).
    
    Returns:
        List of all superusers
    """
    try:
        superusers = UserCRUD.get_superusers(db)
        
        return JSONResponse(content={
            "superusers": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "createdAt": user.created_at.isoformat(),
                    "isActive": user.is_active
                }
                for user in superusers
            ]
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting superusers: {str(e)}")

@auth_router.post("/users/{user_id}/make-superuser")
async def make_user_superuser(
    user_id: str,
    current_user: User = Depends(get_superuser),
    db: Session = Depends(get_db)
):
    """
    Make a user a superuser (requires superuser privileges).
    
    Args:
        user_id: ID of the user to make superuser
        
    Returns:
        Success message
    """
    try:
        success = UserCRUD.make_superuser(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return JSONResponse(content={
            "message": "User successfully granted superuser privileges"
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error making user superuser: {str(e)}")

@auth_router.post("/users/{user_id}/remove-superuser")
async def remove_user_superuser(
    user_id: str,
    current_user: User = Depends(get_superuser),
    db: Session = Depends(get_db)
):
    """
    Remove superuser privileges from a user (requires superuser privileges).
    
    Args:
        user_id: ID of the user to remove superuser privileges from
        
    Returns:
        Success message
    """
    try:
        # Prevent removing superuser status from self
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot remove superuser privileges from yourself")
        
        success = UserCRUD.remove_superuser(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return JSONResponse(content={
            "message": "Superuser privileges successfully removed from user"
        })
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing superuser privileges: {str(e)}")

