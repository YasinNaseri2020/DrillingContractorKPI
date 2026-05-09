from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class WellAggregatesModel(BaseModel):
    """Агрегированные данные по скважине (одна строка на скважину)"""
    __tablename__ = "well_aggregates"
    
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False, unique=True, index=True)
    contractor_id = Column(Integer, nullable=True)
    pad_id = Column(Integer, nullable=True)
    
    # Основная информация
    well_name = Column(String(100))
    well_number = Column(String(50))
    
    # Модуль 1: Циркуляция
    circulation_total_startups = Column(Integer, default=0)
    circulation_successful_startups = Column(Integer, default=0)
    circulation_avg_quality = Column(Float, default=0)
    circulation_avg_flow_angle = Column(Float, default=0)
    circulation_avg_press_angle = Column(Float, default=0)
    circulation_avg_delta_t = Column(Float, default=0)
    circulation_best_quality = Column(Integer, default=0)
    circulation_worst_quality = Column(Integer, default=0)
    
    # Модуль 2: Наращивание
    tripping_total = Column(Integer, default=0)
    tripping_avg_duration = Column(Float, default=0)
    tripping_avg_quality = Column(Float, default=0)
    tripping_best_quality = Column(Integer, default=0)
    tripping_worst_quality = Column(Integer, default=0)
    
    # Модуль 3: ROP
    rop_avg_value = Column(Float, default=0)
    rop_avg_variation = Column(Float, default=0)
    rop_quality_score = Column(Float, default=0)
    
    # Модуль 4: ВСП
    topdrive_avg_target_reached_sec = Column(Float, default=0)
    topdrive_avg_torque_variation = Column(Float, default=0)
    topdrive_quality_score = Column(Float, default=0)
    
    # Модуль 5: СПО
    spo_avg_speed_down = Column(Float, default=0)
    spo_avg_speed_up = Column(Float, default=0)
    spo_quality_score = Column(Float, default=0)
    
    # Модуль 6: Доливная емкость
    pit_volume_avg_deviation = Column(Float, default=0)
    pit_volume_has_shows = Column(Integer, default=0)
    pit_volume_has_losses = Column(Integer, default=0)
    pit_volume_quality_score = Column(Float, default=0)
    
    # Модуль 7: Нарушения
    violations_total = Column(Integer, default=0)
    violations_critical = Column(Integer, default=0)
    violations_repeated = Column(Integer, default=0)
    violations_points = Column(Integer, default=0)
    
    # Модуль 8: Проверки
    inspections_total = Column(Integer, default=0)
    inspections_by_supervisor = Column(Integer, default=0)
    inspections_by_hse = Column(Integer, default=0)
    inspections_by_regional = Column(Integer, default=0)
    inspections_by_fountain = Column(Integer, default=0)
    
    # Модуль 9: НВП
    nvp_total_hours = Column(Float, default=0)
    nvp_events_count = Column(Integer, default=0)
    nvp_impact_percent = Column(Float, default=0)
    
    # Итоговые метрики
    total_score = Column(Float, default=0)
    rank = Column(Integer, default=0)
    
    # Связи
    well = relationship("WellModel", back_populates="aggregates")
