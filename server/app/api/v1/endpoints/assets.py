"""
静态资源管理API端点
统一管理所有静态资源的上传、下载、删除等操作
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import List, Optional
from app.services.static_asset_service import static_asset_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    asset_type: str = Query(..., description="资源类型: avatars, reference_audios, generated_voices, chat_audios, user_uploads"),
    subfolder: str = Query("", description="子文件夹"),
    custom_filename: str = Query(None, description="自定义文件名")
):
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
    try:
        result = await static_asset_service.upload_asset(
            file=file,
            asset_type=asset_type,
            subfolder=subfolder,
            custom_filename=custom_filename
        )
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "资源上传成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"资源上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"资源上传失败: {str(e)}")

@router.post("/upload-character-avatar")
async def upload_character_avatar(
    file: UploadFile = File(...),
    character_id: str = Query(None, description="角色ID")
):
    """上传角色头像"""
    try:
        result = await static_asset_service.upload_character_avatar(file, character_id)
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "角色头像上传成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"角色头像上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"角色头像上传失败: {str(e)}")

@router.post("/upload-reference-audio")
async def upload_reference_audio(
    file: UploadFile = File(...),
    character_id: str = Query(None, description="角色ID")
):
    """上传参考音频"""
    try:
        result = await static_asset_service.upload_reference_audio(file, character_id)
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "参考音频上传成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"参考音频上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"参考音频上传失败: {str(e)}")

@router.post("/upload-generated-voice")
async def upload_generated_voice(
    file: UploadFile = File(...),
    session_id: str = Query(None, description="会话ID")
):
    """上传生成的语音"""
    try:
        result = await static_asset_service.upload_generated_voice(file, session_id)
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "生成语音上传成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成语音上传失败: {e}")
        raise HTTPException(status_code=500, detail=f"生成语音上传失败: {str(e)}")

@router.delete("/delete")
async def delete_asset(
    key: str = Query(..., description="文件key或路径"),
    asset_type: str = Query(None, description="资源类型")
):
    """删除静态资源"""
    try:
        result = static_asset_service.delete_asset(key, asset_type)
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "资源删除成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"资源删除失败: {e}")
        raise HTTPException(status_code=500, detail=f"资源删除失败: {str(e)}")

@router.get("/list")
async def list_assets(
    asset_type: str = Query(..., description="资源类型"),
    prefix: str = Query("", description="前缀过滤"),
    limit: int = Query(100, description="数量限制")
):
    """列出静态资源"""
    try:
        result = static_asset_service.list_assets(asset_type, prefix, limit)
        
        if result["success"]:
            return JSONResponse(content={
                "success": True,
                "message": "资源列表获取成功",
                "data": result
            })
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"资源列表获取失败: {e}")
        raise HTTPException(status_code=500, detail=f"资源列表获取失败: {str(e)}")

@router.get("/url")
async def get_asset_url(
    key: str = Query(..., description="文件key"),
    asset_type: str = Query(None, description="资源类型"),
    private: bool = Query(False, description="是否使用私有URL"),
    expires: int = Query(3600, description="过期时间（秒）")
):
    """获取资源访问URL"""
    try:
        if private:
            url = static_asset_service.get_private_url(key, expires)
        else:
            url = static_asset_service.get_asset_url(key, asset_type)
        
        return JSONResponse(content={
            "success": True,
            "message": "URL获取成功",
            "data": {
                "url": url,
                "key": key,
                "private": private,
                "expires": expires if private else None
            }
        })
        
    except Exception as e:
        logger.error(f"URL获取失败: {e}")
        raise HTTPException(status_code=500, detail=f"URL获取失败: {str(e)}")

@router.get("/info")
async def get_storage_info():
    """获取存储信息"""
    try:
        info = static_asset_service.get_storage_info()
        
        return JSONResponse(content={
            "success": True,
            "message": "存储信息获取成功",
            "data": info
        })
        
    except Exception as e:
        logger.error(f"存储信息获取失败: {e}")
        raise HTTPException(status_code=500, detail=f"存储信息获取失败: {str(e)}")

@router.get("/folders")
async def get_folder_structure():
    """获取文件夹结构"""
    try:
        folders = static_asset_service.FOLDER_STRUCTURE
        
        return JSONResponse(content={
            "success": True,
            "message": "文件夹结构获取成功",
            "data": {
                "folders": folders,
                "description": {
                    "avatars": "角色头像",
                    "reference_audios": "参考音频",
                    "generated_voices": "生成的语音",
                    "chat_audios": "聊天音频",
                    "user_uploads": "用户上传文件",
                    "temp_files": "临时文件",
                    "system_files": "系统文件"
                }
            }
        })
        
    except Exception as e:
        logger.error(f"文件夹结构获取失败: {e}")
        raise HTTPException(status_code=500, detail=f"文件夹结构获取失败: {str(e)}")
