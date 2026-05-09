from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class WellBase(BaseModel):
    well_id: str
    name: Optional[str] = None
    pad_id: int
    status: Optional[str] = "online"
    current_depth: Optional[float] = 0
    planned_depth: Optional[float] = 0

class WellCreate(WellBase):
    pass

class WellUpdate(BaseModel):
    well_id: Optional[str] = None
    name: Optional[str] = None
    pad_id: Optional[int] = None
    status: Optional[str] = None
    current_depth: Optional[float] = None
    planned_depth: Optional[float] = None
    well_end_date: Optional[datetime] = None

class WellResponse(WellBase):
    id: int
    well_start_date: Optional[datetime] = None
    well_end_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
