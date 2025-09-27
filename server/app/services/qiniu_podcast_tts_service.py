"""
七牛云播客TTS服务
专门用于播客导出的语音合成功能
基于七牛云AI API实现TTS功能
"""

import httpx
import json
import base64
import logging
import tempfile
import os
from typing import Optional, Dict, Any
from app.core.config import settings
from pydub import AudioSegment
import io

logger = logging.getLogger(__name__)

class QiniuPodcastTTSService:
    """七牛云播客TTS服务类"""
    
    def __init__(self):
        """初始化七牛云播客TTS服务"""
        self.api_key = settings.QINIU_API_KEY
        self.base_url = settings.QINIU_AI_BASE_URL
        self.backup_url = settings.QINIU_AI_BACKUP_URL
        
        if not self.api_key:
            logger.warning("七牛云API密钥未配置，播客TTS服务将不可用")
            self.enabled = False
        else:
            self.enabled = True
    
    def is_enabled(self) -> bool:
        """检查播客TTS服务是否可用"""
        return self.enabled
    
    async def generate_podcast_voice(
        self, 
        text: str, 
        voice_type: str = "qiniu_zh_female_wwxkjx",
        speed_ratio: float = 1.0,
        encoding: str = "mp3"
    ) -> Optional[AudioSegment]:
        """
        使用七牛云TTS API生成播客语音
        
        Args:
            text: 要合成的文本
            voice_type: 音色类型
            speed_ratio: 语速比例
            encoding: 音频编码格式
            
        Returns:
            AudioSegment对象或None
        """
        if not self.enabled:
            logger.warning("播客TTS服务未启用")
            return None
        
        try:
            # 构建请求数据 - 使用七牛云TTS API的标准格式
            request_data = {
                "audio": {
                    "voice_type": voice_type,
                    "encoding": encoding,
                    "speed_ratio": speed_ratio
                },
                "request": {
                    "text": text
                }
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"播客TTS请求: {text[:50]}...")
            
            # 尝试主要接入点
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.base_url}/voice/tts",
                        json=request_data,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        return await self._process_tts_response(result)
                    else:
                        logger.warning(f"主要接入点请求失败: {response.status_code} - {response.text}")
                        raise Exception(f"主要接入点失败: {response.status_code}")
                        
            except Exception as e:
                logger.warning(f"主要接入点异常: {e}")
                # 尝试备用接入点
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        logger.info(f"尝试备用接入点: {self.backup_url}/voice/tts")
                        response = await client.post(
                            f"{self.backup_url}/voice/tts",
                            json=request_data,
                            headers=headers
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            return await self._process_tts_response(result)
                        else:
                            logger.error(f"备用接入点也失败: {response.status_code} - {response.text}")
                            raise Exception(f"备用接入点失败: {response.status_code}")
                            
                except Exception as backup_e:
                    logger.error(f"备用接入点异常: {backup_e}")
                    raise Exception(f"播客TTS服务不可用: {str(backup_e)}")
                    
        except Exception as e:
            logger.error(f"播客TTS生成失败: {e}")
            return None
    
    async def _process_tts_response(self, response: Dict[str, Any]) -> Optional[AudioSegment]:
        """处理TTS API响应"""
        try:
            logger.info(f"TTS响应结构: {response}")
            
            # 根据七牛云TTS API文档的响应结构
            if "data" in response:
                # data字段包含base64编码的音频数据
                audio_data_b64 = response["data"]
                logger.info(f"获取到base64音频数据，长度: {len(audio_data_b64)}")
                
                # 解码base64音频数据
                try:
                    audio_data = base64.b64decode(audio_data_b64)
                    logger.info(f"解码音频数据成功，字节长度: {len(audio_data)}")
                except Exception as decode_e:
                    logger.error(f"base64解码失败: {decode_e}")
                    return None
                
                # 创建临时文件
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                    temp_file.write(audio_data)
                    temp_file.flush()
                    
                    try:
                        # 加载音频
                        audio = AudioSegment.from_file(temp_file.name)
                        logger.info(f"播客TTS生成成功，音频时长: {len(audio)}ms")
                        return audio
                    except Exception as audio_e:
                        logger.error(f"加载音频文件失败: {audio_e}")
                        return None
                    finally:
                        # 删除临时文件
                        try:
                            os.unlink(temp_file.name)
                        except:
                            pass
            else:
                logger.warning(f"播客TTS响应结构异常: {response}")
                return None
                
        except Exception as e:
            logger.error(f"处理播客TTS响应失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def get_voice_list(self) -> Optional[Dict[str, Any]]:
        """获取可用音色列表"""
        if not self.enabled:
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # 尝试主要接入点
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        f"{self.base_url}/voice/list",
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        return response.json()
                    else:
                        logger.warning(f"获取音色列表失败: {response.status_code}")
                        raise Exception(f"主要接入点失败: {response.status_code}")
                        
            except Exception as e:
                logger.warning(f"主要接入点异常: {e}")
                # 尝试备用接入点
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.get(
                            f"{self.backup_url}/voice/list",
                            headers=headers
                        )
                        
                        if response.status_code == 200:
                            return response.json()
                        else:
                            logger.error(f"备用接入点也失败: {response.status_code}")
                            return None
                            
                except Exception as backup_e:
                    logger.error(f"备用接入点异常: {backup_e}")
                    return None
                    
        except Exception as e:
            logger.error(f"获取音色列表失败: {e}")
            return None
    
    def get_available_voice_types(self) -> Dict[str, str]:
        """获取可用的音色类型"""
        return {
            "qiniu_zh_female_wwxkjx": "中文女声-温柔",
            "qiniu_zh_male_wwxkjx": "中文男声-稳重",
            "qiniu_zh_female_tmjxxy": "中文女声-甜美",
            "qiniu_zh_male_tmjxxy": "中文男声-磁性",
            "qiniu_en_female_wwxkjx": "英文女声-标准",
            "qiniu_en_male_wwxkjx": "英文男声-标准"
        }
    
    def get_service_status(self) -> Dict[str, Any]:
        """获取服务状态信息"""
        return {
            "podcast_tts_enabled": self.enabled,
            "api_key_configured": bool(self.api_key),
            "api_key_length": len(self.api_key) if self.api_key else 0,
            "base_url": self.base_url,
            "backup_url": self.backup_url,
            "available_voices": len(self.get_available_voice_types())
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """测试播客TTS服务连接"""
        if not self.enabled:
            return {
                "success": False,
                "error": "播客TTS服务未启用",
                "message": "请配置七牛云API密钥"
            }
        
        try:
            # 使用一个简短的测试文本
            test_text = "你好，这是播客TTS测试。"
            
            # 尝试生成测试音频
            audio = await self.generate_podcast_voice(test_text)
            
            if audio:
                return {
                    "success": True,
                    "message": "播客TTS服务连接正常",
                    "test_audio_duration": len(audio),
                    "test_audio_size": len(audio.raw_data)
                }
            else:
                return {
                    "success": False,
                    "error": "音频生成失败",
                    "message": "播客TTS服务响应异常"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "播客TTS服务连接失败"
            }

# 创建全局实例
qiniu_podcast_tts_service = QiniuPodcastTTSService()
