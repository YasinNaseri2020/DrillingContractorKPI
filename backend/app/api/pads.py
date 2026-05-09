from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models import PadModel, OilfieldModel, ContractorModel
from pydantic import BaseModel

router = APIRouter()

class PadBase(BaseModel):
    name: str
    oilfield_id: int
    contractor_id: int   # <-- ДОБАВИЛИ

class PadCreate(PadBase):
    pass

class PadUpdate(BaseModel):
    name: Optional[str] = None
    oilfield_id: Optional[int] = None
    contractor_id: Optional[int] = None

class PadResponse(PadBase):
    id: int
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[PadResponse])
async def get_pads(
    skip: int = 0,
    limit: int = 100,
    oilfield_id: Optional[int] = None,
    contractor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(PadModel)
    if oilfield_id:
        query = query.where(PadModel.oilfield_id == oilfield_id)
    if contractor_id:
        query = query.where(PadModel.contractor_id == contractor_id)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    pads = result.scalars().all()
    return pads


@router.post("/", response_model=PadResponse, status_code=status.HTTP_201_CREATED)
async def create_pad(
    pad: PadCreate,
    db: AsyncSession = Depends(get_db)
):
    # Проверяем существование месторождения
    result = await db.execute(select(OilfieldModel).where(OilfieldModel.id == pad.oilfield_id))
    oilfield = result.scalar_one_or_none()
    if not oilfield:
        raise HTTPException(status_code=404, detail="Месторождение не найдено")
    
    # Проверяем существование подрядчика
    result = await db.execute(select(ContractorModel).where(ContractorModel.id == pad.contractor_id))
    contractor = result.scalar_one_or_none()
    if not contractor:
        raise HTTPException(status_code=404, detail="Подрядчик не найден")
    
    db_pad = PadModel(**pad.model_dump())
    db.add(db_pad)
    await db.commit()
    await db.refresh(db_pad)
    return db_pad


@router.put("/{pad_id}", response_model=PadResponse)
async def update_pad(
    pad_id: int,
    pad_data: PadUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PadModel).where(PadModel.id == pad_id))
    pad = result.scalar_one_or_none()
    if not pad:
        raise HTTPException(status_code=404, detail="Куст не найден")
    
    update_data = pad_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pad, key, value)
    
    await db.commit()
    await db.refresh(pad)
    return pad


@router.delete("/{pad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pad(
    pad_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PadModel).where(PadModel.id == pad_id))
    pad = result.scalar_one_or_none()
    if not pad:
        raise HTTPException(status_code=404, detail="Куст не найден")
    
    await db.delete(pad)
    await db.commit()
    return None
