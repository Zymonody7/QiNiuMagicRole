"""
用户相关数据模式
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    """用户基础模式"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: str = Field(..., description="邮箱地址")

class UserCreate(UserBase):
    """创建用户模式"""
    password: str = Field(..., min_length=6, description="密码")

class UserUpdate(BaseModel):
    """更新用户模式"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class UserResponse(UserBase):
    """用户响应模式"""
    id: str
    is_active: bool
    is_premium: bool
    preferences: Optional[Dict[str, Any]]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True
