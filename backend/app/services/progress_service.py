import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.models import RawGtiData, WellModel, CirculationAnalysisModel


class ProgressService:
    """Сервис для расчета прогресса бурения по времени (агрегированный по часам)"""
    
    @classmethod
    async def get_depth_progress(
        cls,
        db: AsyncSession,
        well_id: int
    ) -> Dict[str, Any]:
        """
        Получить агрегированные по часам данные прогресса бурения.
        Возвращает массивы: часы от начала, глубины (забой, долота), максимальный расход
        """
        
        # Получаем первую и последнюю запись для определения диапазона
        first_result = await db.execute(
            select(RawGtiData.timestamp)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.depth_bottom.is_not(None))
            .order_by(RawGtiData.timestamp)
            .limit(1)
        )
        first_time = first_result.scalar_one_or_none()
        
        if not first_time:
            return {"hours": [], "depths_bottom": [], "depths_bit": [], "max_flows": [], "total_hours": 0}
        
        last_result = await db.execute(
            select(RawGtiData.timestamp)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.depth_bottom.is_not(None))
            .order_by(RawGtiData.timestamp.desc())
            .limit(1)
        )
        last_time = last_result.scalar_one_or_none()
        
        if not last_time:
            return {"hours": [], "depths_bottom": [], "depths_bit": [], "max_flows": [], "total_hours": 0}
        
        total_hours = (last_time - first_time).total_seconds() / 3600
        
        # Агрегация по часам
        hours_list = []
        depths_bottom_list = []
        depths_bit_list = []
        max_flows_list = []
        
        current_hour = 0
        current_time = first_time
        
        while current_time <= last_time:
            hour_end = current_time + timedelta(hours=1)
            
            # Получаем последнюю запись за этот час (глубины)
            result = await db.execute(
                select(RawGtiData.depth_bottom, RawGtiData.depth_bit)
                .where(RawGtiData.well_id == well_id)
                .where(RawGtiData.timestamp >= current_time)
                .where(RawGtiData.timestamp < hour_end)
                .where(RawGtiData.depth_bottom.is_not(None))
                .order_by(RawGtiData.timestamp.desc())
                .limit(1)
            )
            row = result.first()
            
            # Получаем максимальный расход за этот час
            flow_result = await db.execute(
                select(func.max(RawGtiData.flow_rate_in))
                .where(RawGtiData.well_id == well_id)
                .where(RawGtiData.timestamp >= current_time)
                .where(RawGtiData.timestamp < hour_end)
                .where(RawGtiData.flow_rate_in > 0)
            )
            max_flow = flow_result.scalar() or 0
            
            hours_list.append(round(current_hour, 1))
            max_flows_list.append(round(max_flow, 1))
            
            if row:
                depths_bottom_list.append(row[0] or 0)
                depths_bit_list.append(row[1] or 0)
            else:
                # Если нет данных за час, берем предыдущее значение
                if depths_bottom_list:
                    depths_bottom_list.append(depths_bottom_list[-1])
                    depths_bit_list.append(depths_bit_list[-1])
                else:
                    depths_bottom_list.append(0)
                    depths_bit_list.append(0)
            
            current_hour += 1
            current_time = hour_end
        
        return {
            "hours": hours_list,
            "depths_bottom": depths_bottom_list,
            "depths_bit": depths_bit_list,
            "max_flows": max_flows_list,
            "total_hours": round(total_hours, 1),
            "total_days": round(total_hours / 24, 1)
        }
    
    @classmethod
    async def get_well_startups_with_coords(
        cls,
        db: AsyncSession,
        well_id: int
    ) -> List[Dict[str, Any]]:
        """
        Получить запуски с координатами для отображения на графике прогресса
        (время в сутках от начала бурения)
        """
        result = await db.execute(
            select(CirculationAnalysisModel)
            .where(CirculationAnalysisModel.well_id == well_id)
            .order_by(CirculationAnalysisModel.startup_number)
        )
        analyses = result.scalars().all()
        
        # Получаем начальное время бурения
        gti_result = await db.execute(
            select(RawGtiData.timestamp)
            .where(RawGtiData.well_id == well_id)
            .order_by(RawGtiData.timestamp)
            .limit(1)
        )
        start_time = gti_result.scalar_one_or_none()
        
        startups_coords = []
        for analysis in analyses:
            if analysis.timestamp and start_time:
                hours = (analysis.timestamp - start_time).total_seconds() / 3600
                days = hours / 24
            else:
                hours = 0
                days = 0
            
            startups_coords.append({
                "startup_number": analysis.startup_number,
                "depth_bottom": analysis.depth_bottom or 0,
                "depth_bit": analysis.depth_bit or 0,
                "time_hours": round(hours, 1),
                "time_days": round(days, 2),
                "quality_score": analysis.quality_score
            })
        
        return startups_coords
    
    @classmethod
    async def calculate_target_flow_by_depth(
        cls,
        db: AsyncSession,
        well_id: int,
        depth_interval: float = 50.0,
        outlier_multiplier: float = 1.5
    ) -> Dict[str, Any]:
        """
        Рассчитать целевой расход по интервалам глубины.
        Игнорирует выбросы (скачки) > outlier_multiplier * медианы в группе.
        Возвращает массивы: границы глубины и соответствующий целевой расход.
        """
        
        # Получаем все записи с расходом и глубиной
        result = await db.execute(
            select(RawGtiData.depth_bottom, RawGtiData.flow_rate_in)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.flow_rate_in > 0)
            .where(RawGtiData.depth_bottom.is_not(None))
            .order_by(RawGtiData.depth_bottom)
        )
        data = result.all()
        
        if not data:
            return {"depth_bins": [], "target_flows": [], "depth_interval": depth_interval}
        
        # Определяем максимальную глубину
        max_depth = max(row[0] for row in data)
        
        # Создаем интервалы по глубине
        depth_bins = []
        target_flows = []
        
        bin_start = 0
        while bin_start < max_depth:
            bin_end = bin_start + depth_interval
            
            # Собираем расходы в этом интервале глубины
            flows_in_bin = [
                row[1] for row in data
                if row[0] >= bin_start and row[0] < bin_end and row[1] > 0
            ]
            
            if flows_in_bin:
                # Медиана для определения выбросов
                median = np.median(flows_in_bin)
                threshold = median * outlier_multiplier
                
                # Отфильтровываем выбросы (скачки)
                filtered_flows = [f for f in flows_in_bin if f <= threshold]
                
                # Если после фильтрации остались данные
                if filtered_flows:
                    target_flow = np.median(filtered_flows)
                else:
                    target_flow = median
                
                depth_bins.append(round(bin_start, 0))
                target_flows.append(round(target_flow, 1))
            else:
                # Нет данных в интервале — берем предыдущее значение
                if target_flows:
                    depth_bins.append(round(bin_start, 0))
                    target_flows.append(target_flows[-1])
                else:
                    depth_bins.append(round(bin_start, 0))
                    target_flows.append(0)
            
            bin_start = bin_end
        
        return {
            "depth_bins": depth_bins,
            "target_flows": target_flows,
            "depth_interval": depth_interval,
            "outlier_multiplier": outlier_multiplier
        }
    
    @classmethod
    def get_target_flow_for_depth(cls, depth: float, target_flow_data: Dict[str, Any]) -> float:
        """
        Вернуть целевой расход для заданной глубины на основе интервалов
        """
        depth_bins = target_flow_data.get("depth_bins", [])
        target_flows = target_flow_data.get("target_flows", [])
        
        if not depth_bins or not target_flows:
            return 0
        
        for i, bin_start in enumerate(depth_bins):
            bin_end = depth_bins[i + 1] if i + 1 < len(depth_bins) else float('inf')
            if depth >= bin_start and depth < bin_end:
                return target_flows[i]
        
        return target_flows[-1] if target_flows else 0