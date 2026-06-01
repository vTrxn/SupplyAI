import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.models.user import User, Company
from app.routers import auth, inventory, alerts, chat, forecast, routes, excel, provider

os.makedirs("uploads", exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title="SupplyAI",
    description="Plataforma IA cadena de suministros Bogota",
    version="0.1.0",
    lifespan=lifespan
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


app.include_router(auth.router,      prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(alerts.router,    prefix="/api/v1")
app.include_router(chat.router,      prefix="/api/v1")
app.include_router(forecast.router,  prefix="/api/v1")  # ← Forecast IA
app.include_router(routes.router,    prefix="/api/v1")  # ← Rutas
app.include_router(excel.router,     prefix="/api/v1")  # ← Excel Integrador
app.include_router(provider.router,  prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "SupplyAI API corriendo", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "ok"}