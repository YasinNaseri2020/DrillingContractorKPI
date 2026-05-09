from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import relationship
from app.core.models import BaseModel

class RawGtiData(BaseModel):
    """Сырые данные ГТИ (ежесекундные/ежеминутные записи)"""
    __tablename__ = "raw_gti_data"
    
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    # Глубины
    depth_bit = Column(Float, nullable=True)      # глубина долота (м)
    depth_bottom = Column(Float, nullable=True)   # глубина забоя (м)
    
    # Гидравлика
    flow_rate_in = Column(Float, nullable=True)   # расход на входе (л/с)
    pressure_in = Column(Float, nullable=True)    # давление на входе (атм)
    pressure_out = Column(Float, nullable=True)   # давление на выходе (атм)
    
    # Буровые параметры
    weight_on_bit = Column(Float, nullable=True)  # нагрузка на долото (т)
    rop = Column(Float, nullable=True)            # механическая скорость (м/ч)
    rpm = Column(Float, nullable=True)            # обороты ВСП (об/мин)
    torque = Column(Float, nullable=True)         # крутящий момент (кН·м)
    
    # Объемы
    tank_volume_total = Column(Float, nullable=True)   # общий объем в емкостях (м³)
    tank_refill = Column(Float, nullable=True)         # доливная емкость при СПО (м³)
    
    # Дополнительные параметры
    hookload = Column(Float, nullable=True)       # вес на крюке (т)
    block_position = Column(Float, nullable=True) # положение талевого блока (м)
    strokes_per_minute = Column(Float, nullable=True)  # ходы насоса
    temperature_in = Column(Float, nullable=True)      # температура на входе (°C)
    temperature_out = Column(Float, nullable=True)     # температура на выходе (°C)
    density_in = Column(Float, nullable=True)          # плотность на входе (кг/м³)
    density_out = Column(Float, nullable=True)         # плотность на выходе (кг/м³)
    
    # Газовый анализ
    gas_total = Column(Float, nullable=True)      # сумма углеводородов (%)
    h2s = Column(Float, nullable=True)            # сероводород (ppm)
    
    # Метаданные
    source_file = Column(String(500), nullable=True)    # имя исходного файла
    import_id = Column(Integer, nullable=True)         # ID импорта
    
    # Связи
    well = relationship("WellModel", back_populates="gti_data")
    
    # Индексы для быстрого поиска
    __table_args__ = (
        Index('idx_gti_well_timestamp', 'well_id', 'timestamp'),
        Index('idx_gti_timestamp', 'timestamp'),
    )
