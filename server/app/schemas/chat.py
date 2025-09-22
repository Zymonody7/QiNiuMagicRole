"""
聊天相关数据模式
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ChatMessageBase(BaseModel):
    """聊天消息基础模式"""
    content: str = Field(..., description="消息内容")
    is_user: bool = Field(..., description="是否为用户消息")
    audio_url: Optional[str] = Field(None, description="音频文件URL")

class ChatMessageResponse(ChatMessageBase):
    """聊天消息响应模式"""
    id: str
    session_id: str
    metadata: Optional[dict] = {}
    timestamp: Optional[datetime]
    
    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    """聊天会话响应模式"""
    id: str
    character_id: str
    user_id: Optional[str]
    title: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    is_active: bool
    character: Optional[dict]
    message_count: int
    
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    """聊天请求模式"""
    character_id: str = Field(..., description="角色ID")
    message: str = Field(..., description="用户消息")
    user_id: Optional[str] = Field(None, description="用户ID")
    session_id: Optional[str] = Field(None, description="会话ID")
    audio_url: Optional[str] = Field(None, description="音频文件URL")

class ChatResponse(BaseModel):
    """聊天响应模式"""
    session_id: str
    user_message: dict
    ai_message: dict
    character_id: str
