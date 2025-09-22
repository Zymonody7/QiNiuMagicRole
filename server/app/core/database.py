"""
数据库配置和连接管理
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import settings
import asyncio

# 同步数据库引擎（用于Alembic迁移）
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# 异步数据库引擎（用于应用）
# 将MySQL URL转换为异步URL
async_database_url = settings.DATABASE_URL.replace("mysql+pymysql://", "mysql+aiomysql://")

async_engine = create_async_engine(
    async_database_url,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# 创建基础模型类
Base = declarative_base()

async def get_db():
    """获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    """初始化数据库"""
    # 创建所有表
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
