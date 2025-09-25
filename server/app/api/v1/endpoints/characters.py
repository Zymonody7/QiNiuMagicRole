"""
角色管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse
from app.services.character_service import CharacterService
from app.services.voice_service import VoiceService
from app.models.character import Character
import os
import uuid
from app.core.config import settings

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

@router.post("/with-audio", response_model=CharacterResponse)
async def create_character_with_audio(
    name: str = Form(...),
    description: str = Form(...),
    personality: str = Form(...),
    background: str = Form(...),
    category: str = Form(...),
    avatar: Optional[str] = Form(None),
    voice_style: Optional[str] = Form(None),
    reference_audio_text: Optional[str] = Form(None),
    reference_audio_language: Optional[str] = Form("zh"),
    tags: Optional[str] = Form(None),  # JSON字符串
    reference_audio: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """创建带音频的角色"""
    try:
        character_service = CharacterService(db)
        voice_service = VoiceService()
        
        # 处理音频文件
        reference_audio_path = None
        asr_text = reference_audio_text  # 默认使用用户输入的文本
        
        if reference_audio and reference_audio.filename:
            # 确保上传目录存在
            upload_dir = os.path.join(settings.UPLOAD_DIR, "reference_audios")
            os.makedirs(upload_dir, exist_ok=True)
            
            # 生成唯一文件名
            file_extension = os.path.splitext(reference_audio.filename)[1]
            unique_filename = f"{uuid.uuid4().hex}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # 保存文件
            with open(file_path, "wb") as buffer:
                content = await reference_audio.read()
                buffer.write(content)
            
            reference_audio_path = f"/static/uploads/reference_audios/{unique_filename}"
            
            # 如果用户没有输入音频文本，尝试使用ASR自动提取
            if not reference_audio_text or reference_audio_text.strip() == "":
                try:
                    print(f"开始ASR处理音频: {file_path}")
                    asr_text = await voice_service.speech_to_text(file_path, reference_audio_language)
                    print(f"ASR提取文本成功: {asr_text}")
                except Exception as asr_error:
                    print(f"ASR处理异常: {str(asr_error)}")
                    asr_text = ""  # ASR失败时保持为空
        
        # 解析tags
        tags_list = []
        if tags:
            try:
                import json
                tags_list = json.loads(tags)
            except:
                tags_list = []
        
        # 创建角色数据
        character_data = CharacterCreate(
            name=name,
            description=description,
            personality=personality,
            background=background,
            category=category,
            avatar=avatar,
            voice_style=voice_style,
            reference_audio_path=reference_audio_path,
            reference_audio_text=asr_text,  # 使用ASR提取的文本或用户输入的文本
            reference_audio_language=reference_audio_language,
            tags=tags_list
        )
        
        character = await character_service.create_character(character_data)
        
        # 返回创建结果，包含ASR信息
        result = character.to_dict() if hasattr(character, 'to_dict') else character
        result["asr_processed"] = asr_text != reference_audio_text if reference_audio_text else True
        result["asr_text"] = asr_text
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建角色失败: {str(e)}")

@router.post("/transcribe-audio")
async def transcribe_character_audio(
    reference_audio: UploadFile = File(...),
    language: str = Form("zh"),
    db: AsyncSession = Depends(get_db)
):
    """为角色音频进行ASR转录"""
    try:
        voice_service = VoiceService()
        
        # 验证文件类型
        if not reference_audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="请上传音频文件")
        
        # 保存临时文件
        temp_filename = f"temp_asr_{uuid.uuid4().hex}"
        file_extension = os.path.splitext(reference_audio.filename)[1] if reference_audio.filename else ".wav"
        temp_path = f"{temp_filename}{file_extension}"
        
        try:
            # 保存文件
            with open(temp_path, "wb") as buffer:
                content = await reference_audio.read()
                buffer.write(content)
            
            # 执行ASR转录
            transcribed_text = await voice_service.speech_to_text(temp_path, language)
            
            return {
                "success": True,
                "transcribed_text": transcribed_text,
                "language": language,
                "message": "音频转录成功"
            }
            
        finally:
            # 清理临时文件
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as e:
                    print(f"清理临时文件失败: {e}")
                    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"音频转录失败: {str(e)}")