import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import RawGtiData, CirculationAnalysisModel

class CirculationAnalysisService:
    """Сервис анализа запусков циркуляции (модуль 1)"""
    
    # Параметры конфигурации
    TARGET_FLOW_PERCENTILE = 0.85  # 85-й перцентиль расхода
    SURGE_ZONE_SECONDS = 20  # зона скачка (сек)
    MIN_FLOW_FOR_STARTUP = 5.0  # минимальный расход для определения запуска
    PREV_FLOW_MAX = 1.0  # максимальный расход перед запуском
    MIN_DISTANCE_BETWEEN_STARTUPS = 50  # минимальное расстояние между запусками (строк)
    MAX_TIME_ON_PLOT = 200  # максимальное время для графика (сек)
    
    @classmethod
    async def calculate_target_flow(cls, db: AsyncSession, well_id: int) -> float:
        """Рассчитать целевой расход (85-й перцентиль)"""
        result = await db.execute(
            select(RawGtiData.flow_rate_in)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.flow_rate_in > 5)
        )
        flows = [r[0] for r in result.all() if r[0]]
        if flows:
            return float(np.percentile(flows, cls.TARGET_FLOW_PERCENTILE * 100))
        return 70.0  # значение по умолчанию
    
    @classmethod
    def find_startups(cls, df: List[Dict]) -> List[int]:
        """Поиск моментов запусков циркуляции"""
        startups = []
        for i in range(1, len(df)):
            prev_flow = df[i-1].get('flow_rate_in', 0) or 0
            curr_flow = df[i].get('flow_rate_in', 0) or 0
            
            if prev_flow < cls.PREV_FLOW_MAX and curr_flow > cls.MIN_FLOW_FOR_STARTUP:
                startups.append(i)
        
        # Фильтрация близких запусков
        filtered = []
        for i in range(len(startups)):
            if i == 0 or (startups[i] - startups[i-1]) > cls.MIN_DISTANCE_BETWEEN_STARTUPS:
                filtered.append(startups[i])
        
        return filtered
    
    @classmethod
    def extract_startup_data(cls, data: List[Dict], start_idx: int, 
                              start_time: datetime) -> Tuple[List[float], List[float], List[float]]:
        """Извлечение данных для конкретного запуска"""
        seconds = []
        flows = []
        pressures = []
        
        for i in range(start_idx, len(data)):
            row = data[i]
            if row.get('timestamp'):
                time_diff = (row['timestamp'] - start_time).total_seconds()
                if time_diff > cls.MAX_TIME_ON_PLOT:
                    break
                seconds.append(time_diff)
                flows.append(row.get('flow_rate_in', 0) or 0)
                pressures.append(row.get('pressure_in', 0) or 0)
        
        return seconds, flows, pressures
    
    @classmethod
    def find_t20_t80_points(cls, seconds: List[float], flows: List[float], 
                            target_flow: float) -> Tuple[Optional[float], Optional[float]]:
        """Нахождение точек 20% и 80% от целевого расхода"""
        threshold_low = target_flow * 0.20
        threshold_high = target_flow * 0.80
        
        t20 = None
        t80 = None
        
        for sec, flow in zip(seconds, flows):
            if sec >= 0:
                if t20 is None and flow >= threshold_low:
                    t20 = sec
                if t80 is None and flow >= threshold_high:
                    t80 = sec
                    break
        
        return t20, t80
    
    @classmethod
    def calculate_surge_zone_slopes(cls, seconds: List[float], flows: List[float], 
                                     pressures: List[float]) -> Tuple[Optional[float], Optional[float]]:
        """Расчет углов нарастания расхода и давления в зоне скачка"""
        zone_seconds = []
        zone_flows = []
        zone_pressures = []
        
        for sec, flow, press in zip(seconds, flows, pressures):
            if sec >= 0 and sec <= cls.SURGE_ZONE_SECONDS:
                zone_seconds.append(sec)
                zone_flows.append(flow)
                zone_pressures.append(press)
        
        if len(zone_seconds) < 3:
            return None, None
        
        # Регрессия для расхода
        slope_flow = stats.linregress(zone_seconds, zone_flows)[0]
        angle_flow = np.arctan(slope_flow) * 180 / np.pi
        
        # Регрессия для давления
        slope_press = stats.linregress(zone_seconds, zone_pressures)[0]
        angle_press = np.arctan(slope_press) * 180 / np.pi
        
        return angle_flow, angle_press
    
    @classmethod
    def calculate_pressure_overshoot(cls, pressures: List[float], 
                                      seconds: List[float]) -> float:
        """Расчет превышения давления после выхода на режим"""
        pressures_after_start = [p for p, s in zip(pressures, seconds) if s >= 0]
        
        if not pressures_after_start:
            return 0
        
        pressure_peak = max(pressures_after_start)
        stable_start = max(0, len(pressures) - 15)
        pressure_stable = np.mean(pressures[stable_start:]) if stable_start < len(pressures) else pressure_peak
        
        if pressure_stable > 0:
            overshoot = (pressure_peak - pressure_stable) / pressure_stable * 100
        else:
            overshoot = 0
        
        return max(0, overshoot)
    
    @classmethod
    def calculate_quality_score(cls, metrics: Dict[str, any]) -> int:
        """Расчет итоговой оценки качества (0-100)"""
        if metrics.get('target_reached_sec') is None:
            return 0
        
        score = 100
        
        # Штраф за время разгона (delta_t)
        delta_t = metrics.get('delta_t_sec')
        if delta_t:
            if delta_t < 10:
                score -= 10
            elif delta_t > 70:
                score -= 20
            elif delta_t > 50:
                score -= 10
        
        # Штраф за угол нарастания расхода
        flow_angle = metrics.get('flow_angle', 0)
        if flow_angle:
            if flow_angle > 70:
                score -= 20
            elif flow_angle > 55:
                score -= 10
        
        # Штраф за угол нарастания давления
        press_angle = metrics.get('press_angle', 0)
        if press_angle:
            if press_angle > 65:
                score -= 20
            elif press_angle > 50:
                score -= 10
        
        # Штраф за превышение давления
        overshoot = metrics.get('overshoot_pct', 0)
        if overshoot:
            if overshoot > 30:
                score -= 20
            elif overshoot > 20:
                score -= 10
        
        return max(0, min(100, score))
