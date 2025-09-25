"""
LLM Server 异常处理模块
防止接口异常堵塞其他请求
"""

import logging
import traceback
import asyncio
import time
from typing import Any, Dict, Optional
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import torch
import gc

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMException(Exception):
    """LLM服务器自定义异常"""
    def __init__(self, message: str, error_code: str = "LLM_ERROR", status_code: int = 500):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class ModelLoadException(LLMException):
    """模型加载异常"""
    def __init__(self, message: str):
        super().__init__(message, "MODEL_LOAD_ERROR", 500)

class AudioProcessException(LLMException):
    """音频处理异常"""
    def __init__(self, message: str):
        super().__init__(message, "AUDIO_PROCESS_ERROR", 400)

class TextProcessException(LLMException):
    """文本处理异常"""
    def __init__(self, message: str):
        super().__init__(message, "TEXT_PROCESS_ERROR", 400)

class ResourceException(LLMException):
    """资源异常"""
    def __init__(self, message: str):
        super().__init__(message, "RESOURCE_ERROR", 503)

class ExceptionHandler:
    """异常处理器"""
    
    def __init__(self):
        self.error_counts = {}
        self.last_error_time = {}
        self.max_errors_per_minute = 10
        self.circuit_breaker_threshold = 5
        self.circuit_breaker_timeout = 300  # 5分钟
        
    def should_circuit_break(self, error_type: str) -> bool:
        """检查是否应该触发熔断器"""
        current_time = time.time()
        
        # 清理过期的错误记录
        if error_type in self.last_error_time:
            if current_time - self.last_error_time[error_type] > 60:  # 1分钟
                self.error_counts[error_type] = 0
                self.last_error_time[error_type] = current_time
        
        # 检查错误频率
        if error_type in self.error_counts:
            if self.error_counts[error_type] >= self.max_errors_per_minute:
                return True
        
        return False
    
    def record_error(self, error_type: str):
        """记录错误"""
        current_time = time.time()
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        self.last_error_time[error_type] = current_time
    
    def handle_exception(self, e: Exception, request: Optional[Request] = None) -> JSONResponse:
        """处理异常并返回响应"""
        error_type = type(e).__name__
        self.record_error(error_type)
        
        # 记录详细错误信息
        logger.error(f"Exception occurred: {error_type}")
        logger.error(f"Error message: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # 检查是否应该熔断
        if self.should_circuit_break(error_type):
            logger.warning(f"Circuit breaker triggered for {error_type}")
            return JSONResponse(
                status_code=503,
                content={
                    "code": 503,
                    "message": "服务暂时不可用，请稍后重试",
                    "error_type": "CIRCUIT_BREAKER",
                    "retry_after": 60
                }
            )
        
        # 根据异常类型返回不同的错误响应
        if isinstance(e, ModelLoadException):
            return JSONResponse(
                status_code=500,
                content={
                    "code": 500,
                    "message": "模型加载失败",
                    "error_type": "MODEL_LOAD_ERROR",
                    "details": str(e)
                }
            )
        elif isinstance(e, AudioProcessException):
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "message": "音频处理失败",
                    "error_type": "AUDIO_PROCESS_ERROR",
                    "details": str(e)
                }
            )
        elif isinstance(e, TextProcessException):
            return JSONResponse(
                status_code=400,
                content={
                    "code": 400,
                    "message": "文本处理失败",
                    "error_type": "TEXT_PROCESS_ERROR",
                    "details": str(e)
                }
            )
        elif isinstance(e, ResourceException):
            return JSONResponse(
                status_code=503,
                content={
                    "code": 503,
                    "message": "资源不足，请稍后重试",
                    "error_type": "RESOURCE_ERROR",
                    "details": str(e)
                }
            )
        elif isinstance(e, HTTPException):
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "code": e.status_code,
                    "message": e.detail,
                    "error_type": "HTTP_ERROR"
                }
            )
        else:
            # 通用异常处理
            return JSONResponse(
                status_code=500,
                content={
                    "code": 500,
                    "message": "内部服务器错误",
                    "error_type": "INTERNAL_ERROR",
                    "details": str(e) if logger.level <= logging.DEBUG else "请联系管理员"
                }
            )
    
    def cleanup_resources(self):
        """清理资源"""
        try:
            # 清理GPU内存
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
            
            # 强制垃圾回收
            gc.collect()
            
            logger.info("Resources cleaned up successfully")
        except Exception as e:
            logger.error(f"Error during resource cleanup: {e}")

# 全局异常处理器实例
exception_handler = ExceptionHandler()

def safe_execute(func, *args, **kwargs):
    """安全执行函数，带异常处理"""
    try:
        return func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Error in safe_execute: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise e

async def safe_async_execute(func, *args, **kwargs):
    """安全执行异步函数，带异常处理"""
    try:
        return await func(*args, **kwargs)
    except Exception as e:
        logger.error(f"Error in safe_async_execute: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise e

def handle_model_errors(func):
    """模型操作异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except torch.cuda.OutOfMemoryError as e:
            logger.error(f"CUDA out of memory: {e}")
            # 清理GPU内存
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            raise ResourceException(f"GPU内存不足: {str(e)}")
        except torch.cuda.CudaError as e:
            logger.error(f"CUDA error: {e}")
            raise ResourceException(f"GPU错误: {str(e)}")
        except Exception as e:
            logger.error(f"Model error: {e}")
            raise ModelLoadException(f"模型操作失败: {str(e)}")
    return wrapper

def handle_audio_errors(func):
    """音频处理异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FileNotFoundError as e:
            logger.error(f"Audio file not found: {e}")
            raise AudioProcessException(f"音频文件不存在: {str(e)}")
        except PermissionError as e:
            logger.error(f"Audio file permission error: {e}")
            raise AudioProcessException(f"音频文件权限错误: {str(e)}")
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            raise AudioProcessException(f"音频处理失败: {str(e)}")
    return wrapper

def handle_text_errors(func):
    """文本处理异常处理装饰器"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except UnicodeDecodeError as e:
            logger.error(f"Text encoding error: {e}")
            raise TextProcessException(f"文本编码错误: {str(e)}")
        except Exception as e:
            logger.error(f"Text processing error: {e}")
            raise TextProcessException(f"文本处理失败: {str(e)}")
    return wrapper

def create_error_response(message: str, error_code: str = "UNKNOWN_ERROR", status_code: int = 500) -> JSONResponse:
    """创建错误响应"""
    return JSONResponse(
        status_code=status_code,
        content={
            "code": status_code,
            "message": message,
            "error_type": error_code,
            "timestamp": time.time()
        }
    )

def log_request_info(request: Request):
    """记录请求信息"""
    try:
        logger.info(f"Request: {request.method} {request.url}")
        logger.info(f"Headers: {dict(request.headers)}")
        if hasattr(request, 'client') and request.client:
            logger.info(f"Client: {request.client.host}:{request.client.port}")
    except Exception as e:
        logger.error(f"Error logging request info: {e}")

def log_response_info(response: Any):
    """记录响应信息"""
    try:
        if hasattr(response, 'status_code'):
            logger.info(f"Response status: {response.status_code}")
        if hasattr(response, 'content'):
            logger.info(f"Response content type: {type(response.content)}")
    except Exception as e:
        logger.error(f"Error logging response info: {e}")

# 定期清理资源
async def periodic_cleanup():
    """定期清理资源"""
    while True:
        try:
            await asyncio.sleep(300)  # 每5分钟清理一次
            exception_handler.cleanup_resources()
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {e}")

# 启动定期清理任务
def start_cleanup_task():
    """启动定期清理任务"""
    try:
        asyncio.create_task(periodic_cleanup())
        logger.info("Periodic cleanup task started")
    except Exception as e:
        logger.error(f"Error starting cleanup task: {e}")
