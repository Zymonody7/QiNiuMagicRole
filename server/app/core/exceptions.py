"""
全局异常处理
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger(__name__)

class BaseCustomException(Exception):
    """基础自定义异常类"""
    def __init__(self, message: str, error_code: str = None, status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class CustomHTTPException(HTTPException):
    """自定义HTTP异常"""
    def __init__(self, status_code: int, detail: str, error_code: str = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code

class CharacterNotFoundError(BaseCustomException):
    """角色不存在异常"""
    def __init__(self, character_id: str):
        super().__init__(
            message=f"角色 {character_id} 不存在",
            error_code="CHARACTER_NOT_FOUND",
            status_code=404
        )

class ChatSessionNotFoundError(BaseCustomException):
    """聊天会话不存在异常"""
    def __init__(self, session_id: str):
        super().__init__(
            message=f"聊天会话 {session_id} 不存在",
            error_code="SESSION_NOT_FOUND",
            status_code=404
        )

class VoiceProcessingError(BaseCustomException):
    """语音处理异常"""
    def __init__(self, message: str = "语音处理失败"):
        super().__init__(
            message=message,
            error_code="VOICE_PROCESSING_ERROR",
            status_code=500
        )

class AIResponseError(BaseCustomException):
    """AI响应异常"""
    def __init__(self, message: str = "AI响应生成失败"):
        super().__init__(
            message=message,
            error_code="AI_RESPONSE_ERROR",
            status_code=500
        )

class DatabaseError(BaseCustomException):
    """数据库操作异常"""
    def __init__(self, message: str = "数据库操作失败"):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500
        )

class AuthenticationError(BaseCustomException):
    """认证异常"""
    def __init__(self, message: str = "认证失败"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401
        )

class AuthorizationError(BaseCustomException):
    """授权异常"""
    def __init__(self, message: str = "权限不足"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403
        )

class FileUploadError(BaseCustomException):
    """文件上传异常"""
    def __init__(self, message: str = "文件上传失败"):
        super().__init__(
            message=message,
            error_code="FILE_UPLOAD_ERROR",
            status_code=400
        )

class ExternalServiceError(BaseCustomException):
    """外部服务异常"""
    def __init__(self, message: str = "外部服务调用失败"):
        super().__init__(
            message=message,
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=502
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
