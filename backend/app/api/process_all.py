from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import WellModel
from app.services.all_modules_processor import AllModulesProcessor

router = APIRouter()

@router.post("/process-all/{well_id}")
async def process_all_modules(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Запустить обработку всех 9 модулей для скважины"""
    
    # Проверяем существование скважины
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина с ID {well_id} не найдена")
    
    # Запускаем обработку
    processor = AllModulesProcessor(db, well_id)
    results = await processor.process_all()
    
    return results