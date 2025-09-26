"""
七牛云文本处理服务
用于将英文转换为拟声词，以便llm_server能够处理
"""

import httpx
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class QiniuTextService:
    """七牛云文本处理服务类"""
    
    def __init__(self):
        self.api_key = settings.QINIU_API_KEY
        self.base_url = settings.QINIU_AI_BASE_URL
        self.backup_url = settings.QINIU_AI_BACKUP_URL
        self.enabled = bool(self.api_key and self.base_url)
        self.model = settings.QINIU_MODEL
        if not self.enabled:
            logger.warning("七牛云文本处理服务未启用，请配置相关环境变量")
    
    def is_enabled(self) -> bool:
        """检查文本处理服务是否可用"""
        return self.enabled
    
    async def english_to_onomatopoeia(self, text: str) -> str:
        """
        将文本中的英文转换为拟声词
        
        Args:
            text: 原始文本
            
        Returns:
            转换后的文本
        """
        if not self.enabled:
            logger.warning("七牛云文本处理服务未启用，返回原始文本")
            return text
        
        try:
            # 构建请求数据
            request_data = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": """你是一个专业的文本处理助手。你的任务是将用户输入的文本中的英文单词转换为对应的中文拟声词，以便语音合成系统能够正确发音。

转换规则：
1. 保持中文内容不变
2. 将英文单词转换为对应的中文拟声词
3. 保持文本的整体结构和语气
4. 如果英文单词没有对应的拟声词，可以转换为相近的中文发音
5. 如果全文都是中文，不需要做任何变化，把原文返回

示例：
- "Hello" -> "哈喽"
- "OK" -> "欧克"
- "Yes" -> "耶斯"
- "No" -> "诺"
- "Good" -> "古德"
- "Thank you" -> "三克油"
- "Sorry" -> "索瑞"
- "Please" -> "普利斯"
- "Welcome" -> "威尔康姆"
- "Goodbye" -> "古德拜"

请只返回转换后的文本，不要添加任何解释。"""
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                "temperature": 0.3,
                "max_tokens": 1000
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"发送文本处理请求: {text[:100]}...")
            
            # 尝试主要接入点
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=request_data,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        processed_text = result["choices"][0]["message"]["content"].strip()
                        logger.info(f"文本处理成功: {processed_text[:100]}...")
                        return processed_text
                    else:
                        logger.warning(f"主要接入点请求失败: {response.status_code} - {response.text}")
                        raise Exception(f"主要接入点请求失败: {response.status_code}")
                        
            except Exception as e:
                logger.warning(f"主要接入点请求异常: {e}")
                
                # 尝试备用接入点
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            f"{self.backup_url}/chat/completions",
                            json=request_data,
                            headers=headers
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            processed_text = result["choices"][0]["message"]["content"].strip()
                            logger.info(f"备用接入点文本处理成功: {processed_text[:100]}...")
                            return processed_text
                        else:
                            logger.error(f"备用接入点请求失败: {response.status_code} - {response.text}")
                            raise Exception(f"备用接入点请求失败: {response.status_code}")
                            
                except Exception as e2:
                    logger.error(f"备用接入点请求异常: {e2}")
                    raise Exception(f"文本处理服务不可用: {str(e)}")
                    
        except Exception as e:
            logger.error(f"文本处理失败: {e}")
            # 如果处理失败，返回原始文本
            logger.warning("文本处理失败，返回原始文本")
            return text
    
    async def get_service_status(self) -> dict:
        """获取服务状态"""
        return {
            "enabled": self.enabled,
            "api_key_configured": bool(self.api_key),
            "base_url": self.base_url,
            "backup_url": self.backup_url
        }

# 创建全局实例
qiniu_text_service = QiniuTextService()
