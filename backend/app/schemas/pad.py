from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PadBase(BaseModel):
    name: str
    oilfield_id: int
    timezone: Optional[str] = "+0500"
    is_active: Optional[bool] = True

class PadCreate(PadBase):
    pass

class PadUpdate(BaseModel):
    name: Optional[str] = None
    oilfield_id: Optional[int] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

class PadResponse(PadBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
