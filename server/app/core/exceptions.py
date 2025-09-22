"""
全局异常处理
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)

class CustomHTTPException(HTTPException):
    """自定义HTTP异常"""
    def __init__(self, status_code: int, detail: str, error_code: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code

class CharacterNotFoundError(CustomHTTPException):
    """角色不存在异常"""
    def __init__(self, character_id: str):
        super().__init__(
            status_code=404,
            detail=f"角色 {character_id} 不存在",
            error_code="CHARACTER_NOT_FOUND"
        )

class ChatSessionNotFoundError(CustomHTTPException):
    """聊天会话不存在异常"""
    def __init__(self, session_id: str):
        super().__init__(
            status_code=404,
            detail=f"聊天会话 {session_id} 不存在",
            error_code="SESSION_NOT_FOUND"
        )

class VoiceProcessingError(CustomHTTPException):
    """语音处理异常"""
    def __init__(self, detail: str = "语音处理失败"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code="VOICE_PROCESSING_ERROR"
        )

class AIResponseError(CustomHTTPException):
    """AI响应异常"""
    def __init__(self, detail: str = "AI响应生成失败"):
        super().__init__(
            status_code=500,
            detail=detail,
            error_code="AI_RESPONSE_ERROR"
        )

async def custom_http_exception_handler(request: Request, exc: CustomHTTPException):
    """自定义HTTP异常处理器"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "error_code": exc.error_code,
            "status_code": exc.status_code
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """请求验证异常处理器"""
    return JSONResponse(
        status_code=422,
        content={
            "error": "请求参数验证失败",
            "error_code": "VALIDATION_ERROR",
            "details": exc.errors()
        }
    )

async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理器"""
    logger.error(f"未处理的异常: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "服务器内部错误",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )

def setup_exception_handlers(app):
    """设置异常处理器"""
    app.add_exception_handler(CustomHTTPException, custom_http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
