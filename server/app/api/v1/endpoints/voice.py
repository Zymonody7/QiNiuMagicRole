"""
语音处理API端点
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.voice_service import VoiceService
from app.core.exceptions import VoiceProcessingError
import os
from app.core.config import settings

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
            # 语音转文字
            text = await voice_service.speech_to_text(temp_path, language)
            
            # 获取角色语音风格
            voice_style = await voice_service.get_character_voice_style(character_id)
            
            # 生成回复语音（这里需要AI服务生成回复文本）
            # 暂时返回识别到的文字
            return {
                "success": True,
                "recognized_text": text,
                "language": language,
                "character_id": character_id,
                "message": "语音识别成功，请使用聊天API获取AI回复"
            }
        finally:
            # 清理临时文件
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        raise VoiceProcessingError(f"语音处理失败: {str(e)}")
