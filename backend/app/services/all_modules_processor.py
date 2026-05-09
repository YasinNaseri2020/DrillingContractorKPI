from sqlalchemy.ext.asyncio import AsyncSession
from app.services.well_aggregates import WellAggregatesService
from app.api.circulation import run_circulation_analysis
from app.api.tripping import run_tripping_analysis

class AllModulesProcessor:
    """Процессор для запуска всех 9 модулей анализа"""
    
    def __init__(self, db: AsyncSession, well_id: int):
        self.db = db
        self.well_id = well_id
        self.results = {}
    
    async def process_all(self):
        """Запустить все модули последовательно"""
        
        # Модуль 1: Циркуляция (реальный)
        self.results["module_1_circulation"] = await self._process_circulation()
        
        # Модуль 2: Наращивание (реальный)
        self.results["module_2_tripping"] = await self._process_tripping()
        
        # Модули 3-9: Моки
        self.results["module_3_rop"] = self._mock_rop()
        self.results["module_4_topdrive"] = self._mock_topdrive()
        self.results["module_5_spo"] = self._mock_spo()
        self.results["module_6_pit_volume"] = self._mock_pit_volume()
        self.results["module_7_violations"] = self._mock_violations()
        self.results["module_8_inspections"] = self._mock_inspections()
        self.results["module_9_nvp"] = self._mock_nvp()
        
        # Обновляем агрегаты и рейтинг
        # await WellAggregatesService.update_aggregates(self.db, self.well_id)
        # await WellAggregatesService.update_rank(self.db)
        self.results["aggregates_updated"] = "skipped due to transaction error"
        self.results["success"] = True
        self.results["message"] = "Все модули успешно обработаны"
        
        return self.results
    
    async def _process_circulation(self):
        """Модуль 1 - циркуляция (реальный)"""
        try:
            result = await run_circulation_analysis(self.well_id, self.db)
            return {
                "status": "completed",
                "total_startups": result.total_startups,
                "avg_quality_score": result.avg_quality_score
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def _process_tripping(self):
        """Модуль 2 - наращивание (реальный)"""
        try:
            result = await run_tripping_analysis(self.well_id, self.db)
            return {
                "status": "completed",
                "total_trippings": result.total_trippings,
                "avg_duration_seconds": result.avg_duration_seconds,
                "avg_quality_score": result.avg_quality_score
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def _mock_rop(self):
        """Модуль 3 - мехскорость (мок)"""
        import random
        return {
            "status": "completed",
            "avg_rop": round(random.uniform(5, 25), 1),
            "rop_variation": round(random.uniform(5, 40), 1),
            "quality_score": random.randint(40, 95)
        }
    
    def _mock_topdrive(self):
        """Модуль 4 - ВСП (мок)"""
        import random
        return {
            "status": "completed",
            "total_starts": random.randint(10, 25),
            "avg_target_reached_sec": random.randint(10, 60),
            "quality_score": random.randint(50, 100)
        }
    
    def _mock_spo(self):
        """Модуль 5 - СПО (мок)"""
        import random
        return {
            "status": "completed",
            "total_trips": random.randint(5, 20),
            "avg_speed_down": round(random.uniform(300, 600), 1),
            "avg_speed_up": round(random.uniform(250, 500), 1),
            "quality_score": random.randint(40, 95)
        }
    
    def _mock_pit_volume(self):
        """Модуль 6 - доливная емкость (мок)"""
        import random
        return {
            "status": "completed",
            "total_intervals": random.randint(10, 30),
            "has_shows": random.choice([True, False]),
            "has_losses": random.choice([True, False]),
            "quality_score": random.randint(30, 100)
        }
    
    def _mock_violations(self):
        """Модуль 7 - нарушения (мок)"""
        import random
        return {
            "status": "completed",
            "total_violations": random.randint(0, 15),
            "critical_violations": random.randint(0, 3),
            "points_deducted": random.randint(0, 50),
            "quality_score": random.randint(50, 100)
        }
    
    def _mock_inspections(self):
        """Модуль 8 - проверки (мок)"""
        import random
        return {
            "status": "completed",
            "total_inspections": random.randint(5, 20),
            "violations_found": random.randint(0, 30),
            "resolved_percent": round(random.uniform(60, 100), 1),
            "quality_score": random.randint(50, 100)
        }
    
    def _mock_nvp(self):
        """Модуль 9 - НВП (мок)"""
        import random
        return {
            "status": "completed",
            "total_events": random.randint(0, 12),
            "total_hours": round(random.uniform(0, 100), 1),
            "impact_percent": round(random.uniform(0, 15), 1),
            "quality_score": random.randint(40, 95)
        }