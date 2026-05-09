from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class RawGtiDataBase(BaseModel):
    timestamp: datetime
    depth_bit: Optional[float] = None
    depth_bottom: Optional[float] = None
    flow_rate_in: Optional[float] = None
    pressure_in: Optional[float] = None
    pressure_out: Optional[float] = None
    weight_on_bit: Optional[float] = None
    rop: Optional[float] = None
    rpm: Optional[float] = None
    torque: Optional[float] = None
    tank_volume_total: Optional[float] = None
    tank_refill: Optional[float] = None
    hookload: Optional[float] = None
    block_position: Optional[float] = None
    strokes_per_minute: Optional[float] = None
    temperature_in: Optional[float] = None
    temperature_out: Optional[float] = None
    density_in: Optional[float] = None
    density_out: Optional[float] = None
    gas_total: Optional[float] = None
    h2s: Optional[float] = None

class RawGtiDataCreate(RawGtiDataBase):
    pass

class RawGtiDataResponse(RawGtiDataBase):
    id: int
    well_id: int
    source_file: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class GtiFileUploadResponse(BaseModel):
    well_id: int
    filename: str
    rows_imported: int
    message: str
