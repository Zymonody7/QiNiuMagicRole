"""
AI技能API端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.services.ai_service import AIService
from app.services.character_service import CharacterService

router = APIRouter()

class SkillRequest(BaseModel):
    """技能请求模型"""
    character_id: str
    prompt: str
    skill_type: Optional[str] = "chat"

class SkillResponse(BaseModel):
    """技能响应模型"""
    content: str
    character_id: str
    skill_type: str
    metadata: Optional[Dict] = None

class CreativeContentRequest(BaseModel):
    """创意内容请求"""
    character_id: str
    prompt: str
    content_type: str = "story"  # story, poem, dialogue, advice

class KnowledgeQuestionRequest(BaseModel):
    """知识问答请求"""
    character_id: str
    question: str

class EmotionalSupportRequest(BaseModel):
    """情感支持请求"""
    character_id: str
    message: str

class RolePlayRequest(BaseModel):
    """角色扮演请求"""
    character_id: str
    scenario: str
    user_role: str = "朋友"

class VoiceStyleRequest(BaseModel):
    """语音风格请求"""
    character_id: str
    text: str

@router.post("/creative-content", response_model=SkillResponse)
async def generate_creative_content(
    request: CreativeContentRequest,
    db: AsyncSession = Depends(get_db)
):
    """生成创意内容"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    content = await ai_service.generate_creative_content(
        request.character_id,
        request.prompt,
        request.content_type
    )
    
    return SkillResponse(
        content=content,
        character_id=request.character_id,
        skill_type="creative_content",
        metadata={"content_type": request.content_type}
    )

@router.post("/knowledge-qa", response_model=SkillResponse)
async def answer_knowledge_question(
    request: KnowledgeQuestionRequest,
    db: AsyncSession = Depends(get_db)
):
    """知识问答"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    answer = await ai_service.answer_knowledge_question(
        request.character_id,
        request.question
    )
    
    return SkillResponse(
        content=answer,
        character_id=request.character_id,
        skill_type="knowledge_qa"
    )

@router.post("/emotional-support", response_model=SkillResponse)
async def provide_emotional_support(
    request: EmotionalSupportRequest,
    db: AsyncSession = Depends(get_db)
):
    """情感支持"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    response = await ai_service.provide_emotional_support(
        request.character_id,
        request.message
    )
    
    return SkillResponse(
        content=response,
        character_id=request.character_id,
        skill_type="emotional_support"
    )

@router.post("/role-play", response_model=SkillResponse)
async def role_play_scenario(
    request: RolePlayRequest,
    db: AsyncSession = Depends(get_db)
):
    """情景角色扮演"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    response = await ai_service.role_play_scenario(
        request.character_id,
        request.scenario,
        request.user_role
    )
    
    return SkillResponse(
        content=response,
        character_id=request.character_id,
        skill_type="role_play",
        metadata={"scenario": request.scenario, "user_role": request.user_role}
    )

@router.post("/voice-style", response_model=Dict)
async def generate_voice_style(
    request: VoiceStyleRequest,
    db: AsyncSession = Depends(get_db)
):
    """生成语音风格建议"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(request.character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    voice_style = await ai_service.generate_character_voice_style(
        request.character_id,
        request.text
    )
    
    return {
        "character_id": request.character_id,
        "voice_style": voice_style,
        "text": request.text
    }

@router.post("/sentiment-analysis", response_model=Dict)
async def analyze_sentiment(
    text: str = Query(..., description="要分析的文本"),
    db: AsyncSession = Depends(get_db)
):
    """情感分析"""
    ai_service = AIService()
    
    sentiment = await ai_service.analyze_sentiment(text)
    
    return {
        "text": text,
        "sentiment": sentiment
    }

@router.get("/skills/{character_id}", response_model=List[str])
async def get_character_skills(
    character_id: str,
    db: AsyncSession = Depends(get_db)
):
    """获取角色可用技能"""
    ai_service = AIService()
    
    # 验证角色是否存在
    character_service = CharacterService(db)
    character = await character_service.get_character_by_id(character_id)
    if not character:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    skills = await ai_service.get_character_skills(character_id)
    
    return skills
