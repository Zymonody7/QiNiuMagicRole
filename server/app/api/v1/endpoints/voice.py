"""
语音处理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.voice_service import VoiceService
from app.core.exceptions import VoiceProcessingError
import os
import uuid
import logging
from app.core.config import settings

# 设置日志
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/speech-to-text")
async def speech_to_text(
    audio_file: UploadFile = File(...),
    language: str = Form(default="zh-CN"),
    db: AsyncSession = Depends(get_db)
):
    """语音转文字"""
    try:
        voice_service = VoiceService()
        
        # 验证文件类型
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="请上传音频文件")
        
        # 保存临时文件
        temp_path = f"temp_{audio_file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await audio_file.read()
            buffer.write(content)
        
        try:
            # 转换为文字
            text = await voice_service.speech_to_text(temp_path, language)
            
            return {
                "success": True,
                "text": text,
                "language": language
            }
        finally:
            # 清理临时文件
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        raise VoiceProcessingError(f"语音识别失败: {str(e)}")

@router.post("/text-to-speech")
async def text_to_speech(
    text: str = Form(...),
    character_id: str = Form(...),
    language: str = Form(default="zh"),
    speed: float = Form(default=1.0),
    db: AsyncSession = Depends(get_db)
):
    """文字转语音"""
    try:
        voice_service = VoiceService()
        
        # 根据角色获取语音风格
        voice_style = await voice_service.get_character_voice_style(character_id)
        
        # 生成语音文件
        audio_url = await voice_service.text_to_speech(
            text=text,
            voice_style=voice_style,
            language=language,
            speed=speed
        )
        
        return {
            "success": True,
            "audio_url": audio_url,
            "text": text,
            "character_id": character_id
        }
        
    except Exception as e:
        raise VoiceProcessingError(f"语音合成失败: {str(e)}")

@router.post("/process-voice-message")
async def process_voice_message(
    audio_file: UploadFile = File(...),
    character_id: str = Form(...),
    language: str = Form(default="zh-CN"),
    db: AsyncSession = Depends(get_db)
):
    """处理语音消息（语音转文字 + 文字转语音）"""
    temp_path = None
    try:
        voice_service = VoiceService()
        
        # 验证文件类型
        if not audio_file.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="请上传音频文件")
        
        # 验证文件大小（限制为10MB）
        content = await audio_file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="音频文件过大，请上传小于10MB的文件")
        
        # 生成临时文件名，保持原始扩展名
        file_extension = ""
        if audio_file.filename and '.' in audio_file.filename:
            file_extension = audio_file.filename.split('.')[-1]
        else:
            # 根据content_type推断扩展名
            content_type_map = {
                'audio/webm': 'webm',
                'audio/mp4': 'mp4',
                'audio/wav': 'wav',
                'audio/ogg': 'ogg',
                'audio/mpeg': 'mp3'
            }
            file_extension = content_type_map.get(audio_file.content_type, 'webm')
        
        temp_path = f"temp_voice_{uuid.uuid4().hex}.{file_extension}"
        
        # 保存临时文件
        with open(temp_path, "wb") as buffer:
            buffer.write(content)
        
        # 语音转文字
        try:
            text = await voice_service.speech_to_text(temp_path, language)
            
            # 获取角色语音风格
            voice_style = await voice_service.get_character_voice_style(character_id)
            
            return {
                "success": True,
                "recognized_text": text,
                "language": language,
                "character_id": character_id,
                "message": "语音识别成功，请使用聊天API获取AI回复"
            }
        except VoiceProcessingError as e:
            # 如果是语音识别失败，返回友好的错误信息
            logger.error(f"语音识别失败: {e}")
            return {
                "success": False,
                "recognized_text": "",
                "language": language,
                "character_id": character_id,
                "message": str(e),
                "error_type": "voice_recognition_failed"
            }
                
    except HTTPException:
        raise
    except Exception as e:
        raise VoiceProcessingError(f"语音处理失败: {str(e)}")
    finally:
        # 清理临时文件
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"清理临时文件失败: {e}")
