from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import ml_router, history_router, auth_router
from DB.database import create_tables, get_db
from DB.crud import PredictionCRUD, UserCRUD
from DB.schema import User, Prediction
from app.middleware import get_current_user
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

# Create FastAPI application
app = FastAPI(
    title="CV Shelves ML API",
    description="ML Backend service for CV Shelves application with RFDETR and YOLO models",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3001",  # Фронтенд URL
        "http://localhost:3001",  # Альтернативный URL
        "http://frontend:3000",   # Если фронтенд в Docker
        "http://app:8000",        # Docker backend URL
        "http://127.0.0.1:8000",  # Local backend URL
        "http://localhost:8000",  # Local backend URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    create_tables()

# Include routers
app.include_router(ml_router)
app.include_router(history_router)
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "CV Shelves ML API", "version": "0.1.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "CV Shelves ML API"}

@app.get("/export/history")
async def export_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Export all history data (predictions and users) as JSON.
    
    Returns:
        Complete history data including all predictions and users
    """
    try:
        # Get all predictions
        all_predictions = db.query(Prediction).options(
            joinedload(Prediction.user)
        ).order_by(Prediction.created_at.desc()).all()
        
        # Get all users
        all_users = UserCRUD.get_all_users(db)
        
        # Format predictions data
        predictions_data = []
        for pred in all_predictions:
            pred_dict = {
                "id": pred.id,
                "model": pred.model,
                "imageUrl": pred.image_url,
                "imageBase64": pred.image_base64,
                "imageHash": pred.image_hash,
                "results": pred.results,
                "confidence": pred.confidence,
                "rfdetrConfidence": pred.rfdetr_confidence,
                "yoloConfidence": pred.yolo_confidence,
                "confidenceThreshold": pred.confidence_threshold,
                "rfdetrThreshold": pred.rfdetr_threshold,
                "yoloThreshold": pred.yolo_threshold,
                "comment": pred.comment,
                "timestamp": pred.created_at.isoformat(),
                "userId": pred.user_id,
                "user": {
                    "id": pred.user.id,
                    "username": pred.user.username,
                    "email": pred.user.email,
                    "isActive": pred.user.is_active,
                    "isSuperuser": pred.user.is_superuser,
                    "createdAt": pred.user.created_at.isoformat()
                } if pred.user else None
            }
            predictions_data.append(pred_dict)
        
        # Format users data
        users_data = []
        for user in all_users:
            user_dict = {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "isActive": user.is_active,
                "isSuperuser": user.is_superuser,
                "createdAt": user.created_at.isoformat(),
                "predictionsCount": len([p for p in all_predictions if p.user_id == user.id])
            }
            users_data.append(user_dict)
        
        # Create export data
        export_data = {
            "exportInfo": {
                "timestamp": datetime.utcnow().isoformat(),
                "totalPredictions": len(all_predictions),
                "totalUsers": len(all_users),
                "exportedBy": {
                    "userId": current_user.id,
                    "username": current_user.username
                }
            },
            "predictions": predictions_data,
            "users": users_data,
            "statistics": {
                "byModel": {
                    "rfdetr": len([p for p in all_predictions if p.model == "rfdetr"]),
                    "yolo": len([p for p in all_predictions if p.model == "yolo"]),
                    "both": len([p for p in all_predictions if p.model == "both"])
                },
                "byUser": {
                    user.username: len([p for p in all_predictions if p.user_id == user.id])
                    for user in all_users
                }
            }
        }
        
        return JSONResponse(content=export_data)
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Error exporting history: {str(e)}"}
        )
