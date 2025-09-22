"""
聊天相关数据模型
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ChatSession(Base):
    """聊天会话模型"""
    __tablename__ = "chat_sessions"
    
    id = Column(String(50), primary_key=True, index=True)
    character_id = Column(String(50), ForeignKey("characters.id"), nullable=False)
    user_id = Column(String(100), nullable=True)  # 用户ID，可为空支持匿名
    title = Column(String(200), nullable=True)  # 会话标题
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    
    # 关系
    character = relationship("Character")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")
    
    # def to_dict(self):
    #     """转换为字典"""
    #     return {
    #         "id": self.id,
    #         "characterId": self.character_id,
    #         "userId": self.user_id,
    #         "title": self.title,
    #         "createdAt": self.created_at.isoformat() if self.created_at else None,
    #         "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
    #         "isActive": self.is_active,
    #         "character": self.character.to_dict() if self.character else None,
    #         "messageCount": len(self.messages) if self.messages else 0
    #     }
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "character_id": self.character_id,   # 蛇形
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at,       # 蛇形
            "updated_at": self.updated_at,
            "is_active": self.is_active,
            "character": self.character.to_dict() if self.character else None,
            "message_count": len(self.messages),
        }
class ChatMessage(Base):
    """聊天消息模型"""
    __tablename__ = "chat_messages"
    
    id = Column(String(50), primary_key=True, index=True)
    session_id = Column(String(50), ForeignKey("chat_sessions.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_user = Column(Boolean, nullable=False)  # True为用户消息，False为AI消息
    audio_url = Column(String(500), nullable=True)  # 音频文件URL
    message_metadata = Column(JSON, nullable=True)  # 额外元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    session = relationship("ChatSession", back_populates="messages")
    
    def to_dict(self):
        """转换为字典"""
        return {
            "id": self.id,
            "sessionId": self.session_id,
            "content": self.content,
            "isUser": self.is_user,
            "audioUrl": self.audio_url,
            "metadata": self.message_metadata or {},
            "timestamp": self.created_at.isoformat() if self.created_at else None
        }
