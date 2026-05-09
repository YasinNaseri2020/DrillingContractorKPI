from sqlalchemy import Column, Integer, DateTime, func
from app.core.database import Base


class BaseModel(Base):
    """Абстрактная базовая модель с общими полями"""
    
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class TimeStampedModel(BaseModel):
    """Модель с временными метками"""
    
    __abstract__ = True
    
    created_by_id = Column(Integer, nullable=True)
    updated_by_id = Column(Integer, nullable=True)
