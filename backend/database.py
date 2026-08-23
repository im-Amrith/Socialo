import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL, 
    echo=True, 
    connect_args={"statement_cache_size": 0}
) if DATABASE_URL else None
if engine:
    SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)
else:
    SessionLocal = None

Base = declarative_base()

async def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database URL is not configured.")
    async with SessionLocal() as session:
        yield session
