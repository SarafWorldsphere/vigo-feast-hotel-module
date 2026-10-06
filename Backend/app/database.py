"""Database compatibility module providing Base, SessionLocal, engine, and get_db."""
from app.db.database import Base, SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
