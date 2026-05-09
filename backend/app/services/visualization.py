import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import RawGtiData, CirculationAnalysisModel, WellModel
from app.services.circulation_analysis import CirculationAnalysisService


class VisualizationService:
    """Сервис для подготовки данных визуализации"""
    
    @classmethod
    async def get_startup_chart_data(
        cls, 
        db: AsyncSession, 
        well_id: int, 
        startup_number: int
    ) -> Optional[Dict]:
        """Получить данные для графика конкретного запуска"""
        
        # Получаем результат анализа
        result = await db.execute(
            select(CirculationAnalysisModel)
            .where(CirculationAnalysisModel.well_id == well_id)
            .where(CirculationAnalysisModel.startup_number == startup_number)
        )
        analysis = result.scalar_one_or_none()
        
        if not analysis:
            return None
        
        # Получаем ГТИ данные для этого запуска
        start_time = analysis.timestamp
        end_time = start_time + np.timedelta64(CirculationAnalysisService.MAX_TIME_ON_PLOT, 's')
        
        # Получаем данные начиная с start_time - 5 секунд
        start_time_minus = start_time - timedelta(seconds=5)
        
        result = await db.execute(
            select(RawGtiData)
            .where(RawGtiData.well_id == well_id)
            .where(RawGtiData.timestamp >= start_time_minus)
            .where(RawGtiData.timestamp <= end_time)
            .order_by(RawGtiData.timestamp)
        )
        gti_data = result.scalars().all()
        
        seconds = []
        flows = []
        pressures = []
        surge_seconds = []
        surge_flows = []
        surge_pressures = []
        
        for row in gti_data:
            sec = (row.timestamp - start_time).total_seconds()
            seconds.append(sec)
            flows.append(row.flow_rate_in or 0)
            pressures.append(row.pressure_in or 0)
            
            # Зона скачка (первые 20 секунд) — только положительное время
            if 0 <= sec <= 20:
                surge_seconds.append(sec)
                surge_flows.append(row.flow_rate_in or 0)
                surge_pressures.append(row.pressure_in or 0)
        
        # Рассчитываем линии тренда
        flow_trend = []
        press_trend = []
        
        if len(surge_seconds) >= 2:
            if analysis.flow_angle:
                slope_flow = np.tan(np.radians(analysis.flow_angle))
                flow_start = surge_flows[0] if surge_flows else 0
                flow_trend = [flow_start + slope_flow * s for s in surge_seconds]
            
            if analysis.press_angle:
                slope_press = np.tan(np.radians(analysis.press_angle))
                press_start = surge_pressures[0] if surge_pressures else 0
                press_trend = [press_start + slope_press * s for s in surge_seconds]
        
        return {
            "startup_number": analysis.startup_number,
            "timestamp": analysis.timestamp,
            "depth_bottom": analysis.depth_bottom,
            "depth_bit": analysis.depth_bit,
            "quality_score": analysis.quality_score,
            "seconds": seconds,
            "flows": flows,
            "pressures": pressures,
            "surge_seconds": surge_seconds,
            "surge_flows": surge_flows,
            "surge_pressures": surge_pressures,
            "flow_trend": flow_trend,
            "press_trend": press_trend,
            "target_flow": analysis.target_flow,
            "target_reached_sec": analysis.target_reached_sec,
            "flow_angle": analysis.flow_angle,
            "press_angle": analysis.press_angle
        }
    
    @classmethod
    async def get_dashboard_summary(
        cls, 
        db: AsyncSession, 
        well_id: int
    ) -> Dict:
        """Получить сводку для дашборда"""
        
        result = await db.execute(
            select(CirculationAnalysisModel)
            .where(CirculationAnalysisModel.well_id == well_id)
            .order_by(CirculationAnalysisModel.startup_number)
        )
        analyses = result.scalars().all()
        
        if not analyses:
            return {}
        
        # Распределение качества
        quality_dist = {
            "excellent": 0,  # 90-100
            "good": 0,       # 70-89
            "average": 0,    # 50-69
            "poor": 0        # 0-49
        }
        
        quality_by_depth = []
        
        for a in analyses:
            if a.quality_score >= 90:
                quality_dist["excellent"] += 1
            elif a.quality_score >= 70:
                quality_dist["good"] += 1
            elif a.quality_score >= 50:
                quality_dist["average"] += 1
            else:
                quality_dist["poor"] += 1
            
            quality_by_depth.append({
                "depth": a.depth_bottom,
                "quality": a.quality_score,
                "startup": a.startup_number
            })
        
        # Находим лучший и худший запуски
        best = max(analyses, key=lambda x: x.quality_score) if analyses else None
        worst = min(analyses, key=lambda x: x.quality_score) if analyses else None
        
        # Статистика по углам
        flow_angles = [a.flow_angle for a in analyses if a.flow_angle > 0]
        press_angles = [a.press_angle for a in analyses if a.press_angle > 0]
        delta_ts = [a.delta_t_sec for a in analyses if a.delta_t_sec]
        
        successful = [a for a in analyses if a.target_reached_sec]
        
        return {
            "well_id": well_id,
            "well_name": analyses[0].well.name if analyses else "",
            "total_startups": len(analyses),
            "successful_startups": len(successful),
            "avg_quality_score": sum(a.quality_score for a in analyses) / len(analyses),
            "quality_distribution": quality_dist,
            "quality_by_depth": quality_by_depth,
            "avg_flow_angle": sum(flow_angles) / len(flow_angles) if flow_angles else 0,
            "avg_press_angle": sum(press_angles) / len(press_angles) if press_angles else 0,
            "avg_delta_t": sum(delta_ts) / len(delta_ts) if delta_ts else None,
            "best_startup": {
                "number": best.startup_number,
                "quality": best.quality_score,
                "depth": best.depth_bottom
            } if best else None,
            "worst_startup": {
                "number": worst.startup_number,
                "quality": worst.quality_score,
                "depth": worst.depth_bottom
            } if worst else None
        }
    
    @classmethod
    async def get_wells_comparison(
        cls, 
        db: AsyncSession, 
        company_id: Optional[int] = None
    ) -> List[Dict]:
        """Получить данные для сравнения скважин"""
        
        query = select(CirculationAnalysisModel)
        
        if company_id:
            query = query.join(WellModel).where(WellModel.company_id == company_id)
        
        result = await db.execute(query)
        analyses = result.scalars().all()
        
        # Группируем по скважинам
        wells_data = {}
        for a in analyses:
            well_id = a.well_id
            if well_id not in wells_data:
                wells_data[well_id] = {
                    "well_id": well_id,
                    "well_name": a.well.name if a.well else "",
                    "qualities": [],
                    "flow_angles": [],
                    "press_angles": [],
                    "total_startups": 0
                }
            wells_data[well_id]["qualities"].append(a.quality_score)
            if a.flow_angle > 0:
                wells_data[well_id]["flow_angles"].append(a.flow_angle)
            if a.press_angle > 0:
                wells_data[well_id]["press_angles"].append(a.press_angle)
            wells_data[well_id]["total_startups"] += 1
        
        result = []
        for data in wells_data.values():
            result.append({
                "well_id": data["well_id"],
                "well_name": data["well_name"],
                "avg_quality": sum(data["qualities"]) / len(data["qualities"]) if data["qualities"] else 0,
                "total_startups": data["total_startups"],
                "avg_flow_angle": sum(data["flow_angles"]) / len(data["flow_angles"]) if data["flow_angles"] else 0,
                "avg_press_angle": sum(data["press_angles"]) / len(data["press_angles"]) if data["press_angles"] else 0
            })
        
        # Сортируем по качеству
        result.sort(key=lambda x: x["avg_quality"], reverse=True)
        
        return result