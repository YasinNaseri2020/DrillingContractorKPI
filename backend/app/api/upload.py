from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import shutil
import os
from datetime import datetime

router = APIRouter()

@router.post("/upload")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Загрузить файл ГТИ для анализа"""
    
    # Проверка расширения
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['xlsx', 'xls', 'csv']:
        raise HTTPException(400, "Поддерживаются только .xlsx, .xls, .csv")
    
    # Сохраняем файл
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved_filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, saved_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # TODO: запустить анализ в фоне (Celery)
    # Пока возвращаем заглушку
    
    return {
        "analysis_id": 1,
        "filename": file.filename,
        "message": "Файл загружен, анализ запущен"
    }
