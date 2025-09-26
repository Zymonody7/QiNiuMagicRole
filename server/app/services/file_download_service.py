"""
文件下载服务
用于将七牛云存储的文件下载到本地临时文件，供llm_server使用
"""

import os
import tempfile
import httpx
import asyncio
from typing import Optional, Dict, Any
from app.services.qiniu_service import qiniu_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class FileDownloadService:
    """文件下载服务类"""
    
    def __init__(self):
        self.temp_dir = os.path.join(settings.UPLOAD_DIR, "temp_downloads")
        os.makedirs(self.temp_dir, exist_ok=True)
    
    async def download_file_to_temp(self, file_url: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        将七牛云文件下载到本地临时文件
        
        Args:
            file_url: 文件URL
            filename: 可选的文件名，如果不提供则从URL中提取
            
        Returns:
            下载结果字典，包含本地文件路径
        """
        try:
            # 从URL中提取文件名
            if not filename:
                filename = os.path.basename(file_url.split('?')[0])  # 移除查询参数
                if not filename:
                    filename = f"temp_{asyncio.get_event_loop().time()}.wav"
            
            # 生成本地临时文件路径
            temp_file_path = os.path.join(self.temp_dir, filename)
            
            # 下载文件
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(file_url)
                response.raise_for_status()
                
                # 保存到本地临时文件
                with open(temp_file_path, "wb") as f:
                    f.write(response.content)
                
                logger.info(f"文件下载成功: {file_url} -> {temp_file_path}")
                
                return {
                    "success": True,
                    "local_path": temp_file_path,
                    "filename": filename,
                    "size": len(response.content)
                }
                
        except Exception as e:
            logger.error(f"下载文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def download_qiniu_file(self, storage_key: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        下载七牛云存储中的文件到本地临时文件
        
        Args:
            storage_key: 七牛云存储的key
            filename: 可选的文件名
            
        Returns:
            下载结果字典
        """
        try:
            # 获取七牛云文件的URL
            file_url = qiniu_service.get_file_url(storage_key)
            
            # 如果是私有文件，使用私有URL
            if not qiniu_service.is_public_file(storage_key):
                file_url = qiniu_service.get_private_url(storage_key, 3600)
            
            return await self.download_file_to_temp(file_url, filename)
            
        except Exception as e:
            logger.error(f"下载七牛云文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def cleanup_temp_file(self, file_path: str) -> bool:
        """
        清理临时文件
        
        Args:
            file_path: 要删除的文件路径
            
        Returns:
            是否删除成功
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"临时文件已删除: {file_path}")
                return True
            return True
        except Exception as e:
            logger.warning(f"删除临时文件失败: {e}")
            return False
    
    def cleanup_temp_dir(self) -> int:
        """
        清理整个临时目录
        
        Returns:
            删除的文件数量
        """
        deleted_count = 0
        try:
            for filename in os.listdir(self.temp_dir):
                file_path = os.path.join(self.temp_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    deleted_count += 1
            logger.info(f"清理临时目录完成，删除了 {deleted_count} 个文件")
        except Exception as e:
            logger.warning(f"清理临时目录失败: {e}")
        
        return deleted_count

# 创建全局实例
file_download_service = FileDownloadService()
