"""
OCR API端点
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from typing import Dict, Any
import logging
from app.services.ocr_service import ocr_service
from app.core.auth import get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/recognize")
async def recognize_text(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    识别图片或PDF中的文字内容
    
    Args:
        request: 包含image_url的请求体
        
    Returns:
        包含识别结果的字典
    """
    try:
        image_url = request.get("image_url")
        if not image_url:
            raise HTTPException(status_code=400, detail="图片链接不能为空")
        
        # 调用OCR服务
        result = await ocr_service.recognize_text(image_url)
        
        if result["success"]:
            return {
                "success": True,
                "text": result["text"],
                "id": result.get("id", ""),
                "message": "OCR识别成功"
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except Exception as e:
        logger.error(f"OCR识别失败: {e}")
        raise HTTPException(status_code=500, detail=f"OCR识别失败: {str(e)}")

@router.get("/status")
async def get_ocr_status(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    获取OCR服务状态
    
    Returns:
        服务状态信息
    """
    try:
        status = await ocr_service.get_service_status()
        return {
            "success": True,
            "status": status
        }
    except Exception as e:
        logger.error(f"获取OCR状态失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取OCR状态失败: {str(e)}")
