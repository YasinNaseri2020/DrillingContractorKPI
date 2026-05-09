from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models import WellAggregatesModel, ContractorModel

router = APIRouter()

@router.get("/contractors/rating")
async def get_contractors_rating(db: AsyncSession = Depends(get_db)):
    # Получаем все агрегаты
    result = await db.execute(select(WellAggregatesModel))
    aggregates = result.scalars().all()
    
    # Получаем всех подрядчиков
    result = await db.execute(select(ContractorModel))
    contractors_dict = {c.id: c.name for c in result.scalars().all()}
    
    # Группируем по подрядчикам
    contractors_data = {}
    for agg in aggregates:
        cid = agg.contractor_id
        if not cid:
            continue
        if cid not in contractors_data:
            contractors_data[cid] = {
                "wells": [],
                "scores": {f"m{i}": [] for i in range(1, 10)}
            }
        contractors_data[cid]["wells"].append(agg.well_id)
        contractors_data[cid]["scores"]["m1"].append(agg.circulation_avg_quality or 0)
        contractors_data[cid]["scores"]["m2"].append(agg.tripping_quality_score or 0)
        contractors_data[cid]["scores"]["m3"].append(agg.rop_quality_score or 0)
        contractors_data[cid]["scores"]["m4"].append(agg.topdrive_quality_score or 0)
        contractors_data[cid]["scores"]["m5"].append(agg.spo_quality_score or 0)
        contractors_data[cid]["scores"]["m6"].append(agg.pit_volume_quality_score or 0)
        contractors_data[cid]["scores"]["m7"].append(agg.violations_points and 100 - agg.violations_points or 0)
        contractors_data[cid]["scores"]["m8"].append(agg.inspections_total and 100 - agg.inspections_total or 0)
        contractors_data[cid]["scores"]["m9"].append(agg.nvp_impact_percent and 100 - agg.nvp_impact_percent or 0)
    
    # Формируем результат
    result = []
    for cid, data in contractors_data.items():
        m_scores = {}
        total_score_sum = 0
        for i in range(1, 10):
            module_scores = data["scores"][f"m{i}"]
            avg_score = sum(module_scores) / len(module_scores) if module_scores else 0
            m_scores[f"m{i}"] = round(avg_score, 1)
            total_score_sum += avg_score
        
        result.append({
            "contractor_id": cid,
            "contractor_name": contractors_dict.get(cid, f"Подрядчик {cid}"),
            "total_wells": len(data["wells"]),
            "total_score": round(total_score_sum / 9, 1),
            **m_scores
        })
    
    # Сортируем по общему баллу
    result.sort(key=lambda x: x["total_score"], reverse=True)
    return result
