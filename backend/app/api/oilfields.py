from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models import OilfieldModel, CompanyModel
from pydantic import BaseModel

router = APIRouter()

class OilfieldBase(BaseModel):
    name: str
    company_id: int

class OilfieldCreate(OilfieldBase):
    pass

class OilfieldUpdate(BaseModel):
    name: Optional[str] = None
    company_id: Optional[int] = None

class OilfieldResponse(OilfieldBase):
    id: int
    
    class Config:
        from_attributes = True


@router.get("/", response_model=List[OilfieldResponse])
async def get_oilfields(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(OilfieldModel)
    if company_id:
        query = query.where(OilfieldModel.company_id == company_id)
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    oilfields = result.scalars().all()
    return oilfields


@router.post("/", response_model=OilfieldResponse, status_code=status.HTTP_201_CREATED)
async def create_oilfield(
    oilfield: OilfieldCreate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(CompanyModel).where(CompanyModel.id == oilfield.company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Компания не найдена")
    
    db_oilfield = OilfieldModel(**oilfield.model_dump())
    db.add(db_oilfield)
    await db.commit()
    await db.refresh(db_oilfield)
    return db_oilfield


@router.put("/{oilfield_id}", response_model=OilfieldResponse)
async def update_oilfield(
    oilfield_id: int,
    oilfield_data: OilfieldUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(OilfieldModel).where(OilfieldModel.id == oilfield_id))
    oilfield = result.scalar_one_or_none()
    if not oilfield:
        raise HTTPException(status_code=404, detail="Месторождение не найдено")
    
    update_data = oilfield_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(oilfield, key, value)
    
    await db.commit()
    await db.refresh(oilfield)
    return oilfield


@router.delete("/{oilfield_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_oilfield(
    oilfield_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(OilfieldModel).where(OilfieldModel.id == oilfield_id))
    oilfield = result.scalar_one_or_none()
    if not oilfield:
        raise HTTPException(status_code=404, detail="Месторождение не найдено")
    
    await db.delete(oilfield)
    await db.commit()
    return None
