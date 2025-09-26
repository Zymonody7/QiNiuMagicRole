"""
七牛云OCR服务
用于识别图片和PDF文档中的文字内容
"""

import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class OCRService:
    """七牛云OCR服务类"""
    
    def __init__(self):
        self.api_key = settings.QINIU_API_KEY
        self.base_url = settings.QINIU_AI_BASE_URL
        self.backup_url = settings.QINIU_AI_BACKUP_URL
        self.enabled = bool(self.api_key and self.base_url)
        
        if not self.enabled:
            logger.warning("七牛云OCR服务未启用，请配置相关环境变量")
    
    def is_enabled(self) -> bool:
        """检查OCR服务是否可用"""
        return self.enabled
    
    async def recognize_text(self, image_url: str) -> Dict[str, Any]:
        """
        识别图片或PDF中的文字内容
        
        Args:
            image_url: 图片或PDF的公网链接
            
        Returns:
            包含识别结果的字典
        """
        if not self.enabled:
            logger.warning("七牛云OCR服务未启用")
            return {
                "success": False,
                "error": "OCR服务未启用",
                "text": ""
            }
        
        try:
            # 构建请求数据
            request_data = {
                "model": "ocr",
                "url": image_url
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"发送OCR识别请求: {image_url}")
            
            # 尝试主要接入点
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.base_url}/images/ocr",
                        json=request_data,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        recognized_text = result.get("text", "").strip()
                        logger.info(f"OCR识别成功: {recognized_text[:100]}...")
                        return {
                            "success": True,
                            "text": recognized_text,
                            "id": result.get("id", ""),
                            "error": None
                        }
                    else:
                        logger.warning(f"主要接入点OCR请求失败: {response.status_code} - {response.text}")
                        raise Exception(f"主要接入点OCR请求失败: {response.status_code}")
                        
            except Exception as e:
                logger.warning(f"主要接入点OCR请求异常: {e}")
                
                # 尝试备用接入点
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            f"{self.backup_url}/images/ocr",
                            json=request_data,
                            headers=headers
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            recognized_text = result.get("text", "").strip()
                            logger.info(f"备用接入点OCR识别成功: {recognized_text[:100]}...")
                            return {
                                "success": True,
                                "text": recognized_text,
                                "id": result.get("id", ""),
                                "error": None
                            }
                        else:
                            logger.error(f"备用接入点OCR请求失败: {response.status_code} - {response.text}")
                            raise Exception(f"备用接入点OCR请求失败: {response.status_code}")
                            
                except Exception as e2:
                    logger.error(f"备用接入点OCR请求异常: {e2}")
                    raise Exception(f"OCR服务不可用: {str(e)}")
                    
        except Exception as e:
            logger.error(f"OCR识别失败: {e}")
            return {
                "success": False,
                "error": f"OCR识别失败: {str(e)}",
                "text": ""
            }
    
    async def get_service_status(self) -> Dict[str, Any]:
        """获取OCR服务状态"""
        return {
            "enabled": self.enabled,
            "api_key_configured": bool(self.api_key),
            "base_url": self.base_url,
            "backup_url": self.backup_url
        }

# 创建全局实例
ocr_service = OCRService()
