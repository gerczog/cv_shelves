"""
Script to create users in the database
"""
import sys
import os
from sqlalchemy.orm import Session
from .database import get_db_session, create_tables
from .schema import User
from datetime import datetime

def create_user(username: str, email: str = None) -> User:
    """
    Create a new user in the database
    
    Args:
        username: Username for the user
        email: Optional email address
        
    Returns:
        Created User object
    """
    # Create tables if they don't exist
    create_tables()
    
    db = get_db_session()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"User '{username}' already exists!")
            return existing_user
        
        # Create new user
        user = User(
            username=username,
            email=email,
            created_at=datetime.utcnow()
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"User '{username}' created successfully with ID: {user.id}")
        return user
        
    except Exception as e:
        db.rollback()
        print(f"Error creating user: {e}")
        raise
    finally:
        db.close()

def list_users():
    """List all users in the database"""
    create_tables()
    
    db = get_db_session()
    try:
        users = db.query(User).all()
        if not users:
            print("No users found in the database.")
            return
        
        print("Users in database:")
        for user in users:
            print(f"  ID: {user.id}")
            print(f"  Username: {user.username}")
            print(f"  Email: {user.email or 'Not set'}")
            print(f"  Created: {user.created_at}")
            print(f"  Active: {user.is_active}")
            print("-" * 40)
            
    except Exception as e:
        print(f"Error listing users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python -m DB.create_user <username> [email]")
        print("  python -m DB.create_user --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    else:
        username = sys.argv[1]
        email = sys.argv[2] if len(sys.argv) > 2 else None
        create_user(username, email)
