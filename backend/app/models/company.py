from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class CompanyModel(BaseModel):
    __tablename__ = "companies"
    
    name = Column(String(100), nullable=False, unique=True)
    description = Column(String(500), nullable=True)
    inn = Column(String(12), nullable=True)
    
    # Связи
    oilfields = relationship("OilfieldModel", back_populates="company", cascade="all, delete-orphan")
    contractors = relationship("ContractorModel", back_populates="company", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Company {self.name}>"
