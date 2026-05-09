from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class PadModel(BaseModel):
    __tablename__ = "pads"
    
    name = Column(String(50), nullable=False)
    oilfield_id = Column(Integer, ForeignKey("oilfields.id"), nullable=False)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=False)
    timezone = Column(String(6), default="+0500")
    is_active = Column(Boolean, default=True)
    
    # Связи
    oilfield = relationship("OilfieldModel", back_populates="pads")
    contractor = relationship("ContractorModel", back_populates="pads")
    wells = relationship("WellModel", back_populates="pad")
    
    def __repr__(self):
        return f"<Pad {self.name}>"
