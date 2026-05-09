from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from datetime import datetime
from typing import Optional

from app.core.database import get_db
from app.models import WellModel, RawGtiData, TrippingAnalysisModel
from app.schemas.tripping import TrippingAnalysisListResponse, TrippingAnalysisPaginatedResponse
from app.services.tripping_service import TrippingService

router = APIRouter()


@router.post("/analyze/{well_id}", response_model=TrippingAnalysisListResponse)
async def run_tripping_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Запустить анализ наращиваний для скважины (модуль 2)"""
    
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина с ID {well_id} не найдена")
    
    result = await db.execute(
        select(RawGtiData)
        .where(RawGtiData.well_id == well_id)
        .order_by(RawGtiData.timestamp)
    )
    gti_data = result.scalars().all()
    
    if not gti_data:
        raise HTTPException(status_code=404, detail="ГТИ данные не найдены для этой скважины")
    
    normal_weight = await TrippingService.calculate_normal_weight(db, well_id)
    
    data_list = [
        {
            "timestamp": row.timestamp,
            "hookload": row.hookload,
            "flow_rate_in": row.flow_rate_in,
            "depth_bottom": row.depth_bottom,
            "depth_bit": row.depth_bit
        }
        for row in gti_data
    ]
    
    trippings_raw = TrippingService.find_trippings(data_list)
    
    await db.execute(delete(TrippingAnalysisModel).where(TrippingAnalysisModel.well_id == well_id))
    await db.commit()
    
    median_by_depth = await TrippingService.get_median_duration_by_depth(db, well_id)
    
    results = []
    previous_depth_bit = None
    
    for i, trip in enumerate(trippings_raw, 1):
        depth = trip.get('depth_bottom', 0)
        depth_bit = trip.get('depth_bit', 0)
        duration = trip.get('duration_seconds', 0)
        is_loading = trip.get('is_loading', False)
        
        depth_bit_diff = None
        if previous_depth_bit is not None:
            depth_bit_diff = depth_bit - previous_depth_bit
        previous_depth_bit = depth_bit
        
        median_duration = 120.0
        if median_by_depth.get('depth_bins'):
            for j, bin_start in enumerate(median_by_depth['depth_bins']):
                bin_end = median_by_depth['depth_bins'][j + 1] if j + 1 < len(median_by_depth['depth_bins']) else float('inf')
                if depth >= bin_start and depth < bin_end:
                    median_duration = median_by_depth['median_durations'][j]
                    break
        
        quality_score = TrippingService.calculate_quality_score(
            duration=duration,
            median_duration=median_duration,
            weight_recovered=trip.get('weight_recovered', False),
            pump_started=trip.get('pump_started', False),
            is_loading=is_loading
        )
        
        analysis_result = TrippingAnalysisModel(
            well_id=well_id,
            tripping_number=i,
            timestamp_start=trip['start_time'],
            timestamp_end=trip['end_time'],
            depth_bottom=depth,
            depth_bit=depth_bit,
            depth_bit_diff=depth_bit_diff,
            duration_seconds=duration,
            normal_weight=normal_weight,
            weight_recovered_percent=100 if trip.get('weight_recovered') else 0,
            pump_started=1 if trip.get('pump_started') else 0,
            is_loading=is_loading,
            quality_score=quality_score
        )
        db.add(analysis_result)
        
        results.append({
            "tripping_number": i,
            "timestamp_start": trip['start_time'].isoformat(),
            "timestamp_end": trip['end_time'].isoformat() if trip['end_time'] else None,
            "depth_bottom": depth,
            "depth_bit": depth_bit,
            "depth_bit_diff": depth_bit_diff,
            "duration_seconds": duration,
            "weight_recovered": trip.get('weight_recovered', False),
            "pump_started": trip.get('pump_started', False),
            "is_loading": is_loading,
            "quality_score": quality_score
        })
    
    await db.commit()
    
    non_loading_results = [r for r in results if not r.get('is_loading', False)]
    avg_quality = sum(r['quality_score'] for r in non_loading_results) / len(non_loading_results) if non_loading_results else 0
    avg_duration = sum(r['duration_seconds'] for r in non_loading_results) / len(non_loading_results) if non_loading_results else 0
    
    from app.services.well_aggregates import WellAggregatesService
    await WellAggregatesService.update_aggregates(db, well_id)
    await WellAggregatesService.update_rank(db)
    
    return TrippingAnalysisListResponse(
        well_id=well_id,
        well_name=well.name,
        total_trippings=len([r for r in results if not r.get('is_loading', False)]),
        avg_quality_score=round(avg_quality, 1),
        avg_duration_seconds=round(avg_duration, 1),
        results=results
    )


@router.get("/analyze/{well_id}", response_model=TrippingAnalysisPaginatedResponse)
async def get_tripping_analysis(
    well_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Получить результаты анализа наращиваний для скважины с пагинацией"""
    
    result = await db.execute(select(WellModel).where(WellModel.id == well_id))
    well = result.scalar_one_or_none()
    if not well:
        raise HTTPException(status_code=404, detail=f"Скважина с ID {well_id} не найдена")
    count_result = await db.execute(
        select(func.count()).select_from(TrippingAnalysisModel)
        .where(TrippingAnalysisModel.well_id == well_id)
    )
    total = count_result.scalar()
    
    result = await db.execute(
        select(TrippingAnalysisModel)
        .where(TrippingAnalysisModel.well_id == well_id)
        .order_by(TrippingAnalysisModel.tripping_number)
        .offset(skip)
        .limit(limit)
    )
    analyses = result.scalars().all()
    
    gti_result = await db.execute(
        select(RawGtiData.timestamp)
        .where(RawGtiData.well_id == well_id)
        .order_by(RawGtiData.timestamp)
        .limit(1)
    )
    start_time = gti_result.scalar_one_or_none()
    
    if not analyses and total == 0:
        raise HTTPException(status_code=404, detail="Анализ не найден. Запустите анализ через POST /analyze/{well_id}")
    
    # Рассчитываем среднее качество и среднюю длительность
    avg_quality = sum(a.quality_score for a in analyses) / len(analyses) if analyses else 0
    avg_duration = sum(a.duration_seconds for a in analyses) / len(analyses) if analyses else 0
    
    results = [
        {
            "tripping_number": a.tripping_number,
            "timestamp_start": a.timestamp_start.isoformat(),
            "timestamp_end": a.timestamp_end.isoformat() if a.timestamp_end else None,
            "depth_bottom": a.depth_bottom,
            "depth_bit": a.depth_bit,
            "depth_bit_diff": a.depth_bit_diff,
            "duration_seconds": a.duration_seconds,
            "weight_recovered": bool(a.weight_recovered_percent > 0),
            "pump_started": bool(a.pump_started),
            "is_loading": a.is_loading,
            "quality_score": a.quality_score
        }
        for a in analyses
    ]
    
    return TrippingAnalysisPaginatedResponse(
        well_id=well_id,
        well_name=well.name,
        total=total,
        skip=skip,
        limit=limit,
        results=results,
        start_time=start_time,
        avg_quality_score=round(avg_quality, 1),
        avg_duration_seconds=round(avg_duration, 1)  # <-- ДОБАВИТЬ
    )

@router.delete("/analyze/{well_id}")
async def delete_tripping_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        delete(TrippingAnalysisModel).where(TrippingAnalysisModel.well_id == well_id)
    )
    deleted_count = result.rowcount
    await db.commit()
    
    from app.services.well_aggregates import WellAggregatesService
    await WellAggregatesService.update_aggregates(db, well_id)
    await WellAggregatesService.update_rank(db)
    
    return {"message": f"Удалено {deleted_count} записей"}


@router.get("/median/{well_id}")
async def get_tripping_median_by_depth(
    well_id: int,
    depth_interval: float = 50.0,
    outlier_multiplier: float = 1.5,
    db: AsyncSession = Depends(get_db)
):
    result = await TrippingService.get_median_duration_by_depth(
        db, well_id, depth_interval, outlier_multiplier
    )
    return result


@router.get("/distribution/{well_id}")
async def get_tripping_distribution(
    well_id: int,
    depth_interval: float = 50.0,
    db: AsyncSession = Depends(get_db)
):
    """Получить распределение наращиваний по интервалам глубины долота"""
    
    result = await TrippingService.get_distribution_by_depth(
        db, well_id, depth_interval
    )
    return result


@router.get("/chart/{well_id}/{tripping_number}")
async def get_tripping_chart(
    well_id: int,
    tripping_number: int,
    db: AsyncSession = Depends(get_db)
):
    data = await TrippingService.get_tripping_chart_data(db, well_id, tripping_number)
    
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"Наращивание #{tripping_number} для скважины {well_id} не найдено"
        )
    
    return data