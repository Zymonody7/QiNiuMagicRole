"""
TTS语音合成服务 - 调用llm_server进行语音生成
"""

import httpx
import os
import uuid
import asyncio
from typing import Optional, Dict, Any
from app.core.config import settings
from app.core.exceptions import VoiceProcessingError
import logging

logger = logging.getLogger(__name__)

class TTSService:
    """TTS语音合成服务类"""
    
    def __init__(self):
        self.llm_server_url = settings.LLM_SERVER_URL
        self.timeout = 600.0  # 600秒超时
    
    async def generate_voice(
        self,
        text: str,
        character_id: str,
        character_data: Optional[Dict[str, Any]] = None,
        text_language: str = "zh"
    ) -> str:
        """
        生成角色语音
        
        Args:
            text: 要合成的文本
            character_id: 角色ID
            character_data: 角色数据（包含参考音频信息）
            text_language: 文本语言
            
        Returns:
            生成的音频文件路径
        """
        try:
            # 如果没有角色数据，尝试从数据库获取
            if not character_data:
                # 这里应该从数据库获取角色信息
                # 暂时使用默认值
                character_data = {
                    "reference_audio_path": None,
                    "reference_audio_text": None,
                    "reference_audio_language": "zh"
                }
            
            # 检查是否有参考音频
            if not character_data.get("reference_audio_path"):
                logger.warning(f"角色 {character_id} 没有参考音频，使用默认TTS")
                return await self._generate_default_voice(text, text_language)
            
            # 调用llm_server进行语音合成
            return await self._call_llm_server_tts(
                text=text,
                text_language=text_language,
                reference_audio_path=character_data["reference_audio_path"],
                reference_audio_text=character_data.get("reference_audio_text", ""),
                reference_audio_language=character_data.get("reference_audio_language", "zh")
            )
            
        except Exception as e:
            logger.error(f"语音生成失败: {str(e)}")
            # 降级到默认TTS
            return await self._generate_default_voice(text, text_language)
    
    async def _call_llm_server_tts(
        self,
        text: str,
        text_language: str,
        reference_audio_path: str,
        reference_audio_text: str = "",
        reference_audio_language: str = "zh"
    ) -> str:
        """调用llm_server进行TTS"""
        try:
            # 构造llm_server可以访问的音频文件路径
            # 将server的音频路径转换为llm_server可以访问的路径
            if reference_audio_path.startswith("/static/uploads/"):
                # 移除 /static/uploads/ 前缀，构造相对路径
                relative_path = reference_audio_path.replace("/static/uploads/", "")
                # 构造llm_server可以访问的绝对路径
                # 假设llm_server的根目录是QiNiuMagicRole，那么路径应该是相对于llm_server的路径
                llm_server_refer_path = os.path.join("..", "server", "static", "uploads", relative_path)
            else:
                # 如果已经是绝对路径，直接使用
                llm_server_refer_path = reference_audio_path
            
            # 构建请求数据，使用llm_server的API格式
            request_data = {
                "refer_wav_path": llm_server_refer_path,
                "prompt_text": reference_audio_text,
                "prompt_language": reference_audio_language,
                "text": text,
                "text_language": text_language,
                "top_k": 15,
                "top_p": 1.0,
                "temperature": 1.0,
                "speed": 1.0,
                "sample_steps": 32,
                "if_sr": False
            }
            
            logger.info(f"调用LLM服务器TTS: {self.llm_server_url}")
            logger.info(f"请求参数: {request_data}")
            
            # 发送请求到llm_server - 使用正确的端点 /
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.llm_server_url}/",
                    json=request_data
                )
                
                if response.status_code == 200:
                    # 保存生成的音频文件
                    audio_data = response.content
                    return await self._save_generated_audio(audio_data, "wav")
                else:
                    logger.error(f"LLM服务器返回错误状态: {response.status_code}")
                    error_text = response.text
                    logger.error(f"错误信息: {error_text}")
                    raise VoiceProcessingError(f"LLM服务器响应错误: {response.status_code} - {error_text}")
                
        except httpx.TimeoutException:
            raise VoiceProcessingError("LLM服务器响应超时")
        except httpx.RequestError as e:
            raise VoiceProcessingError(f"LLM服务器连接失败: {str(e)}")
        except Exception as e:
            raise VoiceProcessingError(f"调用LLM服务器失败: {str(e)}")
    
    async def _generate_default_voice(self, text: str, language: str) -> str:
        """生成默认语音（降级方案）"""
        try:
            # 这里可以使用其他TTS服务，比如gTTS
            from app.services.voice_service import VoiceService
            voice_service = VoiceService()
            
            # 使用现有的voice_service生成语音
            audio_url = await voice_service.text_to_speech(
                text=text,
                language=language,
                voice_style="自然"
            )
            
            return audio_url
            
        except Exception as e:
            logger.error(f"默认TTS生成失败: {str(e)}")
            raise VoiceProcessingError("语音生成失败")
    
    async def _save_generated_audio(self, audio_data: bytes, format: str = "wav") -> str:
        """保存生成的音频文件"""
        try:
            # 确保目录存在
            output_dir = os.path.join(settings.UPLOAD_DIR, "generated_voices")
            os.makedirs(output_dir, exist_ok=True)
            
            # 生成唯一文件名
            filename = f"tts_{uuid.uuid4().hex}.{format}"
            file_path = os.path.join(output_dir, filename)
            
            # 保存文件
            with open(file_path, "wb") as f:
                f.write(audio_data)
            
            # 返回相对路径，前端通过Next.js代理访问
            return f"/static/uploads/generated_voices/{filename}"
            
        except Exception as e:
            raise VoiceProcessingError(f"保存音频文件失败: {str(e)}")
    
    async def test_llm_server_connection(self) -> bool:
        """测试LLM服务器连接"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.llm_server_url}/health")
                return response.status_code == 200
        except:
            return False
