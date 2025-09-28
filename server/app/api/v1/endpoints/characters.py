"""
角色管理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.character import CharacterCreate, CharacterUpdate, CharacterResponse
from app.services.character_service import CharacterService
from app.services.voice_service import VoiceService
from app.services.static_asset_service import static_asset_service
from app.services.qiniu_asr_service import qiniu_asr_service
from app.services.qiniu_text_service import qiniu_text_service
from app.models.character import Character
import os
import uuid
from app.core.config import settings

router = APIRouter()

async def handle_character_asset_upload(file: UploadFile, asset_type: str, character_id: str = None) -> dict:
    """
    处理角色相关资源上传
    
    Args:
        file: 上传的文件
        asset_type: 资源类型 (avatars, reference_audios)
        character_id: 角色ID
        
    Returns:
        上传结果字典
    """
    if not file or not file.filename:
        return {"success": False, "error": "没有文件"}
    
    try:
        if asset_type == "avatars":
            result = await static_asset_service.upload_character_avatar(file, character_id)
        elif asset_type == "reference_audios":
            result = await static_asset_service.upload_reference_audio(file, character_id)
        else:
            result = await static_asset_service.upload_asset(file, asset_type)
        
        if result["success"]:
            return {
                "success": True,
                "path": result["url"],
                "key": result["key"],
                "storage": result["storage"]
            }
        else:
            return result
            
    except Exception as e:
        return {
            "success": False,
            "error": f"文件上传失败: {str(e)}"
        }

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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """创建新角色 - 需要用户登录"""
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """更新角色信息 - 需要用户登录"""
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

@router.put("/{character_id}/with-audio", response_model=CharacterResponse)
async def update_character_with_audio(
    character_id: str,
    name: str = Form(...),
    description: str = Form(...),
    personality: str = Form(...),
    background: str = Form(...),
    voice_style: str = Form(None),
    category: str = Form(...),
    tags: str = Form("[]"),
    reference_audio: UploadFile = File(None),
    reference_audio_text: str = Form(None),
    reference_audio_language: str = Form("zh"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """更新角色信息（支持音频文件上传） - 需要用户登录"""
    try:
        character_service = CharacterService(db)
        voice_service = VoiceService()
        
        # 处理音频文件
        reference_audio_path = None
        asr_text = reference_audio_text
        
        if reference_audio and reference_audio.filename:
            # 先上传音频文件到存储
            upload_result = await static_asset_service.upload_reference_audio(reference_audio)
            
            if upload_result["success"]:
                reference_audio_path = upload_result["url"]
                print(f"音频文件上传成功: {reference_audio_path}")
                
                # 如果用户没有输入音频文本，尝试使用ASR自动提取
                if not reference_audio_text or reference_audio_text.strip() == "":
                    try:
                        # 优先使用七牛云ASR服务
                        if qiniu_asr_service.is_enabled():
                            print("使用七牛云ASR服务处理音频")
                            # 使用已上传的音频URL进行ASR
                            asr_text = await qiniu_asr_service.speech_to_text(
                                reference_audio_path, 
                                reference_audio_language
                            )
                            print(f"七牛云ASR提取文本成功: {asr_text}")
                        else:
                            # 回退到本地ASR服务
                            print("七牛云ASR服务不可用，使用本地ASR处理")
                            # 保存临时文件
                            temp_filename = f"temp_asr_{uuid.uuid4().hex}"
                            file_extension = os.path.splitext(reference_audio.filename)[1] if reference_audio.filename else ".wav"
                            temp_path = f"{temp_filename}{file_extension}"
                            
                            try:
                                # 保存文件
                                with open(temp_path, "wb") as buffer:
                                    content = await reference_audio.read()
                                    buffer.write(content)
                                
                                # 使用本地ASR服务
                                asr_text = await voice_service.speech_to_text(temp_path, reference_audio_language)
                                print(f"本地ASR提取文本成功: {asr_text}")
                            finally:
                                # 清理临时文件
                                if os.path.exists(temp_path):
                                    try:
                                        os.remove(temp_path)
                                    except Exception as e:
                                        print(f"清理临时文件失败: {e}")
                    except Exception as asr_error:
                        print(f"ASR处理异常: {str(asr_error)}")
                        asr_text = ""  # ASR失败时保持为空
            else:
                raise HTTPException(status_code=400, detail=f"音频文件上传失败: {upload_result['error']}")
        
        # 解析tags
        tags_list = []
        if tags:
            try:
                import json
                tags_list = json.loads(tags)
            except:
                tags_list = []
        
        # 创建角色更新数据
        character_data = CharacterUpdate(
            name=name,
            description=description,
            personality=personality,
            background=background,
            voice_style=voice_style,
            category=category,
            tags=tags_list,
            reference_audio_path=reference_audio_path,
            reference_audio_text=asr_text,
            reference_audio_language=reference_audio_language
        )
        
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """删除角色 - 需要用户登录"""
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
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """创建带音频的角色 - 需要用户登录"""
    try:
        character_service = CharacterService(db)
        voice_service = VoiceService()
        
        # 处理音频文件
        reference_audio_path = None
        asr_text = reference_audio_text  # 默认使用用户输入的文本
        
        if reference_audio and reference_audio.filename:
            # 先上传音频文件到存储
            upload_result = await static_asset_service.upload_reference_audio(reference_audio)
            
            if upload_result["success"]:
                reference_audio_path = upload_result["url"]
                print(f"音频文件上传成功: {reference_audio_path}")
                
                # 如果用户没有输入音频文本，尝试使用ASR自动提取
                if not reference_audio_text or reference_audio_text.strip() == "":
                    try:
                        # 优先使用七牛云ASR服务
                        if qiniu_asr_service.is_enabled():
                            print("使用七牛云ASR服务处理音频")
                            # 使用已上传的音频URL进行ASR
                            asr_text = await qiniu_asr_service.speech_to_text(
                                reference_audio_path, 
                                reference_audio_language
                            )
                            print(f"七牛云ASR提取文本成功: {asr_text}")
                        else:
                            # 回退到本地ASR服务
                            print("七牛云ASR服务不可用，使用本地ASR处理")
                            # 保存临时文件
                            temp_filename = f"temp_asr_{uuid.uuid4().hex}"
                            file_extension = os.path.splitext(reference_audio.filename)[1] if reference_audio.filename else ".wav"
                            temp_path = f"{temp_filename}{file_extension}"
                            
                            try:
                                # 保存文件
                                with open(temp_path, "wb") as buffer:
                                    content = await reference_audio.read()
                                    buffer.write(content)
                                
                                # 使用本地ASR服务
                                asr_text = await voice_service.speech_to_text(temp_path, reference_audio_language)
                                print(f"本地ASR提取文本成功: {asr_text}")
                            finally:
                                # 清理临时文件
                                if os.path.exists(temp_path):
                                    try:
                                        os.remove(temp_path)
                                    except Exception as e:
                                        print(f"清理临时文件失败: {e}")
                    except Exception as asr_error:
                        print(f"ASR处理异常: {str(asr_error)}")
                        asr_text = ""  # ASR失败时保持为空
            else:
                raise HTTPException(status_code=400, detail=f"音频文件上传失败: {upload_result['error']}")
        
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
        
        # 如果有音频文件，添加存储信息
        if reference_audio_path and upload_result.get("success"):
            character_data.storage_type = upload_result.get("storage", "local")
            character_data.storage_key = upload_result.get("key")
            character_data.file_size = upload_result.get("size")
            character_data.mime_type = reference_audio.content_type if reference_audio else None
        
        character = await character_service.create_character(character_data)
        
        # 返回创建结果，包含ASR信息
        result = character.to_dict() if hasattr(character, 'to_dict') else character
        result["asr_processed"] = asr_text != reference_audio_text if reference_audio_text else True
        result["asr_text"] = asr_text
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建角色失败: {str(e)}")


@router.post("/qiniu-asr")
async def qiniu_asr_transcribe(
    audio_file: UploadFile = File(...),
    language: str = Form("zh"),
    db: AsyncSession = Depends(get_db)
):
    """使用七牛云ASR进行音频转录"""
    try:
        # 验证文件类型
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="请上传音频文件")
        
        # 检查ASR服务是否可用
        if not qiniu_asr_service.is_enabled():
            raise HTTPException(
                status_code=503, 
                detail="七牛云ASR服务未启用，请配置QINIU_AI_API_KEY环境变量"
            )
        
        # 读取文件内容
        file_content = await audio_file.read()
        
        # 调用七牛云ASR服务
        transcribed_text = await qiniu_asr_service.speech_to_text_from_file(
            file_content, 
            audio_file.filename or "audio.wav", 
            language
        )
        
        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "language": language,
            "filename": audio_file.filename,
            "message": "音频转录成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # logger.error(f"七牛云ASR转录失败: {e}")
        print(f"七牛云ASR转录失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"音频转录失败: {str(e)}")

@router.get("/qiniu-asr-status")
async def get_qiniu_asr_status(db: AsyncSession = Depends(get_db)):
    """获取七牛云ASR服务状态"""
    try:
        status = qiniu_asr_service.get_service_status()
        return {
            "success": True,
            "data": status,
            "message": "服务状态获取成功"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "获取服务状态失败"
        }


@router.post("/text-process")
async def process_text(
    text: str = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """测试文本处理功能 - 将英文转换为拟声词"""
    try:
        # 检查文本处理服务是否可用
        if not qiniu_text_service.is_enabled():
            raise HTTPException(
                status_code=503, 
                detail="七牛云文本处理服务未启用，请配置QINIU_AI_API_KEY环境变量"
            )
        
        # 处理文本
        processed_text = await qiniu_text_service.english_to_onomatopoeia(text)
        
        return {
            "success": True,
            "original_text": text,
            "processed_text": processed_text,
            "message": "文本处理成功"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"文本处理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文本处理失败: {str(e)}")

@router.get("/text-process-status")
async def get_text_process_status(db: AsyncSession = Depends(get_db)):
    """获取七牛云文本处理服务状态"""
    try:
        status = await qiniu_text_service.get_service_status()
        return {
            "success": True,
            "status": status,
            "message": "服务状态获取成功"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "服务状态获取失败"
        }