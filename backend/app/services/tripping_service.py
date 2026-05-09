import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import RawGtiData, TrippingAnalysisModel, WellModel


class TrippingService:
    """Сервис анализа наращиваний (модуль 2)"""
    
    # Параметры конфигурации
    WEIGHT_ZERO_THRESHOLD_DEEP = 5.0
    WEIGHT_ZERO_THRESHOLD_SHALLOW = 0.5
    MIN_TRIPPING_DURATION = 30
    MAX_TRIPPING_DURATION = 1800
    FLOW_START_THRESHOLD = 5.0
    LOADING_MAX_DURATION = 90
    SHALLOW_DEPTH_THRESHOLD = 500
    BLOCK_POSITION_CHANGE_THRESHOLD = 0.5  # метров для определения загрузки на клинья
    
    @classmethod
    def get_weight_zero_threshold(cls, depth: float) -> float:
        """Вернуть порог веса в зависимости от глубины"""
        if depth < cls.SHALLOW_DEPTH_THRESHOLD:
            return cls.WEIGHT_ZERO_THRESHOLD_SHALLOW
        return cls.WEIGHT_ZERO_THRESHOLD_DEEP
    
    @classmethod
    async def calculate_normal_weight(cls, db: AsyncSession, well_id: int) -> float:
        """Рассчитать нормальный вес бурильной колонны"""
        
        result = await db.execute(
            select(RawGtiData.hookload)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.flow_rate_in > 10)
            .where(RawGtiData.hookload > 10)
            .limit(1000)
        )
        weights = [r[0] for r in result.all() if r[0]]
        
        if weights:
            return float(np.median(weights))
        return 100.0
    
    @classmethod
    def find_trippings(cls, df: List[Dict]) -> List[Dict[str, Any]]:
        """
        Найти периоды операций (СПО, наращивание, разгрузка на клинья).
        Возвращает список словарей с началом и концом каждой операции.
        """
        
        trippings = []
        i = 0
        n = len(df)
        
        while i < n:
            row = df[i]
            current_weight = row.get('hookload', 0) or 0
            current_flow = row.get('flow_rate_in', 0) or 0
            current_depth_bit = row.get('depth_bit', 0) or 0
            
            weight_threshold = cls.get_weight_zero_threshold(current_depth_bit)
            
            if current_weight < weight_threshold and current_flow < cls.FLOW_START_THRESHOLD:
                start_idx = i
                start_time = row.get('timestamp')
                start_depth = row.get('depth_bottom', 0) or 0
                start_depth_bit = current_depth_bit
                
                end_idx = start_idx
                end_time = None
                weight_recovered = False
                pump_started = False
                block_positions = []
                
                for j in range(start_idx, min(start_idx + 1000, n)):
                    check_row = df[j]
                    check_weight = check_row.get('hookload', 0) or 0
                    check_flow = check_row.get('flow_rate_in', 0) or 0
                    check_block_pos = check_row.get('block_position', 0) or 0
                    
                    block_positions.append(check_block_pos)
                    
                    if check_weight > weight_threshold:
                        weight_recovered = True
                    if check_flow > cls.FLOW_START_THRESHOLD:
                        pump_started = True
                    
                    if weight_recovered or pump_started:
                        end_idx = j
                        end_time = check_row.get('timestamp')
                        break
                
                if end_time and start_time:
                    duration = (end_time - start_time).total_seconds()
                    
                    # Проверяем изменение положения талевого блока
                    block_position_change = max(block_positions) - min(block_positions) if block_positions else 0
                    
                    # Если изменение положения ТБ менее 9 метров — это разгрузка на клинья
                    is_loading = block_position_change < cls.BLOCK_POSITION_CHANGE_THRESHOLD
                    
                    if cls.MIN_TRIPPING_DURATION <= duration <= cls.MAX_TRIPPING_DURATION:
                        trippings.append({
                            "start_time": start_time,
                            "end_time": end_time,
                            "duration_seconds": duration,
                            "depth_bottom": start_depth,
                            "depth_bit": start_depth_bit,
                            "weight_recovered": weight_recovered,
                            "pump_started": pump_started,
                            "is_loading": is_loading,
                            "block_position_change": round(block_position_change, 1)
                        })
                
                i = end_idx + 1 if end_idx > start_idx else i + 1
            else:
                i += 1
        
        return trippings
    
    @classmethod
    def calculate_quality_score(
        cls, 
        duration: float, 
        median_duration: float,
        weight_recovered: bool,
        pump_started: bool,
        is_loading: bool = False
    ) -> int:
        """Расчёт оценки качества операции (0-100)"""
        
        # Разгрузка на клинья — всегда низкое качество
        if is_loading:
            return 10
        
        if median_duration == 0:
            return 100
        
        ratio = duration / median_duration
        
        if ratio <= 1.0:
            score = 100
        elif ratio <= 1.5:
            score = 80
        elif ratio <= 2.0:
            score = 60
        elif ratio <= 2.5:
            score = 40
        elif ratio <= 3.0:
            score = 20
        else:
            score = 0
        
        if not weight_recovered and not pump_started:
            score = max(0, score - 30)
        elif not weight_recovered:
            score = max(0, score - 15)
        elif not pump_started:
            score = max(0, score - 10)
        
        return score
    
    @classmethod
    async def get_median_duration_by_depth(
        cls,
        db: AsyncSession,
        well_id: int,
        depth_interval: float = 50.0,
        outlier_multiplier: float = 1.5
    ) -> Dict[str, Any]:
        """Рассчитать медианную длительность операции по интервалам глубины"""
        
        result = await db.execute(
            select(TrippingAnalysisModel)
            .where(TrippingAnalysisModel.well_id == well_id)
            .where(TrippingAnalysisModel.is_loading == False)
            .order_by(TrippingAnalysisModel.tripping_number)
        )
        trippings = result.scalars().all()
        
        if not trippings:
            return {"depth_bins": [], "median_durations": []}
        
        max_depth = max(t.depth_bottom for t in trippings) if trippings else 0
        
        depth_bins = []
        median_durations = []
        
        bin_start = 0
        while bin_start < max_depth:
            bin_end = bin_start + depth_interval
            
            durations = [
                t.duration_seconds for t in trippings
                if t.depth_bottom >= bin_start and t.depth_bottom < bin_end
                and t.duration_seconds
            ]
            
            if durations:
                median = np.median(durations)
                threshold = median * outlier_multiplier
                filtered = [d for d in durations if d <= threshold]
                
                if filtered:
                    median_duration = np.median(filtered)
                else:
                    median_duration = median
                
                depth_bins.append(round(bin_start, 0))
                median_durations.append(round(median_duration, 1))
            else:
                if median_durations:
                    depth_bins.append(round(bin_start, 0))
                    median_durations.append(median_durations[-1])
            
            bin_start = bin_end
        
        return {
            "depth_bins": depth_bins,
            "median_durations": median_durations,
            "depth_interval": depth_interval
        }
    
    @classmethod
    async def get_distribution_by_depth(
        cls,
        db: AsyncSession,
        well_id: int,
        depth_interval: float = 50.0
    ) -> Dict[str, Any]:
        """Получить распределение операций по интервалам глубины долота"""
        
        result = await db.execute(
            select(TrippingAnalysisModel)
            .where(TrippingAnalysisModel.well_id == well_id)
            .where(TrippingAnalysisModel.is_loading == False)
            .order_by(TrippingAnalysisModel.depth_bit)
        )
        trippings = result.scalars().all()
        
        if not trippings:
            return {"depth_bins": [], "counts": []}
        
        max_depth = max(t.depth_bit for t in trippings) if trippings else 0
        
        depth_bins = []
        counts = []
        
        bin_start = 0
        while bin_start < max_depth:
            bin_end = bin_start + depth_interval
            
            count = sum(
                1 for t in trippings
                if t.depth_bit >= bin_start and t.depth_bit < bin_end
            )
            
            depth_bins.append(round(bin_start, 0))
            counts.append(count)
            
            bin_start = bin_end
        
        return {
            "depth_bins": depth_bins,
            "counts": counts,
            "depth_interval": depth_interval
        }
    
    @classmethod
    async def get_tripping_chart_data(
        cls,
        db: AsyncSession,
        well_id: int,
        tripping_number: int
    ) -> Optional[Dict[str, Any]]:
        """Получить детальные данные для графика операции"""

        result = await db.execute(
            select(TrippingAnalysisModel)
            .where(TrippingAnalysisModel.well_id == well_id)
            .where(TrippingAnalysisModel.tripping_number == tripping_number)
        )
        tripping = result.scalar_one_or_none()
        
        if not tripping:
            return None
        
        start_time = tripping.timestamp_start
        end_time = tripping.timestamp_end
        
        if not end_time and tripping.duration_seconds:
            end_time = start_time + timedelta(seconds=tripping.duration_seconds)
        elif not end_time:
            end_time = start_time + timedelta(minutes=30)
        
        start_time_minus = start_time - timedelta(minutes=1)
        end_time_plus = end_time + timedelta(seconds=30)
        
        result = await db.execute(
            select(RawGtiData)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.timestamp >= start_time_minus)
            .where(RawGtiData.timestamp <= end_time_plus)
            .order_by(RawGtiData.timestamp)
        )
        gti_data = result.scalars().all()
        
        seconds = []
        block_positions = []
        hookloads = []
        flow_rates = []
        pressures = []
        
        for row in gti_data:
            sec = (row.timestamp - start_time).total_seconds()
            seconds.append(sec)
            block_positions.append(row.block_position or 0)
            hookloads.append(row.hookload or 0)
            flow_rates.append(row.flow_rate_in or 0)
            pressures.append(row.pressure_in or 0)
        
        end_second = (end_time - start_time).total_seconds()
        
        return {
            "tripping_number": tripping_number,
            "timestamp_start": start_time.isoformat(),
            "timestamp_end": end_time.isoformat() if tripping.timestamp_end else None,
            "depth_bottom": tripping.depth_bottom,
            "duration_seconds": tripping.duration_seconds,
            "quality_score": tripping.quality_score,
            "seconds": seconds,
            "block_positions": block_positions,
            "hookloads": hookloads,
            "flow_rates": flow_rates,
            "pressures": pressures,
            "start_second": 0,
            "end_second": end_second
        }