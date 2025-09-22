"""
AI服务 - 负责与LLM模型交互
"""

from typing import List, Dict, Optional
from app.core.config import settings
from app.core.exceptions import AIResponseError
import openai
import json

class AIService:
    """AI服务类"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
    
    async def generate_response(
        self,
        character_id: str,
        user_message: str,
        session_history: List[Dict[str, str]]
    ) -> Dict[str, str]:
        """生成AI角色响应"""
        try:
            # 获取角色信息
            character_info = await self._get_character_info(character_id)
            
            # 构建系统提示
            system_prompt = self._build_system_prompt(character_info)
            
            # 构建消息历史
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(session_history[-10:])  # 只保留最近10条消息
            messages.append({"role": "user", "content": user_message})
            
            # 调用OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=0.8,
                presence_penalty=0.1,
                frequency_penalty=0.1
            )
            
            ai_response = response.choices[0].message.content
            
            return {
                "content": ai_response,
                "character_id": character_id,
                "model": self.model
            }
            
        except Exception as e:
            raise AIResponseError(f"AI响应生成失败: {str(e)}")
    
    def _build_system_prompt(self, character_info: Dict) -> str:
        """构建系统提示"""
        return f"""
你是一个AI角色扮演助手，现在你要扮演 {character_info['name']}。

角色信息：
- 姓名：{character_info['name']}
- 描述：{character_info['description']}
- 性格：{character_info['personality']}
- 背景：{character_info['background']}
- 语音风格：{character_info.get('voice_style', '自然')}

请严格按照以下要求进行角色扮演：
1. 完全以 {character_info['name']} 的身份和视角回答问题
2. 保持角色的性格特征和说话风格
3. 回答要符合角色的时代背景和知识水平
4. 语言要自然流畅，避免重复和机械化的表达
5. 适当使用角色的标志性语言和表达方式
6. 回答长度控制在100-300字之间

现在开始对话：
"""
    
    async def _get_character_info(self, character_id: str) -> Dict:
        """获取角色信息（这里应该从数据库获取，暂时返回模拟数据）"""
        # 模拟角色数据，实际应该从数据库获取
        characters = {
            "harry-potter": {
                "name": "哈利·波特",
                "description": "来自霍格沃茨魔法学校的年轻巫师，勇敢、善良，拥有强大的魔法天赋。",
                "personality": "勇敢、善良、忠诚、有时冲动",
                "background": "哈利·波特是J.K.罗琳创作的魔法世界中的主角，他在霍格沃茨魔法学校学习魔法，与朋友们一起对抗黑魔法师伏地魔。",
                "voice_style": "年轻、充满活力、英国口音"
            },
            "socrates": {
                "name": "苏格拉底",
                "description": "古希腊哲学家，以苏格拉底式问答法闻名，追求真理和智慧。",
                "personality": "智慧、好奇、耐心、善于提问",
                "background": "苏格拉底是古希腊最著名的哲学家之一，他通过不断的提问和对话来探索真理，对西方哲学产生了深远影响。",
                "voice_style": "深沉、智慧、古希腊口音"
            },
            "einstein": {
                "name": "阿尔伯特·爱因斯坦",
                "description": "理论物理学家，相对论的创立者，被誉为现代物理学之父。",
                "personality": "天才、幽默、谦逊、富有想象力",
                "background": "爱因斯坦是20世纪最伟大的物理学家之一，他的相对论彻底改变了我们对时间和空间的理解。",
                "voice_style": "温和、幽默、德国口音"
            }
        }
        
        return characters.get(character_id, {
            "name": "未知角色",
            "description": "一个神秘的角色",
            "personality": "友善、好奇",
            "background": "背景未知",
            "voice_style": "自然"
        })
    
    async def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """分析文本情感"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "你是一个情感分析专家。请分析给定文本的情感倾向，返回JSON格式：{\"positive\": 0.8, \"negative\": 0.1, \"neutral\": 0.1}"
                    },
                    {
                        "role": "user",
                        "content": text
                    }
                ],
                max_tokens=100,
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            # 返回默认值
            return {"positive": 0.5, "negative": 0.2, "neutral": 0.3}
