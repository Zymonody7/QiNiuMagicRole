"""
认证相关数据模式
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    """令牌响应模式"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    """令牌数据模式"""
    user_id: Optional[str] = None

class LoginRequest(BaseModel):
    """登录请求模式"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    password: str = Field(..., min_length=6, description="密码")

class RegisterRequest(BaseModel):
    """注册请求模式"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, description="密码")

class UserProfile(BaseModel):
    """用户资料模式"""
    id: str
    username: str
    email: str
    is_active: bool
    is_premium: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ChangePasswordRequest(BaseModel):
    """修改密码请求模式"""
    current_password: str = Field(..., description="当前密码")
    new_password: str = Field(..., min_length=6, description="新密码")
