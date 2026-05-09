from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class ContractorModel(BaseModel):
    __tablename__ = "contractors"
    
    name = Column(String(200), nullable=False)
    inn = Column(String(12), nullable=True)
    rating = Column(Float, default=0)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Связи
    company = relationship("CompanyModel", back_populates="contractors")
    pads = relationship("PadModel", back_populates="contractor")
    
    def __repr__(self):
        return f"<Contractor {self.name}>"
