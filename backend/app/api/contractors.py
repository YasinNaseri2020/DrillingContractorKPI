from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models import ContractorModel
from pydantic import BaseModel

router = APIRouter()

class ContractorBase(BaseModel):
    name: str
    inn: Optional[str] = None

class ContractorCreate(ContractorBase):
    pass

class ContractorUpdate(BaseModel):
    name: Optional[str] = None
    inn: Optional[str] = None

class ContractorResponse(ContractorBase):
    id: int
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[ContractorResponse])
async def get_contractors(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ContractorModel).offset(skip).limit(limit))
    contractors = result.scalars().all()
    return contractors


@router.post("/", response_model=ContractorResponse, status_code=status.HTTP_201_CREATED)
async def create_contractor(
    contractor: ContractorCreate,
    db: AsyncSession = Depends(get_db)
):
    db_contractor = ContractorModel(**contractor.model_dump())
    db.add(db_contractor)
    await db.commit()
    await db.refresh(db_contractor)
    return db_contractor


@router.put("/{contractor_id}", response_model=ContractorResponse)
async def update_contractor(
    contractor_id: int,
    contractor_data: ContractorUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ContractorModel).where(ContractorModel.id == contractor_id))
    contractor = result.scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Подрядчик не найден")
    
    for key, value in contractor_data.model_dump(exclude_unset=True).items():
        setattr(contractor, key, value)
    
    await db.commit()
    await db.refresh(contractor)
    return contractor


@router.delete("/{contractor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contractor(
    contractor_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ContractorModel).where(ContractorModel.id == contractor_id))
    contractor = result.scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Подрядчик не найден")
    
    await db.delete(contractor)
    await db.commit()
    return None
