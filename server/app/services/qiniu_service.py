"""
七牛云存储服务
基于七牛云Python SDK实现文件上传、下载、管理功能
"""

import os
import uuid
from typing import Optional, Dict, Any, List
from qiniu import Auth, put_file, put_data, put_stream, BucketManager, build_batch_delete
from qiniu import http
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class QiniuService:
    """七牛云存储服务类"""
    
    def __init__(self):
        """初始化七牛云服务"""
        self.access_key = settings.QINIU_ACCESS_KEY
        self.secret_key = settings.QINIU_SECRET_KEY
        self.bucket_name = settings.QINIU_BUCKET_NAME
        self.domain = settings.QINIU_DOMAIN
        self.use_https = settings.QINIU_USE_HTTPS
        print(settings)
        # 检查配置
        if not all([self.access_key, self.secret_key, self.bucket_name, self.domain]):
            logger.warning("七牛云配置不完整，将使用本地存储")
            self.enabled = False
        else:
            self.enabled = True
            # 创建认证对象
            self.auth = Auth(self.access_key, self.secret_key)
            # 创建bucket管理对象
            self.bucket_manager = BucketManager(self.auth)
    
    def is_enabled(self) -> bool:
        """检查七牛云服务是否可用"""
        return self.enabled
    
    def get_upload_token(self, key: str = None, expires: int = 3600) -> str:
        """获取上传凭证"""
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        return self.auth.upload_token(self.bucket_name, key, expires)
    
    def upload_file(self, file_path: str, key: str = None) -> Dict[str, Any]:
        """
        上传文件到七牛云
        
        Args:
            file_path: 本地文件路径
            key: 七牛云存储的文件名，如果为None则自动生成
            
        Returns:
            上传结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        if key is None:
            # 生成唯一文件名
            file_ext = os.path.splitext(file_path)[1]
            key = f"uploads/{uuid.uuid4().hex}{file_ext}"
        
        try:
            # 生成上传凭证
            token = self.get_upload_token(key)
            
            # 上传文件
            ret, info = put_file(token, key, file_path)
            
            if info.status_code == 200:
                # 构建文件URL
                file_url = self.get_file_url(key)
                return {
                    "success": True,
                    "key": key,
                    "url": file_url,
                    "hash": ret.get("hash"),
                    "size": ret.get("fsize")
                }
            else:
                return {
                    "success": False,
                    "error": f"上传失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"上传文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def upload_data(self, data: bytes, key: str = None, mime_type: str = None) -> Dict[str, Any]:
        """
        上传字节数据到七牛云
        
        Args:
            data: 字节数据
            key: 七牛云存储的文件名
            mime_type: MIME类型
            
        Returns:
            上传结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        if key is None:
            # 根据MIME类型生成文件名
            if mime_type:
                ext = self._get_extension_from_mime_type(mime_type)
            else:
                ext = ".bin"
            key = f"uploads/{uuid.uuid4().hex}{ext}"
        
        try:
            # 生成上传凭证
            token = self.get_upload_token(key)
            
            # 上传数据
            ret, info = put_data(token, key, data, mime_type=mime_type)
            
            if info.status_code == 200:
                # 构建文件URL
                file_url = self.get_file_url(key)
                return {
                    "success": True,
                    "key": key,
                    "url": file_url,
                    "hash": ret.get("hash"),
                    "size": ret.get("fsize")
                }
            else:
                return {
                    "success": False,
                    "error": f"上传失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"上传数据失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def upload_stream(self, stream, key: str = None, mime_type: str = None) -> Dict[str, Any]:
        """
        上传流数据到七牛云
        
        Args:
            stream: 数据流
            key: 七牛云存储的文件名
            mime_type: MIME类型
            
        Returns:
            上传结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        if key is None:
            # 根据MIME类型生成文件名
            if mime_type:
                ext = self._get_extension_from_mime_type(mime_type)
            else:
                ext = ".bin"
            key = f"uploads/{uuid.uuid4().hex}{ext}"
        
        try:
            # 生成上传凭证
            token = self.get_upload_token(key)
            
            # 上传流数据
            ret, info = put_stream(token, key, stream, mime_type=mime_type)
            
            if info.status_code == 200:
                # 构建文件URL
                file_url = self.get_file_url(key)
                return {
                    "success": True,
                    "key": key,
                    "url": file_url,
                    "hash": ret.get("hash"),
                    "size": ret.get("fsize")
                }
            else:
                return {
                    "success": False,
                    "error": f"上传失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"上传流数据失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_file_url(self, key: str) -> str:
        """
        获取文件的公开访问URL
        
        Args:
            key: 文件在七牛云中的key
            
        Returns:
            文件的公开访问URL
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        # 检查域名是否已经包含协议
        if self.domain.startswith(('http://', 'https://')):
            # 强制使用http协议（因为ASR服务可能需要http）
            if self.domain.startswith('https://'):
                domain = self.domain.replace('https://', 'http://')
            else:
                domain = self.domain
            return f"{domain}/{key}"
        else:
            # 使用http协议
            return f"http://{self.domain}/{key}"
    
    def get_private_url(self, key: str, expires: int = 3600) -> str:
        """
        获取文件的私有访问URL
        
        Args:
            key: 文件在七牛云中的key
            expires: 过期时间（秒）
            
        Returns:
            文件的私有访问URL
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        base_url = self.get_file_url(key)
        return self.auth.private_download_url(base_url, expires)
    
    def delete_file(self, key: str) -> Dict[str, Any]:
        """
        删除文件
        
        Args:
            key: 文件在七牛云中的key
            
        Returns:
            删除结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        try:
            ret, info = self.bucket_manager.delete(self.bucket_name, key)
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "message": "删除成功"
                }
            else:
                return {
                    "success": False,
                    "error": f"删除失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"删除文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def batch_delete_files(self, keys: List[str]) -> Dict[str, Any]:
        """
        批量删除文件
        
        Args:
            keys: 文件key列表
            
        Returns:
            批量删除结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        try:
            # 构建批量删除操作
            ops = build_batch_delete(self.bucket_name, keys)
            
            # 执行批量操作
            ret, info = self.bucket_manager.batch(ops)
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "message": "批量删除成功",
                    "results": ret
                }
            else:
                return {
                    "success": False,
                    "error": f"批量删除失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"批量删除文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def list_files(self, prefix: str = "", limit: int = 1000, marker: str = "") -> Dict[str, Any]:
        """
        列出文件
        
        Args:
            prefix: 文件前缀
            limit: 返回数量限制
            marker: 分页标记
            
        Returns:
            文件列表结果字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        try:
            ret, info = self.bucket_manager.list(
                self.bucket_name,
                prefix=prefix,
                limit=limit,
                marker=marker
            )
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "files": ret.get("items", []),
                    "marker": ret.get("marker", ""),
                    "common_prefixes": ret.get("commonPrefixes", [])
                }
            else:
                return {
                    "success": False,
                    "error": f"列出文件失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"列出文件失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_file_info(self, key: str) -> Dict[str, Any]:
        """
        获取文件信息
        
        Args:
            key: 文件在七牛云中的key
            
        Returns:
            文件信息字典
        """
        if not self.enabled:
            raise Exception("七牛云服务未启用")
        
        try:
            ret, info = self.bucket_manager.stat(self.bucket_name, key)
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "file_info": ret
                }
            else:
                return {
                    "success": False,
                    "error": f"获取文件信息失败: {info.error}",
                    "status_code": info.status_code
                }
                
        except Exception as e:
            logger.error(f"获取文件信息失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_extension_from_mime_type(self, mime_type: str) -> str:
        """根据MIME类型获取文件扩展名"""
        mime_to_ext = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'audio/webm': '.webm',
            'video/mp4': '.mp4',
            'video/webm': '.webm',
            'application/pdf': '.pdf',
            'text/plain': '.txt',
            'application/json': '.json'
        }
        return mime_to_ext.get(mime_type, '.bin')

# 创建全局实例
qiniu_service = QiniuService()
