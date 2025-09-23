"""
聊天服务
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.chat import ChatSession, ChatMessage
from app.models.character import Character
import uuid
from datetime import datetime

class ChatService:
    """聊天服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_or_create_session(
        self, 
        character_id: str, 
        user_id: Optional[str] = None
    ) -> ChatSession:
        """获取或创建聊天会话"""
        # 先尝试获取现有会话
        query = select(ChatSession).where(
            and_(
                ChatSession.character_id == character_id,
                ChatSession.user_id == user_id,
                ChatSession.is_active == True
            )
        ).order_by(desc(ChatSession.created_at))
        
        result = await self.db.execute(query)
        session = result.scalar_one_or_none()
        
        if not session:
            # 创建新会话
            session = ChatSession(
                id=str(uuid.uuid4()),
                character_id=character_id,
                user_id=user_id,
                title=f"与{character_id}的对话"
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(session)
        
        return session
    
    async def get_session_by_id(self, session_id: str) -> Optional[ChatSession]:
        """根据ID获取会话"""
        query = select(ChatSession).options(
            selectinload(ChatSession.character),
            selectinload(ChatSession.messages)
        ).where(ChatSession.id == session_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_user_sessions(
        self,
        user_id: Optional[str] = None,
        character_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[ChatSession]:
        print('用户输入',user_id, character_id)
        """获取用户会话列表"""
        query = (
            select(ChatSession)
            .options(
                selectinload(ChatSession.character),   # 你已有的
                selectinload(ChatSession.messages)     # 再加这一行
            )
            .where(ChatSession.user_id == user_id)
        )
        if character_id:
            query = query.where(ChatSession.character_id == character_id)

        query = query.offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def add_message(
        self,
        session_id: str,
        content: str,
        is_user: bool,
        audio_url: Optional[str] = None,
        message_metadata: Optional[dict] = None
    ) -> ChatMessage:
        """添加消息"""
        message = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            content=content,
            is_user=is_user,
            audio_url=audio_url,
            message_metadata=message_metadata or {}
        )
        
        self.db.add(message)
        
        # 更新会话时间
        session = await self.get_session_by_id(session_id)
        if session:
            session.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(message)
        return message
    
    async def get_session_messages(
        self,
        session_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatMessage]:
        """获取会话消息"""
        query = select(ChatMessage).where(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.created_at).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_session_history(self, 
                                  session_id: str,        
                                  limit: int = 20,
                                  offset: int = 0,
                                  has_date: bool = True) -> List[dict]:
        """获取会话历史（用于AI上下文）"""
        messages = await self.get_session_messages(session_id, limit=limit)
        return [
            {
                "is_user": msg.is_user,
                "content": msg.content,
                "created_at": msg.created_at
                # "id": msg.id,
                # "audio_url": msg.audio_url,
            } if has_date else {
                "role": "user" if msg.is_user else "assistant",
                "content": msg.content,
            }
            for msg in messages
        ]
    
    async def delete_session(self, session_id: str) -> bool:
        """删除会话"""
        session = await self.get_session_by_id(session_id)
        if not session:
            return False
        
        # 软删除
        session.is_active = False
        await self.db.commit()
        return True
