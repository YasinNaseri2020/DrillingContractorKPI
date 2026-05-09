from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class TrippingAnalysisModel(BaseModel):
    """Результаты анализа наращиваний (модуль 2)"""
    __tablename__ = "tripping_analysis"
    
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False)
    tripping_number = Column(Integer, nullable=False)  # номер наращивания по порядку
    
    # Параметры наращивания
    timestamp_start = Column(DateTime, nullable=False)  # время начала наращивания
    timestamp_end = Column(DateTime, nullable=True)     # время окончания наращивания
    depth_bottom = Column(Float)  # глубина забоя на момент начала наращивания
    depth_bit = Column(Float)     # глубина долота на момент начала наращивания
    depth_bit_diff = Column(Float, nullable=True)  # разница с предыдущим наращиванием
    
    # Метрики качества
    duration_seconds = Column(Float)  # длительность наращивания (сек)
    normal_weight = Column(Float)     # нормальный вес колонны (т)
    weight_recovered_percent = Column(Float)  # восстановление веса (%)
    pump_started = Column(Integer, default=0)  # был ли запуск насоса (0/1)
    
    # Дополнительные флаги
    is_loading = Column(Boolean, default=False)  # загрузка на клинья (не наращивание)
    
    # Отклонение от нормы
    deviation_percent = Column(Float)  # отклонение от среднего по интервалу (%)
    quality_score = Column(Integer)    # итоговая оценка качества (0-100)
    
    # Связи
    well = relationship("WellModel", back_populates="tripping_analysis")