"""
角色服务
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from app.models.character import Character
from app.schemas.character import CharacterCreate, CharacterUpdate
import uuid

class CharacterService:
    """角色服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_characters(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        popular_only: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[Character]:
        """获取角色列表"""
        query = select(Character)
        
        # 添加筛选条件
        conditions = []
        
        if category:
            conditions.append(Character.category == category)
        
        if popular_only:
            conditions.append(Character.is_popular == True)
        
        if search:
            search_condition = or_(
                Character.name.ilike(f"%{search}%"),
                Character.description.ilike(f"%{search}%"),
                Character.personality.ilike(f"%{search}%")
            )
            conditions.append(search_condition)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # 排序和分页
        query = query.order_by(Character.popularity.desc()).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
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
            is_custom=True
        )
        
        self.db.add(character)
        await self.db.commit()
        await self.db.refresh(character)
        return character
    
    async def update_character(
        self, 
        character_id: str, 
        character_data: CharacterUpdate
    ) -> Optional[Character]:
        """更新角色"""
        character = await self.get_character_by_id(character_id)
        if not character:
            return None
        
        # 更新字段
        update_data = character_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(character, field, value)
        
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
    
    async def increment_popularity(self, character_id: str) -> bool:
        """增加角色人气"""
        character = await self.get_character_by_id(character_id)
        if not character:
            return False
        
        character.popularity += 1
        await self.db.commit()
        return True
