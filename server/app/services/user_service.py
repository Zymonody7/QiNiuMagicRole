"""
用户服务
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.auth import verify_password, get_password_hash
import uuid
from datetime import datetime

class UserService:
    """用户服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """根据ID获取用户"""
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """根据用户名获取用户"""
        query = select(User).where(User.username == username)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """根据邮箱获取用户"""
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_user(self, user_data: UserCreate) -> User:
        """创建用户"""
        # 加密密码
        hashed_password = get_password_hash(user_data.password)
        
        user = User(
            id=str(uuid.uuid4()),
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """更新用户"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        # 更新字段
        update_data = user_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        await self.db.commit()
        await self.db.refresh(user)
        return user
    
    async def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        await self.db.delete(user)
        await self.db.commit()
        return True
    
    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """用户认证"""
        user = await self.get_user_by_username(username)
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        return user
    
    async def update_last_login(self, user_id: str) -> bool:
        """更新最后登录时间"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.last_login = datetime.utcnow()
        await self.db.commit()
        return True
    
    async def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """修改密码"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        # 验证当前密码
        if not verify_password(current_password, user.hashed_password):
            return False
        
        # 更新密码
        user.hashed_password = get_password_hash(new_password)
        await self.db.commit()
        return True
