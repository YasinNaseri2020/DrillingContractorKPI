from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models import WellAggregatesModel, CirculationAnalysisModel, WellModel
from app.models import TrippingAnalysisModel

class WellAggregatesService:
    """Сервис для обновления агрегированных данных по скважине"""
    
    @classmethod
    async def update_aggregates(cls, db: AsyncSession, well_id: int):
        """Обновить агрегаты для конкретной скважины"""
        
        # Начинаем новую "чистую" транзакцию
        async with db.begin_nested():
            # Получаем скважину
            well = await db.get(WellModel, well_id)
            if not well:
                return
            
            # Получаем результаты модуля 1
            circulation = await db.execute(
                select(CirculationAnalysisModel).where(CirculationAnalysisModel.well_id == well_id)
            )
            analyses = circulation.scalars().all()
            
            # Получаем или создаем запись агрегатов
            agg_result = await db.execute(
                select(WellAggregatesModel).where(WellAggregatesModel.well_id == well_id)
            )
            aggregates = agg_result.scalar_one_or_none()
            
            if not aggregates:
                aggregates = WellAggregatesModel(well_id=well_id)
                db.add(aggregates)
            
            # Заполняем базовую информацию
            aggregates.well_name = well.name
            aggregates.well_number = well.well_id
            aggregates.pad_id = well.pad_id
            
            # Модуль 1: Циркуляция
            if analyses:
                successful = [a for a in analyses if a.target_reached_sec]
                flow_angles = [a.flow_angle for a in analyses if a.flow_angle > 0]
                press_angles = [a.press_angle for a in analyses if a.press_angle > 0]
                
                aggregates.circulation_total_startups = len(analyses)
                aggregates.circulation_successful_startups = len(successful)
                aggregates.circulation_avg_quality = sum(a.quality_score for a in analyses) / len(analyses)
                aggregates.circulation_avg_flow_angle = sum(flow_angles) / len(flow_angles) if flow_angles else 0
                aggregates.circulation_avg_press_angle = sum(press_angles) / len(press_angles) if press_angles else 0
                aggregates.circulation_best_quality = max(a.quality_score for a in analyses)
                aggregates.circulation_worst_quality = min(a.quality_score for a in analyses)
                aggregates.total_score = aggregates.circulation_avg_quality
            else:
                aggregates.circulation_total_startups = 0
                aggregates.circulation_successful_startups = 0
                aggregates.circulation_avg_quality = 0
                aggregates.circulation_avg_flow_angle = 0
                aggregates.circulation_avg_press_angle = 0
                aggregates.circulation_best_quality = 0
                aggregates.circulation_worst_quality = 0
            
            # Модуль 2: Наращивание
            tripping_res = await db.execute(
                select(TrippingAnalysisModel).where(TrippingAnalysisModel.well_id == well_id)
            )
            trippings = tripping_res.scalars().all()
            if trippings:
                durations = [t.duration_seconds for t in trippings if t.duration_seconds]
                qualities = [t.quality_score for t in trippings]
                
                aggregates.tripping_total = len(trippings)
                aggregates.tripping_avg_duration = sum(durations) / len(durations) if durations else 0
                aggregates.tripping_avg_quality = sum(qualities) / len(qualities) if qualities else 0
                aggregates.tripping_best_quality = max(qualities) if qualities else 0
                aggregates.tripping_worst_quality = min(qualities) if qualities else 0
            else:
                aggregates.tripping_total = 0
                aggregates.tripping_avg_duration = 0
                aggregates.tripping_avg_quality = 0
                aggregates.tripping_best_quality = 0
                aggregates.tripping_worst_quality = 0
            
            # Явно помечаем, что изменения нужно сохранить
            await db.flush()
    
    @classmethod
    async def get_all_wells_summary(cls, db: AsyncSession):
        """Получить сводку по всем скважинам для сравнения"""
        result = await db.execute(
            select(WellAggregatesModel).order_by(WellAggregatesModel.total_score.desc())
        )
        return result.scalars().all()
    
    @classmethod
    async def update_rank(cls, db: AsyncSession):
        """Обновить ранги всех скважин по total_score"""
        # Получаем все агрегаты
        aggregates_list = await cls.get_all_wells_summary(db)
        
        # Обновляем ранги
        for idx, agg in enumerate(aggregates_list, 1):
            agg.rank = idx
        
        await db.flush()