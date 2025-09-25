"""
七牛云ASR服务
基于七牛云AI API实现语音识别功能
"""

import httpx
import json
import logging
import os
import tempfile
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services.qiniu_service import qiniu_service

logger = logging.getLogger(__name__)

class QiniuASRService:
    """七牛云ASR服务类"""
    
    def __init__(self):
        """初始化七牛云ASR服务"""
        self.api_key = settings.QINIU_API_KEY
        self.base_url = settings.QINIU_AI_BASE_URL
        self.backup_url = settings.QINIU_AI_BACKUP_URL
        
        if not self.api_key:
            logger.warning("七牛云API密钥未配置，ASR服务将不可用")
            self.enabled = False
        else:
            self.enabled = True
    
    def is_enabled(self) -> bool:
        """检查ASR服务是否可用"""
        return self.enabled
    
    async def speech_to_text(self, audio_url: str, language: str = "zh") -> str:
        """
        使用七牛云ASR API进行语音识别
        
        Args:
            audio_url: 音频文件的公网URL
            language: 语言代码，支持zh、en等
            
        Returns:
            识别出的文本
        """
        if not self.enabled:
            raise Exception("七牛云ASR服务未启用")
        
        # 根据语言确定音频格式
        audio_format = self._get_audio_format_from_url(audio_url)
        
        # 构建请求数据 - 使用七牛云ASR API的标准格式
        request_data = {
            "model": "asr",
            "audio": {
                "format": audio_format,
                "url": audio_url
            }
        }
        
        print(f"ASR请求数据: {request_data}")
        print(self.api_key)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 直接使用备用接入点（因为主要接入点可能有问题）
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                print(f"使用备用端点: {self.backup_url}/voice/asr")
                print(f"请求数据: {request_data}")
                response = await client.post(
                    f"{self.backup_url}/voice/asr",
                    json=request_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"ASR响应: {result}")
                    return self._extract_text_from_response(result)
                else:
                    error_text = response.text
                    logger.warning(f"备用接入点请求失败: {error_text}")
                    print(f"ASR请求失败 - 状态码: {response.status_code}, 响应: {error_text}")
                    raise Exception(f"ASR请求失败: {response.status_code} - {error_text}")
                    
        except Exception as e:
            logger.error(f"备用接入点请求异常: {e}")
            raise Exception(f"ASR服务不可用: {str(e)}")
    
    def _get_audio_format_from_url(self, audio_url: str) -> str:
        """从URL中提取音频格式"""
        if audio_url.lower().endswith('.mp3'):
            return 'mp3'
        elif audio_url.lower().endswith('.wav'):
            return 'mp3'  # 强制使用mp3格式
        elif audio_url.lower().endswith('.ogg'):
            return 'mp3'  # 强制使用mp3格式
        elif audio_url.lower().endswith('.m4a'):
            return 'mp3'  # 强制使用mp3格式
        else:
            # 默认使用mp3格式
            return 'mp3'
    
    def _extract_text_from_response(self, response: Dict[str, Any]) -> str:
        """从API响应中提取文本"""
        try:
            # 根据七牛云ASR API文档的响应结构
            if "data" in response and "result" in response["data"]:
                result_data = response["data"]["result"]
                if "text" in result_data:
                    return result_data["text"].strip()
            
            # 如果没有找到预期的结构，记录响应内容用于调试
            logger.warning(f"ASR响应结构异常: {response}")
            return ""
            
        except Exception as e:
            logger.error(f"解析ASR响应失败: {e}")
            return ""
    
    async def speech_to_text_from_file(self, file_content: bytes, filename: str, language: str = "zh") -> str:
        """
        从文件内容进行语音识别
        
        Args:
            file_content: 文件字节内容
            filename: 文件名
            language: 语言代码
            
        Returns:
            识别出的文本
        """
        if not self.enabled:
            raise Exception("七牛云ASR服务未启用")
        
        if not qiniu_service.is_enabled():
            raise Exception("七牛云存储服务未启用")
        
        # 根据文件扩展名确定MIME类型
        file_ext = os.path.splitext(filename)[1].lower()
        mime_type_map = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac'
        }
        mime_type = mime_type_map.get(file_ext, 'audio/wav')
        
        # 上传文件到七牛云存储
        upload_result = qiniu_service.upload_data(
            data=file_content,
            key=f"asr_temp/{filename}",
            mime_type=mime_type
        )
        
        if not upload_result["success"]:
            raise Exception(f"文件上传失败: {upload_result['error']}")
        
        # 获取文件URL
        audio_url = upload_result["url"]
        print(f"上传文件成功，URL: {audio_url}")
        
        try:
            # 调用ASR服务
            result = await self.speech_to_text(audio_url, language)
            return result
        finally:
            # 暂时不删除临时文件，用于调试
            print(f"临时文件保留在: {upload_result['key']}")
            print(f"文件URL: {audio_url}")
            # 清理上传的临时文件
            # try:
            #     qiniu_service.delete_file(upload_result["key"])
            # except Exception as e:
            #     logger.warning(f"清理临时文件失败: {e}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """测试ASR服务连接"""
        if not self.enabled:
            return {
                "success": False,
                "error": "ASR服务未启用",
                "message": "请配置七牛云API密钥"
            }
        
        try:
            # 使用一个测试音频URL（这里需要替换为实际的测试音频）
            test_audio_url = "https://static.qiniu.com/ai-inference/example-resources/example.mp3"
            
            # 尝试调用ASR API
            result = await self.speech_to_text(test_audio_url)
            
            return {
                "success": True,
                "message": "ASR服务连接正常",
                "test_result": result
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": "ASR服务连接失败"
            }
    
    def get_service_status(self) -> Dict[str, Any]:
        """获取服务状态信息"""
        return {
            "asr_enabled": self.enabled,
            "api_key_configured": bool(self.api_key),
            "api_key_length": len(self.api_key) if self.api_key else 0,
            "base_url": self.base_url,
            "backup_url": self.backup_url,
            "qiniu_storage_enabled": qiniu_service.is_enabled()
        }

# 创建全局实例
qiniu_asr_service = QiniuASRService()