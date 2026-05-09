import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

class GtiParserService:
    """Сервис для парсинга файлов ГТИ (Excel, CSV)"""
    
    COLUMN_MAPPING = {
        "timestamp": ["время", "time", "timestamp", "дата", "date", "datetime"],
        "depth_bit": ["глубина долота", "бит", "depth bit"],
        "depth_bottom": ["глубина забоя", "depth", "md", "забой"],
        "flow_rate_in": ["расход на входе", "flow", "q", "расход"],
        "pressure_in": ["давление на входе", "pressure in", "p_in", "давление"],
        "pressure_out": ["давление на выходе", "pressure out", "p_out"],
        "weight_on_bit": ["нагрузка на долото", "wob", "нагрузка"],
        "rop": ["мех скорость", "rop", "механическая скорость"],
        "rpm": ["обороты вс", "rpm", "обороты"],
        "torque": ["момент вс", "torque", "момент"],
        "tank_volume_total": ["объем емкости", "tank volume", "объем"],
        "hookload": ["вес на крюке", "hookload", "вес"],
        "block_position": ["Положение ТБ", "положение тб", "block position", "талевый блок", "положение талевого блока"],
    }
    
    @classmethod
    def detect_columns(cls, columns: List[str]) -> Dict[str, str]:
        mapping = {}
        for col in columns:
            col_lower = col.lower().strip()
            for target, keywords in cls.COLUMN_MAPPING.items():
                if any(kw in col_lower for kw in keywords):
                    mapping[target] = col
                    break
        return mapping
    
    @classmethod
    def parse_file(cls, file_path: str, well_id: int) -> List[Dict[str, Any]]:
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path)
        elif file_ext == '.csv':
            df = pd.read_csv(file_path, encoding='utf-8')
        else:
            raise ValueError(f"Неподдерживаемый формат: {file_ext}")
        
        column_mapping = cls.detect_columns(df.columns.tolist())
        
        rename_dict = {v: k for k, v in column_mapping.items() if v in df.columns}
        if rename_dict:
            df = df.rename(columns=rename_dict)
        
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
            df = df.dropna(subset=['timestamp'])
        
        df = df.replace({np.nan: None})
        
        records = []
        for _, row in df.iterrows():
            record = {
                "well_id": well_id,
                "timestamp": row.get('timestamp'),
                "depth_bit": row.get('depth_bit'),
                "depth_bottom": row.get('depth_bottom'),
                "flow_rate_in": row.get('flow_rate_in'),
                "pressure_in": row.get('pressure_in'),
                "pressure_out": row.get('pressure_out'),
                "weight_on_bit": row.get('weight_on_bit'),
                "rop": row.get('rop'),
                "rpm": row.get('rpm'),
                "torque": row.get('torque'),
                "tank_volume_total": row.get('tank_volume_total'),
                "hookload": row.get('hookload'),
                "block_position": row.get('block_position'),
            }
            records.append(record)
        
        return records