"""
角色数据模型
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class Character(Base):
    """角色模型"""
    __tablename__ = "characters"
    
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    avatar = Column(String(500), nullable=True)
    personality = Column(Text, nullable=False)
    background = Column(Text, nullable=False)
    voice_style = Column(String(200), nullable=True)
    reference_audio_path = Column(String(500), nullable=True)  # 参考音频文件路径
    reference_audio_text = Column(Text, nullable=True)  # 参考音频对应的文本
    reference_audio_language = Column(String(10), nullable=True, default="zh")  # 参考音频语言
    # 存储相关字段
    storage_type = Column(String(20), default="local")  # 存储类型: qiniu, local
    storage_key = Column(String(500), nullable=True)  # 存储key或路径
    file_size = Column(Integer, nullable=True)  # 文件大小(字节)
    mime_type = Column(String(100), nullable=True)  # MIME类型
    category = Column(String(50), nullable=False, index=True)
    tags = Column(JSON, nullable=True)  # 存储标签列表
    popularity = Column(Integer, default=0)
    is_popular = Column(Boolean, default=False)
    is_custom = Column(Boolean, default=False)
    created_by = Column(String(100), nullable=True)  # 创建者ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "avatar": self.avatar,
            "personality": self.personality,
            "background": self.background,
            "voice_style": self.voice_style,
            "reference_audio_path": self.reference_audio_path,
            "reference_audio_text": self.reference_audio_text,
            "reference_audio_language": self.reference_audio_language,
            "storage_type": self.storage_type,
            "storage_key": self.storage_key,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "category": self.category,
            "tags": self.tags or [],
            "popularity": self.popularity,
            "is_popular": self.is_popular,
            "is_custom": self.is_custom,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
