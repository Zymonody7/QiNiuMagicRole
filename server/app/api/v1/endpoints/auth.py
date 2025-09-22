"""
认证API端点
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import create_access_token, get_current_active_user
from app.schemas.auth import LoginRequest, RegisterRequest, Token, UserProfile, ChangePasswordRequest
from app.schemas.user import UserCreate
from app.services.user_service import UserService
from app.core.config import settings
from datetime import timedelta

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(
    user_data: RegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    """用户注册"""
    user_service = UserService(db)
    
    # 检查用户名是否已存在
    if await user_service.get_user_by_username(user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 检查邮箱是否已存在
    if await user_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已存在"
        )
    
    # 创建用户
    user_create = UserCreate(
        username=user_data.username,
        email=user_data.email,
        password=user_data.password
    )
    
    user = await user_service.create_user(user_create)
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    # 更新最后登录时间
    await user_service.update_last_login(user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/login", response_model=Token)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """用户登录"""
    user_service = UserService(db)
    
    # 验证用户凭据
    user = await user_service.authenticate_user(login_data.username, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 检查用户是否激活
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户账户已被禁用"
        )
    
    # 创建访问令牌
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    # 更新最后登录时间
    await user_service.update_last_login(user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user = Depends(get_current_active_user)
):
    """获取当前用户信息"""
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_active=current_user.is_active,
        is_premium=current_user.is_premium,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """修改密码"""
    user_service = UserService(db)
    
    success = await user_service.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="当前密码错误"
        )
    
    return {"message": "密码修改成功"}

@router.post("/logout")
async def logout():
    """用户登出"""
    # 在实际应用中，这里可以将令牌加入黑名单
    return {"message": "登出成功"}
