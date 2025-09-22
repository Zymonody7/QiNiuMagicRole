"""
AI服务 - 负责与LLM模型交互
"""

from typing import List, Dict, Optional
from app.core.config import settings
from app.core.exceptions import AIResponseError
import openai
import json
import requests
import time

class AIService:
    """AI服务类"""
    
    def __init__(self):
        self.api_key = settings.QINIU_API_KEY
        self.model = settings.QINIU_MODEL
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
            print('角色信息', character_info)
            # 构建系统提示
            print('构建系统提示')
            system_prompt = self._build_system_prompt(character_info)
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(session_history[-10:])
            messages.append({"role": "user", "content": user_message})
            
            url = "https://openai.qiniu.com/v1/chat/completions"
            headers = {
                "Authorization": "Bearer "+self.api_key,
                "Content-Type": "application/json"
            }
            payload = {
                "stream": False,
                "model": self.model,
                "messages": messages
            }
            print('请求参数:', payload)
            
            # 发送请求
            response = requests.post(url, json=payload, headers=headers)
            print('响应状态码:', response.status_code)
            print('响应内容:', response.text)
            
            if response.status_code != 200:
                raise AIResponseError(f"API请求失败，状态码: {response.status_code}, 响应: {response.text}")
            
            response_data = response.json()
            ai_response = response_data['choices'][0]['message']['content']
            
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
        """从数据库获取角色信息"""
        try:
            from app.core.database import AsyncSessionLocal
            from app.services.character_service import CharacterService
            
            async with AsyncSessionLocal() as db:
                character_service = CharacterService(db)
                character = await character_service.get_character_by_id(character_id)
                if character:
                    return {
                        "name": character.name,
                        "description": character.description,
                        "personality": character.personality,
                        "background": character.background,
                        "voice_style": character.voice_style or "自然"
                    }
                else:
                    return {
                        "name": "未知角色",
                        "description": "一个神秘的角色",
                        "personality": "友善、好奇",
                        "background": "背景未知",
                        "voice_style": "自然"
                    }
        except Exception as e:
            print(f"获取角色信息失败: {e}")
            return {
                "name": "未知角色",
                "description": "一个神秘的角色",
                "personality": "友善、好奇",
                "background": "背景未知",
                "voice_style": "自然"
            }
    
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
