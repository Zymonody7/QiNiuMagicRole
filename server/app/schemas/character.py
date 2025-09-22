"""
角色相关数据模型
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class CharacterBase(BaseModel):
    """角色基础模型"""
    name: str = Field(..., description="角色名称")
    description: str = Field(..., description="角色描述")
    avatar: Optional[str] = Field(None, description="角色头像URL")
    personality: str = Field(..., description="角色性格")
    background: str = Field(..., description="角色背景")
    voice_style: Optional[str] = Field(None, description="语音风格")
    category: str = Field(..., description="角色分类")
    tags: Optional[List[str]] = Field(default=[], description="角色标签")    

class CharacterCreate(CharacterBase):
    """创建角色模型"""
    pass

class CharacterUpdate(BaseModel):
    """更新角色模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    avatar: Optional[str] = None
    personality: Optional[str] = None
    background: Optional[str] = None
    voice_style: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    popularity: Optional[int] = None
    is_popular: Optional[bool] = None

class CharacterResponse(CharacterBase):
    """角色响应模型"""
    id: str
    popularity: int
    is_popular: bool
    is_custom: bool
    created_by: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True