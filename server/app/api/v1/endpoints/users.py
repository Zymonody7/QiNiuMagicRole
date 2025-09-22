"""
用户管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.user import UserResponse, UserCreate, UserUpdate
from app.schemas.auth import UserProfile
from app.services.user_service import UserService

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """用户注册"""
    user_service = UserService(db)
    
    # 检查用户名和邮箱是否已存在
    if await user_service.get_user_by_username(user_data.username):
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    if await user_service.get_user_by_email(user_data.email):
        raise HTTPException(status_code=400, detail="邮箱已存在")
    
    # 创建用户
    user = await user_service.create_user(user_data)
    return user.to_dict()

@router.get("/me", response_model=UserProfile)
async def get_current_user(
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

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """更新当前用户信息"""
    user_service = UserService(db)
    user = await user_service.update_user(current_user.id, user_data)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user.to_dict()

@router.delete("/me")
async def delete_current_user(
    current_user = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """删除当前用户"""
    user_service = UserService(db)
    success = await user_service.delete_user(current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"message": "用户删除成功"}
