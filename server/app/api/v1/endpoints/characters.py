"""
角色管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.core.database import get_db
from app.models.character import Character
from app.schemas.character import CharacterResponse, CharacterCreate, CharacterUpdate
from app.services.character_service import CharacterService
from app.core.exceptions import CharacterNotFoundError

router = APIRouter()

@router.get("/", response_model=List[CharacterResponse])
async def get_characters(
    category: Optional[str] = Query(None, description="角色分类筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    popular_only: bool = Query(False, description="仅返回热门角色"),
    limit: int = Query(50, description="返回数量限制"),
    offset: int = Query(0, description="偏移量"),
    db: AsyncSession = Depends(get_db)
):
    """获取角色列表"""
    character_service = CharacterService(db)
    characters = await character_service.get_characters(
        category=category,
        search=search,
        popular_only=popular_only,
        limit=limit,
        offset=offset
    )
    return [char.to_dict() for char in characters]

@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(
    character_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取单个角色详情"""
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(character_id)
    if not character:
        raise CharacterNotFoundError(character_id)
    return character.to_dict()

@router.post("/", response_model=CharacterResponse)
async def create_character(
    character_data: CharacterCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新角色"""
    character_service = CharacterService(db)
    character = await character_service.create_character(character_data)
    return character.to_dict()

@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: str,
    character_data: CharacterUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新角色信息"""
    character_service = CharacterService(db)
    character = await character_service.update_character(character_id, character_data)
    if not character:
        raise CharacterNotFoundError(character_id)
    return character.to_dict()

@router.delete("/{character_id}")
async def delete_character(
    character_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除角色"""
    character_service = CharacterService(db)
    success = await character_service.delete_character(character_id)
    if not success:
        raise CharacterNotFoundError(character_id)
    return {"message": "角色删除成功"}

@router.get("/categories/list")
async def get_categories():
    """获取所有角色分类"""
    return {
        "categories": [
            {"id": "literature", "name": "文学"},
            {"id": "history", "name": "历史"},
            {"id": "science", "name": "科学"},
            {"id": "mythology", "name": "神话"},
            {"id": "art", "name": "艺术"},
            {"id": "philosophy", "name": "哲学"}
        ]
    }
