"""
API v1 路由汇总
"""

from fastapi import APIRouter
from app.api.v1.endpoints import characters, chat, voice, voice_chat, users, auth, storage, assets, ocr

api_router = APIRouter()

# 包含各个模块的路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["认证管理"]
)

api_router.include_router(
    characters.router,
    prefix="/characters",
    tags=["角色管理"]
)

api_router.include_router(
    chat.router,
    prefix="/chat",
    tags=["聊天对话"]
)

api_router.include_router(
    voice.router,
    prefix="/voice",
    tags=["语音处理"]
)

api_router.include_router(
    voice_chat.router,
    prefix="/voice",
    tags=["实时语音聊天"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["用户管理"]
)

api_router.include_router(
    storage.router,
    prefix="/storage",
    tags=["存储管理"]
)

api_router.include_router(
    assets.router,
    prefix="/assets",
    tags=["静态资源管理"]
)

api_router.include_router(
    ocr.router,
    prefix="/ocr",
    tags=["OCR文字识别"]
)