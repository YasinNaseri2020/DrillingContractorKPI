from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models import WellModel, CirculationAnalysisModel
from app.schemas.visualization import (
    StartupChartData,
    DashboardSummary,
    WellComparisonData
)
from app.services.visualization import VisualizationService

router = APIRouter()


@router.get("/chart/{well_id}/{startup_number}", response_model=StartupChartData)
async def get_startup_chart(
    well_id: int,
    startup_number: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить данные для графика конкретного запуска"""
    
    data = await VisualizationService.get_startup_chart_data(db, well_id, startup_number)
    
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Запуск #{startup_number} для скважины {well_id} не найден"
        )
    
    return data


@router.get("/dashboard/{well_id}")
async def get_dashboard_summary(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить сводку для дашборда по скважине"""
    
    # Проверяем существование скважины
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина {well_id} не найдена")
    
    # Получаем анализ
    result = await db.execute(
        select(CirculationAnalysisModel)
        .where(CirculationAnalysisModel.well_id == well_id)
        .order_by(CirculationAnalysisModel.startup_number)
    )
    analyses = result.scalars().all()
    
    if not analyses:
        raise HTTPException(
            status_code=404,
            detail=f"Нет данных анализа для скважины {well_id}"
        )
    
    # Берем target_flow из первого запуска
    target_flow = analyses[0].target_flow if analyses else 0
    
    # Распределение качества
    quality_dist = {
        "excellent": 0,
        "good": 0,
        "average": 0,
        "poor": 0
    }
    
    quality_by_depth = []
    
    for a in analyses:
        if a.quality_score >= 90:
            quality_dist["excellent"] += 1
        elif a.quality_score >= 70:
            quality_dist["good"] += 1
        elif a.quality_score >= 50:
            quality_dist["average"] += 1
        else:
            quality_dist["poor"] += 1
        
        quality_by_depth.append({
            "depth": a.depth_bottom,
            "quality": a.quality_score,
            "startup": a.startup_number
        })
    
    # Находим лучший и худший
    best = max(analyses, key=lambda x: x.quality_score) if analyses else None
    worst = min(analyses, key=lambda x: x.quality_score) if analyses else None
    
    # Статистика по углам
    flow_angles = [a.flow_angle for a in analyses if a.flow_angle > 0]
    press_angles = [a.press_angle for a in analyses if a.press_angle > 0]
    delta_ts = [a.delta_t_sec for a in analyses if a.delta_t_sec]
    
    successful = [a for a in analyses if a.target_reached_sec]
    
    return {
        "well_id": well_id,
        "well_name": well.name,
        "target_flow": target_flow,
        "total_startups": len(analyses),
        "successful_startups": len(successful),
        "avg_quality_score": sum(a.quality_score for a in analyses) / len(analyses),
        "quality_distribution": quality_dist,
        "quality_by_depth": quality_by_depth,
        "avg_flow_angle": sum(flow_angles) / len(flow_angles) if flow_angles else 0,
        "avg_press_angle": sum(press_angles) / len(press_angles) if press_angles else 0,
        "avg_delta_t": sum(delta_ts) / len(delta_ts) if delta_ts else None,
        "best_startup": {
            "number": best.startup_number,
            "quality": best.quality_score,
            "depth": best.depth_bottom
        } if best else None,
        "worst_startup": {
            "number": worst.startup_number,
            "quality": worst.quality_score,
            "depth": worst.depth_bottom
        } if worst else None
    }


@router.get("/comparison", response_model=List[WellComparisonData])
async def get_wells_comparison(
    company_id: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Получить данные для сравнения скважин"""
    
    data = await VisualizationService.get_wells_comparison(db, company_id)
    return data
