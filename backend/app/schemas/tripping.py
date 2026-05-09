from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TrippingMetric(BaseModel):
    """Метрики одного наращивания"""
    tripping_number: int
    timestamp_start: datetime
    timestamp_end: Optional[datetime] = None
    depth_bottom: Optional[float] = None
    depth_bit: Optional[float] = None
    depth_bit_diff: Optional[float] = None
    duration_seconds: Optional[float] = None
    normal_weight: Optional[float] = None
    weight_recovered_percent: Optional[float] = None
    pump_started: bool = False
    is_loading: bool = False
    deviation_percent: Optional[float] = None
    quality_score: int = 0

class TrippingAnalysisListResponse(BaseModel):
    """Ответ со списком наращиваний"""
    well_id: int
    well_name: Optional[str] = None
    total_trippings: int
    avg_quality_score: float
    avg_duration_seconds: float
    results: List[dict]

class TrippingAnalysisPaginatedResponse(BaseModel):
    """Ответ с пагинацией"""
    well_id: int
    well_name: Optional[str] = None
    total: int
    skip: int
    limit: int
    results: List[dict]
    start_time: Optional[datetime] = None
    avg_quality_score: float = 0
    avg_duration_seconds: float = 0  # <-- ДОБАВИТЬ


class TrippingChartData(BaseModel):
    """Данные для графика наращивания"""
    tripping_number: int
    timestamp_start: datetime
    timestamp_end: Optional[datetime] = None
    depth_bottom: float
    duration_seconds: float
    quality_score: int
    weight_before: float
    weight_after: float
    weight_recovered: float