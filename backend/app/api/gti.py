import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models import WellModel, RawGtiData, CirculationAnalysisModel, WellAggregatesModel
from app.schemas.raw_gti import RawGtiDataResponse, GtiFileUploadResponse
from app.services.gti_parser import GtiParserService

router = APIRouter()


@router.post("/upload/{well_id}", response_model=GtiFileUploadResponse)
async def upload_gti_file(
    well_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Загрузить файл ГТИ (Excel/CSV) для скважины"""
    
    # Проверяем существование скважины
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина с ID {well_id} не найдена")
    
    # Проверяем расширение файла
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # Сохраняем файл временно
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    temp_path = os.path.join(settings.UPLOAD_DIR, f"{well_id}_{file.filename}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        # Парсим файл
        records = GtiParserService.parse_file(temp_path, well_id)
        
        if not records:
            raise HTTPException(status_code=400, detail="Не удалось распарсить файл")
        
        # Удаляем старые данные ГТИ
        await db.execute(delete(RawGtiData).where(RawGtiData.well_id == well_id))
        
        # Удаляем старые результаты анализа циркуляции
        await db.execute(delete(CirculationAnalysisModel).where(CirculationAnalysisModel.well_id == well_id))
        
        # Удаляем агрегаты
        await db.execute(delete(WellAggregatesModel).where(WellAggregatesModel.well_id == well_id))
        
        await db.commit()
        
        # Сохраняем новые записи в БД
        for record in records:
            gti_data = RawGtiData(
                **record,
                source_file=file.filename,
                import_id=int(datetime.now().timestamp())
            )
            db.add(gti_data)
        
        await db.commit()
        
        return GtiFileUploadResponse(
            well_id=well_id,
            filename=file.filename,
            rows_imported=len(records),
            message=f"Успешно импортировано {len(records)} записей. Старые данные и анализ удалены."
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Удаляем временный файл
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/{well_id}", response_model=List[RawGtiDataResponse])
async def get_gti_data(
    well_id: int,
    skip: int = 0,
    limit: int = 1000,
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить ГТИ данные по скважине"""
    
    query = select(RawGtiData).where(RawGtiData.well_id == well_id)
    
    if start_date:
        start = datetime.fromisoformat(start_date)
        query = query.where(RawGtiData.timestamp >= start)
    if end_date:
        end = datetime.fromisoformat(end_date)
        query = query.where(RawGtiData.timestamp <= end)
    
    query = query.order_by(RawGtiData.timestamp).offset(skip).limit(limit)
    
    result = await db.execute(query)
    data = result.scalars().all()
    return data


@router.delete("/{well_id}")
async def delete_gti_data(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить все ГТИ данные по скважине, а также анализ и агрегаты"""
    
    # Удаляем ГТИ данные
    result = await db.execute(
        delete(RawGtiData).where(RawGtiData.well_id == well_id)
    )
    gti_deleted = result.rowcount
    
    # Удаляем результаты анализа циркуляции
    result = await db.execute(
        delete(CirculationAnalysisModel).where(CirculationAnalysisModel.well_id == well_id)
    )
    analysis_deleted = result.rowcount
    
    # Удаляем агрегаты
    result = await db.execute(
        delete(WellAggregatesModel).where(WellAggregatesModel.well_id == well_id)
    )
    aggregates_deleted = result.rowcount
    
    await db.commit()
    
    return {
        "message": f"Удалено: ГТИ={gti_deleted}, анализ={analysis_deleted}, агрегаты={aggregates_deleted}"
    }


@router.get("/data/{well_id}")
async def get_gti_data_paginated(
    well_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Получить ГТИ данные с пагинацией"""
    
    count_result = await db.execute(
        select(func.count()).select_from(RawGtiData).where(RawGtiData.well_id == well_id)
    )
    total = count_result.scalar()
    
    result = await db.execute(
        select(RawGtiData)
        .where(RawGtiData.well_id == well_id)
        .order_by(RawGtiData.timestamp)
        .offset(skip)
        .limit(limit)
    )
    data = result.scalars().all()
    
    items = []
    for row in data:
        items.append({
            "id": row.id,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            "depth_bit": row.depth_bit,
            "depth_bottom": row.depth_bottom,
            "flow_rate_in": row.flow_rate_in,
            "pressure_in": row.pressure_in,
            "pressure_out": row.pressure_out,
            "weight_on_bit": row.weight_on_bit,
            "rop": row.rop,
            "rpm": row.rpm,
            "torque": row.torque,
            "tank_volume_total": row.tank_volume_total,
            "hookload": row.hookload,
            "block_position": row.block_position,
            "strokes_per_minute": row.strokes_per_minute,
            "temperature_in": row.temperature_in,
            "temperature_out": row.temperature_out,
            "gas_total": row.gas_total
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "items": items
    }