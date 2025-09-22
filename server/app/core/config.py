"""
应用配置管理
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    """应用设置"""
    
    # 基础配置
    PROJECT_NAME: str = "AI角色扮演"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS配置
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # 数据库配置
    DATABASE_URL: str = "mysql+pymysql://root:password@127.0.0.1:3306/ai_roleplay"
    DATABASE_URL_TEST: str = "mysql+pymysql://root:password@127.0.0.1:3306/ai_roleplay_test"
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # OpenAI配置
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    OPENAI_MAX_TOKENS: int = 1000
    
    # 语音配置
    SPEECH_RECOGNITION_LANGUAGE: str = "zh-CN"
    TTS_LANGUAGE: str = "zh"
    TTS_SPEED: float = 1.0
    
    # 文件存储配置
    UPLOAD_DIR: str = "static/uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # 安全配置
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # 角色配置
    DEFAULT_CHARACTERS_COUNT: int = 10
    MAX_CHARACTERS_PER_USER: int = 50
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# 创建全局设置实例
settings = Settings()
