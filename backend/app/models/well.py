from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class WellModel(BaseModel):
    __tablename__ = "wells"
    
    well_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100))
    pad_id = Column(Integer, ForeignKey("pads.id"))
    well_start_date = Column(DateTime, nullable=True)
    well_end_date = Column(DateTime, nullable=True)
    
    # Связи
    pad = relationship("PadModel", back_populates="wells")
    gti_data = relationship("RawGtiData", back_populates="well", cascade="all, delete-orphan")
    circulation_analysis = relationship("CirculationAnalysisModel", back_populates="well", cascade="all, delete-orphan")
    aggregates = relationship("WellAggregatesModel", back_populates="well", uselist=False, cascade="all, delete-orphan")
    tripping_analysis = relationship("TrippingAnalysisModel", back_populates="well", cascade="all, delete-orphan")
    def __repr__(self):
        return f"<Well {self.well_id}>"