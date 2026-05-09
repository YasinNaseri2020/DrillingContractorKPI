from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class CirculationAnalysisModel(BaseModel):
    """Результаты анализа запусков циркуляции (модуль 1)"""
    __tablename__ = "circulation_analysis"
    
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False)
    startup_number = Column(Integer, nullable=False)  # номер запуска по порядку
    
    # Параметры запуска
    timestamp = Column(DateTime, nullable=False)  # время начала запуска
    depth_bottom = Column(Float)  # глубина забоя на момент запуска
    depth_bit = Column(Float)  # глубина долота на момент запуска
    
    # Метрики качества
    target_flow = Column(Float)  # целевой расход (л/с)
    target_reached_sec = Column(Float)  # время достижения целевого расхода (сек)
    delta_t_sec = Column(Float)  # время разгона от 20% до 80% (сек)
    flow_angle = Column(Float)  # угол нарастания расхода (градусы)
    press_angle = Column(Float)  # угол нарастания давления (градусы)
    overshoot_pct = Column(Float)  # превышение давления (%)
    quality_score = Column(Integer)  # итоговая оценка качества (0-100)
    
    # Дополнительные данные (JSON)
    surge_zone_data = Column(JSON)  # данные по зоне скачка (для графиков)
    time_series_data = Column(JSON)  # полные временные ряды
    
    # Связи
    well = relationship("WellModel", back_populates="circulation_analysis")
