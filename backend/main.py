from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db, engine
from app.api import companies, oilfields, pads, wells, gti, circulation, visualization, contractors, contractors_rating, process_all, tripping


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting Drilling Company KPI Platform...")
    if settings.DEBUG:
        await init_db()
        print("✅ Database tables created")
    yield
    await engine.dispose()
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Настройка CORS – разрешаем запросы с фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/companies", tags=["Компании"])
app.include_router(oilfields.router, prefix="/api/oilfields", tags=["Месторождения"])
app.include_router(pads.router, prefix="/api/pads", tags=["Кусты"])
app.include_router(wells.router, prefix="/api/wells", tags=["Скважины"])
app.include_router(gti.router, prefix="/api/gti", tags=["ГТИ данные"])
app.include_router(circulation.router, prefix="/api/circulation", tags=["Модуль 1: Циркуляция"])
app.include_router(visualization.router, prefix="/api/visualization", tags=["Визуализация"])
app.include_router(contractors.router, prefix="/api/contractors", tags=["Подрядчики"])
app.include_router(contractors_rating.router, prefix="/api", tags=["Рейтинг"])
app.include_router(process_all.router, prefix="/api", tags=["Обработка всех модулей"])
app.include_router(tripping.router, prefix="/api/tripping", tags=["Модуль 2: Наращивание"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )