from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models import WellModel, PadModel
from pydantic import BaseModel

router = APIRouter()

class WellBase(BaseModel):
    well_id: str
    name: Optional[str] = None
    pad_id: int

class WellCreate(WellBase):
    pass

class WellUpdate(BaseModel):
    well_id: Optional[str] = None
    name: Optional[str] = None
    pad_id: Optional[int] = None

class WellResponse(WellBase):
    id: int
    well_start_date: Optional[datetime] = None
    well_end_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[WellResponse])
async def get_wells(
    skip: int = 0,
    limit: int = 100,
    pad_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(WellModel)
    if pad_id:
        query = query.where(WellModel.pad_id == pad_id)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    wells = result.scalars().all()
    return wells


@router.get("/{well_id}", response_model=WellResponse)
async def get_well(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail="Скважина не найдена")
    return well


@router.post("/", response_model=WellResponse, status_code=status.HTTP_201_CREATED)
async def create_well(
    well: WellCreate,
    db: AsyncSession = Depends(get_db)
):
    # Проверка на дубликат well_id
    result = await db.execute(select(WellModel).where(WellModel.well_id == well.well_id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail=f"Скважина с ID {well.well_id} уже существует")
    
    # Проверка существования куста
    result = await db.execute(select(PadModel).where(PadModel.id == well.pad_id))
    pad = result.scalar_one_or_none()
    if not pad:
        raise HTTPException(status_code=404, detail="Куст не найден")
    
    db_well = WellModel(**well.model_dump(), well_start_date=datetime.now())
    db.add(db_well)
    await db.commit()
    await db.refresh(db_well)
    return db_well


@router.put("/{well_id}", response_model=WellResponse)
async def update_well(
    well_id: int,
    well_data: WellUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail="Скважина не найдена")
    
    for key, value in well_data.model_dump(exclude_unset=True).items():
        setattr(well, key, value)
    
    await db.commit()
    await db.refresh(well)
    return well


@router.delete("/{well_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_well(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail="Скважина не найдена")
    
    await db.delete(well)
    await db.commit()
    return None
