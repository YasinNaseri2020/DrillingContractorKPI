from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CirculationMetric(BaseModel):
    """Метрики одного запуска"""
    startup_number: int
    timestamp: datetime
    depth_bottom: Optional[float] = None
    depth_bit: Optional[float] = None
    target_reached_sec: Optional[float] = None
    delta_t_sec: Optional[float] = None
    flow_angle: float = 0
    press_angle: float = 0
    overshoot_pct: float = 0
    quality_score: int = 0

class CirculationAnalysisListResponse(BaseModel):
    """Ответ со списком запусков"""
    well_id: int
    well_name: Optional[str] = None
    target_flow: float
    total_startups: int
    successful_startups: int
    avg_quality_score: float
    results: List[dict]

class RunAnalysisRequest(BaseModel):
    """Запрос на запуск анализа"""
    well_id: int

class AnalysisStatusResponse(BaseModel):
    """Статус анализа"""
    well_id: int
    status: str
    message: str
