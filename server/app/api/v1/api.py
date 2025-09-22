"""
API v1 路由汇总
"""

from fastapi import APIRouter
from app.api.v1.endpoints import characters, chat, voice, users, auth

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
    users.router,
    prefix="/users",
    tags=["用户管理"]
)
