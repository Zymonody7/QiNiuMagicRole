"""
全局异常捕获中间件
"""

import logging
import traceback
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import BaseCustomException
import time
from typing import Callable

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class GlobalExceptionHandler:
    """全局异常处理器"""
    
    @staticmethod
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP异常处理器"""
        logger.error(f"HTTP异常: {exc.status_code} - {exc.detail} - URL: {request.url}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.detail,
                "status_code": exc.status_code,
                "timestamp": time.time(),
                "path": str(request.url)
            }
        )
    
    @staticmethod
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """请求验证异常处理器"""
        logger.error(f"请求验证异常: {exc.errors()} - URL: {request.url}")
        
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "请求参数验证失败",
                "details": exc.errors(),
                "timestamp": time.time(),
                "path": str(request.url)
            }
        )
    
    @staticmethod
    async def custom_exception_handler(request: Request, exc: BaseCustomException):
        """自定义异常处理器"""
        logger.error(f"自定义异常: {exc.error_code} - {exc.message} - URL: {request.url}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "error_code": exc.error_code,
                "timestamp": time.time(),
                "path": str(request.url)
            }
        )
    
    @staticmethod
    async def general_exception_handler(request: Request, exc: Exception):
        """通用异常处理器"""
        error_traceback = traceback.format_exc()
        logger.error(f"未处理的异常: {str(exc)} - URL: {request.url}")
        logger.error(f"异常堆栈: {error_traceback}")
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "服务器内部错误",
                "message": "系统发生未知错误，请联系管理员",
                "timestamp": time.time(),
                "path": str(request.url)
            }
        )

async def logging_middleware(request: Request, call_next: Callable):
    """请求日志中间件"""
    start_time = time.time()
    
    # 记录请求开始
    logger.info(f"请求开始: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        
        # 计算处理时间
        process_time = time.time() - start_time
        
        # 记录请求完成
        logger.info(
            f"请求完成: {request.method} {request.url} - "
            f"状态码: {response.status_code} - "
            f"处理时间: {process_time:.3f}s"
        )
        
        # 添加处理时间到响应头
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
        
    except Exception as exc:
        # 计算处理时间
        process_time = time.time() - start_time
        
        # 记录异常
        logger.error(
            f"请求异常: {request.method} {request.url} - "
            f"异常: {str(exc)} - "
            f"处理时间: {process_time:.3f}s"
        )
        
        # 重新抛出异常，让全局异常处理器处理
        raise exc

def setup_exception_handlers(app):
    """设置异常处理器"""
    # 添加中间件
    app.middleware("http")(logging_middleware)
    
    # 添加异常处理器
    app.add_exception_handler(HTTPException, GlobalExceptionHandler.http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, GlobalExceptionHandler.http_exception_handler)
    app.add_exception_handler(RequestValidationError, GlobalExceptionHandler.validation_exception_handler)
    app.add_exception_handler(BaseCustomException, GlobalExceptionHandler.custom_exception_handler)
    app.add_exception_handler(Exception, GlobalExceptionHandler.general_exception_handler)
    
    logger.info("全局异常处理器已设置")
