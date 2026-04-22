from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import Base, engine

# Import all models to register them with SQLAlchemy
from app.models import (
    User, InternBatch, InternProfile, Task, TaskReport, Evaluation,
    TrainingDocument, LogbookEntry
)
# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {"message": "Hệ thống Quản lý Thực tập sinh API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
