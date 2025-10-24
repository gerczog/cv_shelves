"""
Simple Admin Panel for CV Shelves Backend
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os
from datetime import datetime

from DB.database import get_db
from DB.schema import User, Prediction, ModelInfo
from DB.crud import UserCRUD, PredictionCRUD, ModelInfoCRUD
from app.middleware import get_current_user

# Templates
templates = Jinja2Templates(directory="templates")

# Admin router
admin_router = APIRouter(prefix="/admin", tags=["admin"])

# Admin dashboard
@admin_router.get("/", response_class=HTMLResponse)
async def admin_dashboard(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Admin dashboard"""
    try:
        # Get statistics
        total_users = db.query(User).count()
        total_predictions = db.query(Prediction).count()
        total_models = db.query(ModelInfo).count()
        
        # Get recent predictions
        recent_predictions = db.query(Prediction).order_by(Prediction.created_at.desc()).limit(5).all()
        
        # Get recent users
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
        
        return templates.TemplateResponse("admin_dashboard.html", {
            "request": request,
            "current_user": current_user,
            "stats": {
                "total_users": total_users,
                "total_predictions": total_predictions,
                "total_models": total_models
            },
            "recent_predictions": recent_predictions,
            "recent_users": recent_users
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading dashboard: {str(e)}")

# Users management
@admin_router.get("/users", response_class=HTMLResponse)
async def admin_users(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Users management page"""
    try:
        users = db.query(User).all()
        return templates.TemplateResponse("admin_users.html", {
            "request": request,
            "current_user": current_user,
            "users": users
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading users: {str(e)}")

@admin_router.post("/users/{user_id}/toggle")
async def toggle_user_status(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle user active status"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.is_active = not user.is_active
        db.commit()
        
        return RedirectResponse(url="/admin/users", status_code=303)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error toggling user status: {str(e)}")

@admin_router.post("/users/{user_id}/delete")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete user"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent self-deletion
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        db.delete(user)
        db.commit()
        
        return RedirectResponse(url="/admin/users", status_code=303)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting user: {str(e)}")

# Predictions management
@admin_router.get("/predictions", response_class=HTMLResponse)
async def admin_predictions(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Predictions management page"""
    try:
        predictions = db.query(Prediction).order_by(Prediction.created_at.desc()).offset(skip).limit(limit).all()
        total_predictions = db.query(Prediction).count()
        
        return templates.TemplateResponse("admin_predictions.html", {
            "request": request,
            "current_user": current_user,
            "predictions": predictions,
            "total_predictions": total_predictions,
            "skip": skip,
            "limit": limit
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading predictions: {str(e)}")

@admin_router.post("/predictions/{prediction_id}/delete")
async def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete prediction"""
    try:
        prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        db.delete(prediction)
        db.commit()
        
        return RedirectResponse(url="/admin/predictions", status_code=303)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting prediction: {str(e)}")

# Statistics
@admin_router.get("/statistics", response_class=HTMLResponse)
async def admin_statistics(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Statistics page"""
    try:
        # Get detailed statistics
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        total_predictions = db.query(Prediction).count()
        
        # Predictions by model
        rfdetr_count = db.query(Prediction).filter(Prediction.model == "rfdetr").count()
        yolo_count = db.query(Prediction).filter(Prediction.model == "yolo").count()
        both_count = db.query(Prediction).filter(Prediction.model == "both").count()
        
        # Recent activity
        recent_predictions = db.query(Prediction).order_by(Prediction.created_at.desc()).limit(10).all()
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
        
        return templates.TemplateResponse("admin_statistics.html", {
            "request": request,
            "current_user": current_user,
            "stats": {
                "total_users": total_users,
                "active_users": active_users,
                "total_predictions": total_predictions,
                "rfdetr_count": rfdetr_count,
                "yolo_count": yolo_count,
                "both_count": both_count
            },
            "recent_predictions": recent_predictions,
            "recent_users": recent_users
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading statistics: {str(e)}")
