"""
聊天对话API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List, Optional
from app.core.database import get_db
from app.core.auth import get_current_active_user, get_current_user, get_current_user_optional
from app.schemas.chat import ChatMessageResponse, ChatSessionResponse, ChatRequest, ChatResponse
from app.services.chat_service import ChatService
from app.services.ai_service import AIService
from app.services.tts_service import TTSService
from app.services.character_service import CharacterService
from app.core.exceptions import CharacterNotFoundError, ChatSessionNotFoundError, AIResponseError

router = APIRouter()

@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """发送聊天消息 - 需要用户登录"""
    chat_service = ChatService(db)
    ai_service = AIService()
    tts_service = TTSService()
    character_service = CharacterService(db)
    
    print("当前用户", current_user)
    # 获取或创建聊天会话 - 必须有用户ID
    session = await chat_service.get_or_create_session(
        character_id=request.character_id,
        user_id=current_user.id
    )
    print("会话", session.id)
    # 保存用户消息
    user_message = await chat_service.add_message(
        session_id=session.id,
        content=request.message,
        is_user=True,
        audio_url=request.audio_url
    )
    
    try:
        # 生成AI响应
        ai_response = await ai_service.generate_response(
            character_id=request.character_id,
            user_message=request.message,
            session_history=await chat_service.get_session_history(session.id,has_date=False)
        )
        
        # 获取角色信息用于语音生成
        character = await character_service.get_character_by_id(request.character_id)
        ai_audio_url = None
        
        if character and character.reference_audio_path:
            try:
                # 使用角色的参考音频生成语音
                character_data = {
                    "reference_audio_path": character.reference_audio_path,
                    "reference_audio_text": character.reference_audio_text,
                    "reference_audio_language": character.reference_audio_language
                }
                
                ai_audio_url = await tts_service.generate_voice(
                    text=ai_response["content"],
                    character_id=request.character_id,
                    character_data=character_data,
                    text_language="zh"
                )
                print(f"生成语音成功: {ai_audio_url}")
                
            except Exception as e:
                print(f"语音生成失败: {str(e)}")
                # 语音生成失败不影响聊天，继续使用文本响应
        
        # 保存AI响应
        ai_message = await chat_service.add_message(
            session_id=session.id,
            content=ai_response["content"],
            is_user=False,
            audio_url=ai_audio_url
        )
        
        return ChatResponse(
            session_id=session.id,
            user_message=user_message.to_dict(),
            ai_message=ai_message.to_dict(),
            character_id=request.character_id
        )
        
    except Exception as e:
        raise AIResponseError(f"AI响应生成失败: {str(e)}")

@router.get("/sessions/{character_id}/session", response_model=List[ChatSessionResponse])
async def get_user_sessions(
    character_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """获取用户的聊天会话列表 - 需要用户登录"""
    chat_service = ChatService(db)
    sessions = await chat_service.get_user_sessions(
        user_id=current_user.id,
        character_id=character_id,
        limit=20,
        offset=0
    )
    return [session.to_dict() for session in sessions]

# @router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
# async def get_session(
#     session_id: str,
#     db: AsyncSession = Depends(get_db)
# ):
#     """获取聊天会话详情"""
#     chat_service = ChatService(db)
#     session = await chat_service.get_session_by_id(session_id)
#     if not session:
#         raise ChatSessionNotFoundError(session_id)
#     return session.to_dict()

@router.get("/sessions/{session_id}/messages", response_model=List[Dict])
async def get_session_messages(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """获取会话消息历史"""
    chat_service = ChatService(db)
    messages = await chat_service.get_session_history(
        session_id=session_id,
        limit=limit,
        offset=offset
    )
    # print(messages)
    return messages


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """删除聊天会话"""
    chat_service = ChatService(db)
    success = await chat_service.delete_session(session_id)
    if not success:
        raise ChatSessionNotFoundError(session_id)
    return {"message": "会话删除成功"}
