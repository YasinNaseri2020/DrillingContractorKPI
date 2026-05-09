from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.models import WellModel, RawGtiData, CirculationAnalysisModel
from app.schemas.circulation import CirculationAnalysisListResponse
from app.services.circulation_analysis import CirculationAnalysisService
from app.services.progress_service import ProgressService

router = APIRouter()


@router.post("/analyze/{well_id}", response_model=CirculationAnalysisListResponse)
async def run_circulation_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Запустить анализ циркуляции для скважины (модуль 1)"""
    
    # Проверяем существование скважины
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code= NotFound, detail=f"Скважина с ID {well_id} не найдена")
    
    # Получаем ГТИ данные
    result = await db.execute(
        select(RawGtiData)
        .where(RawGtiData.well_id == well_id)
        .order_by(RawGtiData.timestamp)
    )
    gti_data = result.scalars().all()
    
    if not gti_data:
        raise HTTPException(status_code=404, detail="ГТИ данные не найдены для этой скважины")
    
    # Получаем целевой расход по интервалам глубины
    target_flow_by_depth = await ProgressService.calculate_target_flow_by_depth(db, well_id)
    
    # Удаляем старые результаты анализа
    await db.execute(delete(CirculationAnalysisModel).where(CirculationAnalysisModel.well_id == well_id))
    await db.commit()
    
    # Преобразуем в список словарей
    data_list = [
        {
            "timestamp": row.timestamp,
            "flow_rate_in": row.flow_rate_in,
            "pressure_in": row.pressure_in,
            "depth_bottom": row.depth_bottom,
            "depth_bit": row.depth_bit
        }
        for row in gti_data
    ]
    
    # Находим запуски
    startups = CirculationAnalysisService.find_startups(data_list)
    
    results = []
    for i, start_idx in enumerate(startups, 1):
        start_row = data_list[start_idx]
        start_time = start_row['timestamp']
        depth_bottom = start_row.get('depth_bottom', 0) or 0
        depth_bit = start_row.get('depth_bit', 0) or 0
        
        # Получаем целевой расход для этой глубины (точечный)
        target_flow = ProgressService.get_target_flow_for_depth(depth_bottom, target_flow_by_depth)
        
        # Извлекаем данные
        seconds, flows, pressures = CirculationAnalysisService.extract_startup_data(
            data_list, start_idx, start_time
        )
        
        if len(seconds) < 10:
            continue
        
        # Находим t20 и t80
        t20, t80 = CirculationAnalysisService.find_t20_t80_points(seconds, flows, target_flow)
        delta_t = t80 - t20 if t20 and t80 else None
        
        # Находим время достижения цели
        target_reached = None
        for sec, flow in zip(seconds, flows):
            if sec >= 0 and flow >= target_flow * 0.95:
                target_reached = sec
                break
        
        # Рассчитываем углы в зоне скачка
        angle_flow, angle_press = CirculationAnalysisService.calculate_surge_zone_slopes(
            seconds, flows, pressures
        )
        
        # Рассчитываем превышение давления
        overshoot = CirculationAnalysisService.calculate_pressure_overshoot(pressures, seconds)
        
        # Собираем метрики
        metrics = {
            'target_reached_sec': target_reached,
            'delta_t_sec': delta_t,
            'flow_angle': angle_flow if angle_flow else 0,
            'press_angle': angle_press if angle_press else 0,
            'overshoot_pct': overshoot
        }
        
        # Рассчитываем качество
        quality_score = CirculationAnalysisService.calculate_quality_score(metrics)
        
        # Сохраняем результат в БД
        analysis_result = CirculationAnalysisModel(
            well_id=well_id,
            startup_number=i,
            timestamp=start_time,
            depth_bottom=depth_bottom,
            depth_bit=depth_bit,
            target_flow=target_flow,
            target_reached_sec=target_reached,
            delta_t_sec=delta_t,
            flow_angle=angle_flow or 0,
            press_angle=angle_press or 0,
            overshoot_pct=overshoot,
            quality_score=quality_score
        )
        db.add(analysis_result)
        results.append({
            "startup_number": i,
            "timestamp": start_time.isoformat() if start_time else None,
            "depth_bottom": depth_bottom,
            "depth_bit": depth_bit,
            "target_flow": target_flow,
            "target_reached_sec": target_reached,
            "delta_t_sec": delta_t,
            "flow_angle": angle_flow or 0,
            "press_angle": angle_press or 0,
            "overshoot_pct": overshoot,
            "quality_score": quality_score
        })
    
    await db.commit()
    
    # === ОБНОВЛЕНИЕ АГРЕГАТОВ ===
    from app.services.well_aggregates import WellAggregatesService
    await WellAggregatesService.update_aggregates(db, well_id)
    await WellAggregatesService.update_rank(db)
    
    # Статистика
    successful = [r for r in results if r.get('target_reached_sec')]
    
    # Средний целевой расход (для карточки — берем медиану)
    target_flows_list = [r.get('target_flow', 0) for r in results]
    avg_target_flow = sum(target_flows_list) / len(target_flows_list) if target_flows_list else 0
    
    return CirculationAnalysisListResponse(
        well_id=well_id,
        well_name=well.name,
        target_flow=round(avg_target_flow, 1),
        total_startups=len(results),
        successful_startups=len(successful),
        avg_quality_score=sum(r['quality_score'] for r in results) / len(results) if results else 0,
        results=results
    )


@router.get("/analyze/{well_id}", response_model=CirculationAnalysisListResponse)
async def get_circulation_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить результаты анализа циркуляции для скважины"""
    
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина с ID {well_id} не найдена")
    
    result = await db.execute(
        select(CirculationAnalysisModel)
        .where(CirculationAnalysisModel.well_id == well_id)
        .order_by(CirculationAnalysisModel.startup_number)
    )
    analyses = result.scalars().all()
    
    if not analyses:
        raise HTTPException(status_code=404, detail="Анализ не найден. Запустите анализ через POST /analyze/{well_id}")
    
    # Собираем целевые расходы для каждого запуска
    target_flows_list = [a.target_flow for a in analyses if a.target_flow]
    avg_target_flow = sum(target_flows_list) / len(target_flows_list) if target_flows_list else 0
    successful = [a for a in analyses if a.target_reached_sec]
    
    return CirculationAnalysisListResponse(
        well_id=well_id,
        well_name=well.name,
        target_flow=round(avg_target_flow, 1),
        total_startups=len(analyses),
        successful_startups=len(successful),
        avg_quality_score=sum(a.quality_score for a in analyses) / len(analyses) if analyses else 0,
        results=[
            {
                "startup_number": a.startup_number,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                "depth_bottom": a.depth_bottom,
                "depth_bit": a.depth_bit,
                "target_flow": a.target_flow,
                "target_reached_sec": a.target_reached_sec,
                "delta_t_sec": a.delta_t_sec,
                "flow_angle": a.flow_angle,
                "press_angle": a.press_angle,
                "overshoot_pct": a.overshoot_pct,
                "quality_score": a.quality_score
            }
            for a in analyses
        ]
    )


@router.delete("/analyze/{well_id}")
async def delete_circulation_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Удалить результаты анализа циркуляции для скважины"""
    result = await db.execute(delete(CirculationAnalysisModel).where(CirculationAnalysisModel.well_id == well_id))
    deleted_count = result.rowcount
    await db.commit()
    
    # === ОБНОВЛЕНИЕ АГРЕГАТОВ ===
    from app.services.well_aggregates import WellAggregatesService
    await WellAggregatesService.update_aggregates(db, well_id)
    await WellAggregatesService.update_rank(db)
    
    return {"message": f"Удалено {deleted_count} записей, агрегаты обновлены"}


@router.get("/progress/{well_id}")
async def get_well_progress(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Получить данные прогресса бурения для скважины"""
    
    progress = await ProgressService.get_depth_progress(db, well_id)
    startups = await ProgressService.get_well_startups_with_coords(db, well_id)
    
    return {
        "progress": progress,
        "startups": startups
    }


@router.get("/target-flow/{well_id}")
async def get_target_flow_by_depth(
    well_id: int,
    depth_interval: float = 50.0,
    outlier_multiplier: float = 1.5,
    db: AsyncSession = Depends(get_db)
):
    """Получить целевой расход по интервалам глубины (с отсечением скачков)"""
    
    result = await ProgressService.calculate_target_flow_by_depth(
        db, well_id, depth_interval, outlier_multiplier
    )
    return result