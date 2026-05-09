from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChartDataPoint(BaseModel):
    """Точка для графика"""
    x: float  # время (сек)
    y: float  # значение (расход/давление)

class StartupChartData(BaseModel):
    """Данные для графика одного запуска"""
    startup_number: int
    timestamp: datetime
    depth_bottom: float
    depth_bit: float
    quality_score: int
    
    # Временные ряды
    seconds: List[float]
    flows: List[float]
    pressures: List[float]
    
    # Зона скачка
    surge_seconds: List[float]
    surge_flows: List[float]
    surge_pressures: List[float]
    
    # Линии тренда
    flow_trend: List[float]
    press_trend: List[float]
    
    # Метрики
    target_flow: float
    target_reached_sec: Optional[float]
    flow_angle: float
    press_angle: float

class DashboardSummary(BaseModel):
    """Сводка для дашборда"""
    well_id: int
    well_name: str
    total_startups: int
    successful_startups: int
    avg_quality_score: float
    
    # Распределение качества
    quality_distribution: dict
    
    # Тренд качества по глубине
    quality_by_depth: List[dict]
    
    # Статистика по углам
    avg_flow_angle: float
    avg_press_angle: float
    avg_delta_t: Optional[float]
    
    # Худшие и лучшие запуски
    best_startup: Optional[dict]
    worst_startup: Optional[dict]

class WellComparisonData(BaseModel):
    """Данные для сравнения скважин"""
    well_id: int
    well_name: str
    avg_quality: float
    total_startups: int
    avg_flow_angle: float
    avg_press_angle: float
    total_nvp_hours: float  # непроизводительное время
