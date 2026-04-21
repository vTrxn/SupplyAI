from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy import event
import logging

from app.config import settings

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

def _build_engine() -> AsyncEngine:
    is_sqlite = settings.DATABASE_URL.startswith("sqlite")
    connect_args = {}
    if is_sqlite:
        connect_args = {"check_same_thread": False}
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=(settings.LOG_LEVEL == "debug"),
        connect_args=connect_args,
        pool_pre_ping=True,
    )
    if is_sqlite:
        @event.listens_for(engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_conn, connection_record):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return engine

engine: AsyncEngine = _build_engine()

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

async def create_tables() -> None:
    logger.info("Iniciando creación de tablas...")
    _import_all_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Tablas creadas/verificadas correctamente")

def _import_all_models() -> None:
    from app.models import user  # noqa: F401