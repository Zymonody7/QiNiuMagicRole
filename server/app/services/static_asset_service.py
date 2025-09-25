"""
静态资源管理服务
统一管理所有静态资源的上传、存储和访问
支持七牛云存储和本地存储
"""

import os
import uuid
from typing import Optional, Dict, Any, List
from fastapi import UploadFile
from app.services.qiniu_service import qiniu_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class StaticAssetService:
    """静态资源管理服务"""
    
    # 文件夹结构定义
    FOLDER_STRUCTURE = {
        "avatars": "avatars",           # 角色头像
        "reference_audios": "reference_audios",  # 参考音频
        "generated_voices": "generated_voices",  # 生成的语音
        "chat_audios": "chat_audios",   # 聊天音频
        "user_uploads": "user_uploads", # 用户上传文件
        "temp_files": "temp_files",     # 临时文件
        "system_files": "system_files"  # 系统文件
    }
    
    def __init__(self):
        self.use_qiniu = qiniu_service.is_enabled()
    
    def get_folder_path(self, asset_type: str) -> str:
        """获取资源类型的文件夹路径"""
        return self.FOLDER_STRUCTURE.get(asset_type, "uploads")
    
    def generate_file_key(self, asset_type: str, filename: str, subfolder: str = "") -> str:
        """
        生成文件在七牛云中的key
        
        Args:
            asset_type: 资源类型 (avatars, reference_audios, etc.)
            filename: 原始文件名
            subfolder: 子文件夹 (可选)
            
        Returns:
            七牛云文件key
        """
        # 获取文件扩展名
        file_ext = os.path.splitext(filename)[1] if filename else ""
        
        # 生成唯一文件名
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        
        # 构建key路径
        folder = self.get_folder_path(asset_type)
        if subfolder:
            key = f"{folder}/{subfolder}/{unique_filename}"
        else:
            key = f"{folder}/{unique_filename}"
            
        return key
    
    async def upload_asset(
        self, 
        file: UploadFile, 
        asset_type: str, 
        subfolder: str = "",
        custom_filename: str = None
    ) -> Dict[str, Any]:
        """
        上传静态资源
        
        Args:
            file: 上传的文件
            asset_type: 资源类型
            subfolder: 子文件夹
            custom_filename: 自定义文件名
            
        Returns:
            上传结果
        """
        if not file or not file.filename:
            return {"success": False, "error": "没有文件"}
        
        try:
            # 读取文件内容
            content = await file.read()
            
            # 检查文件大小
            if len(content) > settings.MAX_FILE_SIZE:
                return {
                    "success": False,
                    "error": f"文件大小超过限制 ({settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB)"
                }
            
            # 生成文件key
            if custom_filename:
                file_key = f"{self.get_folder_path(asset_type)}/{subfolder}/{custom_filename}" if subfolder else f"{self.get_folder_path(asset_type)}/{custom_filename}"
            else:
                file_key = self.generate_file_key(asset_type, file.filename, subfolder)
            
            if self.use_qiniu:
                # 使用七牛云存储
                result = qiniu_service.upload_data(
                    data=content,
                    key=file_key,
                    mime_type=file.content_type
                )
                
                if result["success"]:
                    return {
                        "success": True,
                        "url": result["url"],
                        "key": result["key"],
                        "size": result["size"],
                        "storage": "qiniu",
                        "asset_type": asset_type
                    }
                else:
                    return {
                        "success": False,
                        "error": f"七牛云上传失败: {result['error']}"
                    }
            else:
                # 使用本地存储
                upload_dir = os.path.join(settings.UPLOAD_DIR, self.get_folder_path(asset_type))
                if subfolder:
                    upload_dir = os.path.join(upload_dir, subfolder)
                
                os.makedirs(upload_dir, exist_ok=True)
                
                # 生成本地文件名
                if custom_filename:
                    local_filename = custom_filename
                else:
                    file_ext = os.path.splitext(file.filename)[1]
                    local_filename = f"{uuid.uuid4().hex}{file_ext}"
                
                file_path = os.path.join(upload_dir, local_filename)
                
                # 保存文件
                with open(file_path, "wb") as f:
                    f.write(content)
                
                # 构建访问URL
                relative_path = f"/static/uploads/{self.get_folder_path(asset_type)}"
                if subfolder:
                    relative_path += f"/{subfolder}"
                relative_path += f"/{local_filename}"
                
                return {
                    "success": True,
                    "url": f"{settings.SERVER_URL}{relative_path}",
                    "key": local_filename,
                    "size": len(content),
                    "storage": "local",
                    "asset_type": asset_type
                }
                
        except Exception as e:
            logger.error(f"上传资源失败: {e}")
            return {
                "success": False,
                "error": f"上传失败: {str(e)}"
            }
    
    async def upload_character_avatar(self, file: UploadFile, character_id: str = None) -> Dict[str, Any]:
        """上传角色头像"""
        subfolder = f"character_{character_id}" if character_id else "default"
        return await self.upload_asset(file, "avatars", subfolder)
    
    async def upload_reference_audio(self, file: UploadFile, character_id: str = None) -> Dict[str, Any]:
        """上传参考音频"""
        subfolder = f"character_{character_id}" if character_id else "default"
        return await self.upload_asset(file, "reference_audios", subfolder)
    
    async def upload_generated_voice(self, file: UploadFile, session_id: str = None) -> Dict[str, Any]:
        """上传生成的语音"""
        subfolder = f"session_{session_id}" if session_id else "default"
        return await self.upload_asset(file, "generated_voices", subfolder)
    
    async def upload_chat_audio(self, file: UploadFile, session_id: str = None) -> Dict[str, Any]:
        """上传聊天音频"""
        subfolder = f"session_{session_id}" if session_id else "default"
        return await self.upload_asset(file, "chat_audios", subfolder)
    
    async def upload_user_file(self, file: UploadFile, user_id: str = None) -> Dict[str, Any]:
        """上传用户文件"""
        subfolder = f"user_{user_id}" if user_id else "anonymous"
        return await self.upload_asset(file, "user_uploads", subfolder)
    
    def delete_asset(self, key: str, asset_type: str = None) -> Dict[str, Any]:
        """
        删除静态资源
        
        Args:
            key: 文件key或路径
            asset_type: 资源类型
            
        Returns:
            删除结果
        """
        try:
            if self.use_qiniu:
                # 删除七牛云文件
                result = qiniu_service.delete_file(key)
                return result
            else:
                # 删除本地文件
                if os.path.exists(key):
                    os.remove(key)
                    return {
                        "success": True,
                        "message": "文件删除成功"
                    }
                else:
                    return {
                        "success": False,
                        "error": "文件不存在"
                    }
        except Exception as e:
            logger.error(f"删除资源失败: {e}")
            return {
                "success": False,
                "error": f"删除失败: {str(e)}"
            }
    
    def get_asset_url(self, key: str, asset_type: str = None) -> str:
        """
        获取资源访问URL
        
        Args:
            key: 文件key
            asset_type: 资源类型
            
        Returns:
            资源访问URL
        """
        if self.use_qiniu:
            return qiniu_service.get_file_url(key)
        else:
            # 本地存储，构建相对路径
            if key.startswith("/"):
                return f"{settings.SERVER_URL}{key}"
            else:
                return f"{settings.SERVER_URL}/static/uploads/{key}"
    
    def get_private_url(self, key: str, expires: int = 3600) -> str:
        """
        获取私有访问URL
        
        Args:
            key: 文件key
            expires: 过期时间（秒）
            
        Returns:
            私有访问URL
        """
        if self.use_qiniu:
            return qiniu_service.get_private_url(key, expires)
        else:
            # 本地存储不支持私有URL
            return self.get_asset_url(key)
    
    def list_assets(self, asset_type: str, prefix: str = "", limit: int = 100) -> Dict[str, Any]:
        """
        列出资源
        
        Args:
            asset_type: 资源类型
            prefix: 前缀过滤
            limit: 数量限制
            
        Returns:
            资源列表
        """
        try:
            if self.use_qiniu:
                # 列出七牛云文件
                folder = self.get_folder_path(asset_type)
                full_prefix = f"{folder}/{prefix}" if prefix else folder
                return qiniu_service.list_files(prefix=full_prefix, limit=limit)
            else:
                # 列出本地文件
                upload_dir = os.path.join(settings.UPLOAD_DIR, self.get_folder_path(asset_type))
                if not os.path.exists(upload_dir):
                    return {
                        "success": True,
                        "files": [],
                        "marker": "",
                        "common_prefixes": []
                    }
                
                files = []
                for filename in os.listdir(upload_dir):
                    if filename.startswith(prefix):
                        file_path = os.path.join(upload_dir, filename)
                        if os.path.isfile(file_path):
                            file_stat = os.stat(file_path)
                            files.append({
                                "key": filename,
                                "size": file_stat.st_size,
                                "mimeType": "application/octet-stream",
                                "putTime": int(file_stat.st_mtime * 10000000)
                            })
                
                return {
                    "success": True,
                    "files": files[:limit],
                    "marker": "",
                    "common_prefixes": []
                }
        except Exception as e:
            logger.error(f"列出资源失败: {e}")
            return {
                "success": False,
                "error": f"列出资源失败: {str(e)}"
            }
    
    def get_storage_info(self) -> Dict[str, Any]:
        """获取存储信息"""
        return {
            "use_qiniu": self.use_qiniu,
            "max_file_size": settings.MAX_FILE_SIZE,
            "upload_dir": settings.UPLOAD_DIR,
            "server_url": settings.SERVER_URL,
            "folder_structure": self.FOLDER_STRUCTURE
        }

# 创建全局实例
static_asset_service = StaticAssetService()
