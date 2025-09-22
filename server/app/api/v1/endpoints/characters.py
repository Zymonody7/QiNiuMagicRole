"""
角色管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse
from app.services.character_service import CharacterService
from app.models.character import Character

router = APIRouter()

@router.get("/", response_model=List[CharacterResponse])
async def get_characters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取角色列表"""
    try:
        character_service = CharacterService(db)
        characters = await character_service.get_characters(
            skip=skip,
            limit=limit,
            category=category,
            search=search
        )
        return characters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取角色列表失败: {str(e)}")

@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character_by_id(
    character_id: str,
    db: AsyncSession = Depends(get_db)
):
    """根据ID获取角色详情"""
    try:
        character_service = CharacterService(db)
        character = await character_service.get_character_by_id(character_id)
        
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return character
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取角色详情失败: {str(e)}")

@router.post("/", response_model=CharacterResponse)
async def create_character(
    character_data: CharacterCreate,
    db: AsyncSession = Depends(get_db)
):
    """创建新角色"""
    try:
        character_service = CharacterService(db)
        character = await character_service.create_character(character_data)
        return character
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建角色失败: {str(e)}")

@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: str,
    character_data: CharacterUpdate,
    db: AsyncSession = Depends(get_db)
):
    """更新角色信息"""
    try:
        character_service = CharacterService(db)
        character = await character_service.update_character(character_id, character_data)
        
        if not character:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return character
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新角色失败: {str(e)}")

@router.delete("/{character_id}")
async def delete_character(
    character_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除角色"""
    try:
        character_service = CharacterService(db)
        success = await character_service.delete_character(character_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="角色不存在")
        
        return {"message": "角色删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除角色失败: {str(e)}")

@router.get("/popular/list", response_model=List[CharacterResponse])
async def get_popular_characters(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """获取热门角色"""
    try:
        character_service = CharacterService(db)
        characters = await character_service.get_popular_characters(limit=limit)
        return characters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取热门角色失败: {str(e)}")