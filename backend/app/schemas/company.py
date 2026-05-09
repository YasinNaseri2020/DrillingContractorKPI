from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    """Базовая схема компании"""
    name: str
    description: Optional[str] = None
    inn: Optional[str] = None


class CompanyCreate(CompanyBase):
    """Схема для создания компании"""
    pass


class CompanyUpdate(BaseModel):
    """Схема для обновления компании"""
    name: Optional[str] = None
    description: Optional[str] = None
    inn: Optional[str] = None


class CompanyResponse(CompanyBase):
    """Схема для ответа с компанией"""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
