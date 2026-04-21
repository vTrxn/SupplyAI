# backend/app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str = "sqlite+aiosqlite:///./supplyai_dev.db"

    # JWT — en producción cambiar SECRET_KEY por una cadena larga y aleatoria
    SECRET_KEY: str = "supplyai-secret-key-cambiar-en-produccion-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8

    # App
    APP_NAME: str = "SupplyAI"
    DEBUG: bool = True
    LOG_LEVEL: str = "info"

    # API Keys
    GROQ_API_KEY: str | None = None

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()