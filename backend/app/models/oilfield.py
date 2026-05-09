from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class OilfieldModel(BaseModel):
    __tablename__ = "oilfields"
    
    name = Column(String(50), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    company = relationship("CompanyModel", back_populates="oilfields")
    pads = relationship("PadModel", back_populates="oilfield")
