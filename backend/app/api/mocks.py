from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import random

router = APIRouter()

# =========================================================
# МОДУЛЬ 2: Наращивание колонн (Mock)
# =========================================================

class TrippingMock(BaseModel):
    startup_number: int
    timestamp: datetime
    depth_bottom: float
    time_per_connection_sec: Optional[float] = None
    total_tripping_time_sec: Optional[float] = None
    connections_count: int = 0
    quality_score: int = 0

@router.get("/tripping/{well_id}", response_model=List[TrippingMock])
async def get_tripping_mock(well_id: int):
    """МОК: Анализ наращивания колонн (модуль 2)"""
    return [
        TrippingMock(
            startup_number=i,
            timestamp=datetime.now() - timedelta(days=i),
            depth_bottom=50 + i * 20,
            time_per_connection_sec=random.randint(30, 120),
            total_tripping_time_sec=random.randint(300, 600),
            connections_count=random.randint(1, 5),
            quality_score=random.randint(50, 100)
        )
        for i in range(1, 28)
    ]


# =========================================================
# МОДУЛЬ 3: Однородность механической скорости (Mock)
# =========================================================

class ROPStabilityMock(BaseModel):
    startup_number: int
    timestamp: datetime
    interval_start: float
    interval_end: float
    avg_rop: float
    rop_variation: float  # коэффициент вариации
    quality_score: int

@router.get("/rop-stability/{well_id}", response_model=List[ROPStabilityMock])
async def get_rop_stability_mock(well_id: int):
    """МОК: Однородность механической скорости (модуль 3)"""
    return [
        ROPStabilityMock(
            startup_number=i,
            timestamp=datetime.now() - timedelta(days=i),
            interval_start=50 + (i-1) * 20,
            interval_end=50 + i * 20,
            avg_rop=random.uniform(5, 25),
            rop_variation=random.uniform(5, 40),
            quality_score=random.randint(40, 95)
        )
        for i in range(1, 28)
    ]


# =========================================================
# МОДУЛЬ 4: Выход на режим ВСП (Mock)
# =========================================================

class TopdriveMock(BaseModel):
    startup_number: int
    timestamp: datetime
    depth_bottom: float
    target_rpm: float
    target_reached_sec: Optional[float]
    torque_variation: float
    quality_score: int

@router.get("/topdrive/{well_id}", response_model=List[TopdriveMock])
async def get_topdrive_mock(well_id: int):
    """МОК: Выход на режим ВСП (модуль 4)"""
    return [
        TopdriveMock(
            startup_number=i,
            timestamp=datetime.now() - timedelta(days=i),
            depth_bottom=50 + i * 20,
            target_rpm=random.choice([80, 100, 120, 150]),
            target_reached_sec=random.randint(10, 60) if random.random() > 0.2 else None,
            torque_variation=random.uniform(2, 20),
            quality_score=random.randint(30, 100)
        )
        for i in range(1, 28)
    ]


# =========================================================
# МОДУЛЬ 5: Скорость СПО (Mock)
# =========================================================

class SPOMock(BaseModel):
    trip_id: int
    timestamp: datetime
    depth_start: float
    depth_end: float
    speed_down_m_per_h: float
    speed_up_m_per_h: float
    quality_score: int

@router.get("/spo/{well_id}", response_model=List[SPOMock])
async def get_spo_mock(well_id: int):
    """МОК: Скорость СПО (модуль 5)"""
    return [
        SPOMock(
            trip_id=i,
            timestamp=datetime.now() - timedelta(days=i),
            depth_start=100 + (i-1) * 50,
            depth_end=100 + i * 50,
            speed_down_m_per_h=random.uniform(300, 600),
            speed_up_m_per_h=random.uniform(250, 500),
            quality_score=random.randint(40, 95)
        )
        for i in range(1, 15)
    ]


# =========================================================
# МОДУЛЬ 6: Динамика доливной емкости (Mock)
# =========================================================

class PitVolumeMock(BaseModel):
    interval_number: int
    timestamp: datetime
    depth_interval: str
    volume_deviation_m3: float
    has_show: bool
    has_loss: bool
    quality_score: int

@router.get("/pit-volume/{well_id}", response_model=List[PitVolumeMock])
async def get_pit_volume_mock(well_id: int):
    """МОК: Динамика доливной емкости (модуль 6)"""
    return [
        PitVolumeMock(
            interval_number=i,
            timestamp=datetime.now() - timedelta(days=i),
            depth_interval=f"{50 + (i-1)*50}-{50 + i*50} м",
            volume_deviation_m3=random.uniform(-5, 5),
            has_show=random.random() > 0.8,
            has_loss=random.random() > 0.9,
            quality_score=random.randint(30, 100)
        )
        for i in range(1, 20)
    ]


# =========================================================
# МОДУЛЬ 7: Нарушения и происшествия (Mock)
# =========================================================

class ViolationMock(BaseModel):
    violation_id: int
    inspection_date: datetime
    inspector: str
    violation_type: str
    severity: int
    description: str
    is_repeated: bool
    is_resolved: bool
    points_deducted: int

@router.get("/violations/{well_id}", response_model=List[ViolationMock])
async def get_violations_mock(well_id: int):
    """МОК: Нарушения и происшествия (модуль 7)"""
    inspectors = ["Супервайзер", "Промбезопасность", "Региональный", "Фонтанная безопасность"]
    types = ["Технология бурения", "Промбезопасность", "Охрана труда", "Экология"]
    
    return [
        ViolationMock(
            violation_id=i,
            inspection_date=datetime.now() - timedelta(days=i*5),
            inspector=random.choice(inspectors),
            violation_type=random.choice(types),
            severity=random.randint(1, 5),
            description=f"Нарушение #{i} при выполнении работ",
            is_repeated=random.random() > 0.7,
            is_resolved=random.random() > 0.3,
            points_deducted=random.randint(5, 30)
        )
        for i in range(1, 16)
    ]


# =========================================================
# МОДУЛЬ 8: Многосубъектность проверок (Mock)
# =========================================================

class InspectionMock(BaseModel):
    inspection_id: int
    inspection_date: datetime
    inspector: str
    inspector_weight: float
    violations_found: int
    critical_violations: int
    resolved_on_time: bool

@router.get("/inspections/{well_id}", response_model=List[InspectionMock])
async def get_inspections_mock(well_id: int):
    """МОК: Многосубъектность проверок (модуль 8)"""
    inspectors = [
        ("Супервайзер", 1.0),
        ("Промбезопасность", 1.5),
        ("Региональный", 2.0),
        ("Фонтанная безопасность", 2.5)
    ]
    
    result = []
    for i in range(1, 21):
        inspector, weight = random.choice(inspectors)
        result.append(InspectionMock(
            inspection_id=i,
            inspection_date=datetime.now() - timedelta(days=i*3),
            inspector=inspector,
            inspector_weight=weight,
            violations_found=random.randint(0, 8),
            critical_violations=random.randint(0, 2),
            resolved_on_time=random.random() > 0.3
        ))
    return result


# =========================================================
# МОДУЛЬ 9: Непроизводительное время (НВП) (Mock)
# =========================================================

class NVPTimeMock(BaseModel):
    nvp_id: int
    event_date: datetime
    description: str
    duration_hours: float
    responsible_contractor: str
    impact_percent: float

@router.get("/nvp/{well_id}", response_model=List[NVPTimeMock])
async def get_nvp_mock(well_id: int):
    """МОК: Непроизводительное время (модуль 9)"""
    reasons = [
        "Ожидание распоряжений",
        "Ремонт оборудования",
        "Ожидание долота",
        "Технические проблемы",
        "Погодные условия",
        "Ожидание цемента"
    ]
    
    return [
        NVPTimeMock(
            nvp_id=i,
            event_date=datetime.now() - timedelta(days=i*7),
            description=random.choice(reasons),
            duration_hours=random.uniform(1, 48),
            responsible_contractor=f"Подрядчик {random.randint(1, 3)}",
            impact_percent=random.uniform(0.5, 15)
        )
        for i in range(1, 13)
    ]


# =========================================================
# СВОДНЫЙ РЕЙТИНГ (Mock)
# =========================================================

class RatingMock(BaseModel):
    well_id: int
    well_name: str
    total_score: float
    module_1_score: float
    module_2_score: float
    module_3_score: float
    module_4_score: float
    module_5_score: float
    module_6_score: float
    module_7_score: float
    module_8_score: float
    module_9_score: float
    rank: int

@router.get("/rating/{company_id}", response_model=List[RatingMock])
async def get_rating_mock(company_id: int):
    """МОК: Сводный рейтинг подрядчиков"""
    return [
        RatingMock(
            well_id=1,
            well_name="Скважина 1",
            total_score=62.6,
            module_1_score=62.6,
            module_2_score=random.randint(50, 90),
            module_3_score=random.randint(50, 90),
            module_4_score=random.randint(50, 90),
            module_5_score=random.randint(50, 90),
            module_6_score=random.randint(50, 90),
            module_7_score=random.randint(50, 90),
            module_8_score=random.randint(50, 90),
            module_9_score=random.randint(50, 90),
            rank=1
        ),
        RatingMock(
            well_id=2,
            well_name="Скважина 2",
            total_score=71.3,
            module_1_score=71.3,
            module_2_score=random.randint(50, 90),
            module_3_score=random.randint(50, 90),
            module_4_score=random.randint(50, 90),
            module_5_score=random.randint(50, 90),
            module_6_score=random.randint(50, 90),
            module_7_score=random.randint(50, 90),
            module_8_score=random.randint(50, 90),
            module_9_score=random.randint(50, 90),
            rank=2
        ),
        RatingMock(
            well_id=3,
            well_name="Скважина 3",
            total_score=48.2,
            module_1_score=48.2,
            module_2_score=random.randint(50, 90),
            module_3_score=random.randint(50, 90),
            module_4_score=random.randint(50, 90),
            module_5_score=random.randint(50, 90),
            module_6_score=random.randint(50, 90),
            module_7_score=random.randint(50, 90),
            module_8_score=random.randint(50, 90),
            module_9_score=random.randint(50, 90),
            rank=3
        )
    ]
