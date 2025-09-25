"""
存储管理API端点
支持七牛云存储和本地存储的文件管理功能
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import uuid
from app.services.qiniu_service import qiniu_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    use_qiniu: bool = Query(True, description="是否使用七牛云存储")
):
    """
    上传文件
    
    Args:
        file: 上传的文件
        use_qiniu: 是否使用七牛云存储
        
    Returns:
        上传结果
    """
    try:
        # 检查文件大小
        if file.size > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"文件大小超过限制 ({settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB)"
            )
        
        # 读取文件内容
        content = await file.read()
        
        if use_qiniu and qiniu_service.is_enabled():
            # 使用七牛云存储
            # 生成文件名
            file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
            key = f"uploads/{uuid.uuid4().hex}{file_ext}"
            
            # 上传到七牛云
            result = qiniu_service.upload_data(
                data=content,
                key=key,
                mime_type=file.content_type
            )
            
            if result["success"]:
                return JSONResponse(content={
                    "success": True,
                    "message": "文件上传成功",
                    "data": {
                        "filename": file.filename,
                        "key": result["key"],
                        "url": result["url"],
                        "size": result["size"],
                        "storage": "qiniu"
                    }
                })
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"七牛云上传失败: {result['error']}"
                )
        else:
            # 使用本地存储
            if not os.path.exists(settings.UPLOAD_DIR):
                os.makedirs(settings.UPLOAD_DIR)
            
            # 生成文件名
            file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
            filename = f"{uuid.uuid4().hex}{file_ext}"
            file_path = os.path.join(settings.UPLOAD_DIR, filename)
            
            # 保存文件
            with open(file_path, "wb") as f:
                f.write(content)
            
            # 构建访问URL
            file_url = f"{settings.SERVER_URL}/static/uploads/{filename}"
            
            return JSONResponse(content={
                "success": True,
                "message": "文件上传成功",
                "data": {
                    "filename": file.filename,
                    "path": file_path,
                    "url": file_url,
                    "size": len(content),
                    "storage": "local"
                }
            })
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"文件上传失败: {str(e)}"
        )

@router.post("/upload-multiple")
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    use_qiniu: bool = Query(True, description="是否使用七牛云存储")
):
    """
    批量上传文件
    
    Args:
        files: 上传的文件列表
        use_qiniu: 是否使用七牛云存储
        
    Returns:
        批量上传结果
    """
    try:
        results = []
        
        for file in files:
            try:
                # 检查文件大小
                if file.size > settings.MAX_FILE_SIZE:
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": f"文件大小超过限制 ({settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB)"
                    })
                    continue
                
                # 读取文件内容
                content = await file.read()
                
                if use_qiniu and qiniu_service.is_enabled():
                    # 使用七牛云存储
                    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
                    key = f"uploads/{uuid.uuid4().hex}{file_ext}"
                    
                    result = qiniu_service.upload_data(
                        data=content,
                        key=key,
                        mime_type=file.content_type
                    )
                    
                    if result["success"]:
                        results.append({
                            "filename": file.filename,
                            "success": True,
                            "key": result["key"],
                            "url": result["url"],
                            "size": result["size"],
                            "storage": "qiniu"
                        })
                    else:
                        results.append({
                            "filename": file.filename,
                            "success": False,
                            "error": result["error"]
                        })
                else:
                    # 使用本地存储
                    if not os.path.exists(settings.UPLOAD_DIR):
                        os.makedirs(settings.UPLOAD_DIR)
                    
                    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
                    filename = f"{uuid.uuid4().hex}{file_ext}"
                    file_path = os.path.join(settings.UPLOAD_DIR, filename)
                    
                    with open(file_path, "wb") as f:
                        f.write(content)
                    
                    file_url = f"{settings.SERVER_URL}/static/uploads/{filename}"
                    
                    results.append({
                        "filename": file.filename,
                        "success": True,
                        "path": file_path,
                        "url": file_url,
                        "size": len(content),
                        "storage": "local"
                    })
                    
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        return JSONResponse(content={
            "success": True,
            "message": "批量上传完成",
            "data": results
        })
        
    except Exception as e:
        logger.error(f"批量文件上传失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"批量文件上传失败: {str(e)}"
        )

@router.delete("/delete")
async def delete_file(
    key: str = Query(..., description="文件key或路径"),
    use_qiniu: bool = Query(True, description="是否使用七牛云存储")
):
    """
    删除文件
    
    Args:
        key: 文件key或路径
        use_qiniu: 是否使用七牛云存储
        
    Returns:
        删除结果
    """
    try:
        if use_qiniu and qiniu_service.is_enabled():
            # 删除七牛云文件
            result = qiniu_service.delete_file(key)
            
            if result["success"]:
                return JSONResponse(content={
                    "success": True,
                    "message": "文件删除成功",
                    "data": result
                })
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"删除文件失败: {result['error']}"
                )
        else:
            # 删除本地文件
            if os.path.exists(key):
                os.remove(key)
                return JSONResponse(content={
                    "success": True,
                    "message": "文件删除成功",
                    "data": {"path": key}
                })
            else:
                raise HTTPException(
                    status_code=404,
                    detail="文件不存在"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件删除失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"文件删除失败: {str(e)}"
        )

@router.get("/list")
async def list_files(
    prefix: str = Query("", description="文件前缀"),
    limit: int = Query(100, description="返回数量限制"),
    use_qiniu: bool = Query(True, description="是否使用七牛云存储")
):
    """
    列出文件
    
    Args:
        prefix: 文件前缀
        limit: 返回数量限制
        use_qiniu: 是否使用七牛云存储
        
    Returns:
        文件列表
    """
    try:
        if use_qiniu and qiniu_service.is_enabled():
            # 列出七牛云文件
            result = qiniu_service.list_files(prefix=prefix, limit=limit)
            
            if result["success"]:
                return JSONResponse(content={
                    "success": True,
                    "message": "文件列表获取成功",
                    "data": result
                })
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"获取文件列表失败: {result['error']}"
                )
        else:
            # 列出本地文件
            upload_dir = settings.UPLOAD_DIR
            if not os.path.exists(upload_dir):
                return JSONResponse(content={
                    "success": True,
                    "message": "文件列表获取成功",
                    "data": {
                        "files": [],
                        "marker": "",
                        "common_prefixes": []
                    }
                })
            
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
            
            return JSONResponse(content={
                "success": True,
                "message": "文件列表获取成功",
                "data": {
                    "files": files[:limit],
                    "marker": "",
                    "common_prefixes": []
                }
            })
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件列表失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取文件列表失败: {str(e)}"
        )

@router.get("/info")
async def get_file_info(
    key: str = Query(..., description="文件key"),
    use_qiniu: bool = Query(True, description="是否使用七牛云存储")
):
    """
    获取文件信息
    
    Args:
        key: 文件key
        use_qiniu: 是否使用七牛云存储
        
    Returns:
        文件信息
    """
    try:
        if use_qiniu and qiniu_service.is_enabled():
            # 获取七牛云文件信息
            result = qiniu_service.get_file_info(key)
            
            if result["success"]:
                return JSONResponse(content={
                    "success": True,
                    "message": "文件信息获取成功",
                    "data": result["file_info"]
                })
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"获取文件信息失败: {result['error']}"
                )
        else:
            # 获取本地文件信息
            file_path = os.path.join(settings.UPLOAD_DIR, key)
            if os.path.exists(file_path):
                file_stat = os.stat(file_path)
                return JSONResponse(content={
                    "success": True,
                    "message": "文件信息获取成功",
                    "data": {
                        "size": file_stat.st_size,
                        "mimeType": "application/octet-stream",
                        "putTime": int(file_stat.st_mtime * 10000000)
                    }
                })
            else:
                raise HTTPException(
                    status_code=404,
                    detail="文件不存在"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取文件信息失败: {str(e)}"
        )

@router.get("/config")
async def get_storage_config():
    """
    获取存储配置信息
    
    Returns:
        存储配置
    """
    return JSONResponse(content={
        "success": True,
        "message": "存储配置获取成功",
        "data": {
            "qiniu_enabled": qiniu_service.is_enabled(),
            "max_file_size": settings.MAX_FILE_SIZE,
            "upload_dir": settings.UPLOAD_DIR,
            "server_url": settings.SERVER_URL
        }
    })
