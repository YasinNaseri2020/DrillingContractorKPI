from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Настройки приложения"""
    
    # Database - порт 5440
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5440/drilling_kpi"
    
    # Redis пока не используем (можно позже на другой порт)
    REDIS_URL: str = "redis://localhost:6380"
    
    # JWT
    SECRET_KEY: str = "drilling-kpi-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 500
    ALLOWED_EXTENSIONS: list = [".xlsx", ".xls", ".csv", ".txt"]
    
    # App
    APP_NAME: str = "Drilling Company KPI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Celery (пока отключен)
    CELERY_BROKER_URL: str = "redis://localhost:6380"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6380"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
