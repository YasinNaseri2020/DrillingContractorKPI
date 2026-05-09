from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OilfieldBase(BaseModel):
    name: str
    company_id: int

class OilfieldCreate(OilfieldBase):
    pass

class OilfieldUpdate(BaseModel):
    name: Optional[str] = None
    company_id: Optional[int] = None

class OilfieldResponse(OilfieldBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
