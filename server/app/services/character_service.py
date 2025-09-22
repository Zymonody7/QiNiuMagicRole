"""
角色服务层
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, and_, select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate
import uuid
from datetime import datetime

class CharacterService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_characters(
        self,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[Character]:
        """获取角色列表"""
        query = select(Character)
        
        # 分类过滤
        if category and category != "all":
            query = query.where(Character.category == category)
        
        # 搜索过滤
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Character.name.ilike(search_term),
                    Character.description.ilike(search_term),
                    Character.personality.ilike(search_term)
                )
            )
        
        # 排序和分页
        query = query.order_by(Character.popularity.desc(), Character.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        characters = result.scalars().all()
        return characters

    async def get_character_by_id(self, character_id: str) -> Optional[Character]:
        """根据ID获取角色"""
        query = select(Character).where(Character.id == character_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create_character(self, character_data: CharacterCreate) -> Character:
        """创建新角色"""
        character = Character(
            id=str(uuid.uuid4()),
            name=character_data.name,
            description=character_data.description,
            avatar=character_data.avatar,
            personality=character_data.personality,
            background=character_data.background,
            voice_style=character_data.voice_style,
            category=character_data.category,
            tags=character_data.tags or [],
            is_custom=True,
            created_by=None  # 可以根据用户认证信息设置
        )
        
        self.db.add(character)
        await self.db.commit()
        await self.db.refresh(character)
        return character

    async def update_character(self, character_id: str, character_data: CharacterUpdate) -> Optional[Character]:
        """更新角色信息"""
        character = await self.get_character_by_id(character_id)
        if not character:
            return None
        
        # 更新字段
        update_data = character_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(character, field):
                setattr(character, field, value)
        
        # 处理特殊字段映射
        if hasattr(character_data, 'voice_style') and character_data.voice_style is not None:
            character.voice_style = character_data.voice_style
        
        if hasattr(character_data, 'is_popular') and character_data.is_popular is not None:
            character.is_popular = character_data.is_popular
        
        character.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(character)
        return character

    async def delete_character(self, character_id: str) -> bool:
        """删除角色"""
        character = await self.get_character_by_id(character_id)
        if not character:
            return False
        
        await self.db.delete(character)
        await self.db.commit()
        return True

    async def get_popular_characters(self, limit: int = 10) -> List[Character]:
        """获取热门角色"""
        query = select(Character).where(Character.is_popular == True).order_by(Character.popularity.desc()).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def increment_popularity(self, character_id: str) -> bool:
        """增加角色人气"""
        character = await self.get_character_by_id(character_id)
        if not character:
            return False
        
        character.popularity += 1
        await self.db.commit()
        return True