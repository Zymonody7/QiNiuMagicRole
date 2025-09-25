import asyncio
import json
import base64
import tempfile
import os
from typing import Dict, Any
from fastapi import WebSocket
import httpx
from app.services.tts_service import TTSService
from app.services.voice_service import VoiceService
from app.services.ai_service import AIService
from app.services.character_service import CharacterService
from app.core.database import get_db

class VoiceChatService:
    def __init__(self):
        self.tts_service = TTSService()
        self.voice_service = VoiceService()
        self.ai_service = AIService()
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """建立WebSocket连接"""
        self.active_connections[client_id] = websocket
        print(f"语音聊天连接已建立: {client_id}")
        
    async def disconnect(self, client_id: str):
        """断开WebSocket连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            print(f"语音聊天连接已断开: {client_id}")
    
    async def handle_message(self, websocket: WebSocket, client_id: str, message: Dict[str, Any]):
        """处理WebSocket消息"""
        try:
            message_type = message.get("type")
            
            if message_type == "init":
                await self._handle_init(websocket, message)
            elif message_type == "audio":
                await self._handle_audio(websocket, client_id, message)
            else:
                await self._send_error(websocket, f"未知消息类型: {message_type}")
                
        except Exception as e:
            print(f"处理消息失败: {e}")
            await self._send_error(websocket, f"处理消息失败: {str(e)}")
    
    async def _handle_init(self, websocket: WebSocket, message: Dict[str, Any]):
        """处理初始化消息"""
        character_id = message.get("characterId")
        character_name = message.get("characterName")
        
        print(f"初始化语音聊天: {character_name} (ID: {character_id})")
        
        # 发送初始化确认
        await self._send_message(websocket, {
            "type": "init_success",
            "characterId": character_id,
            "characterName": character_name
        })
    
    async def _handle_audio(self, websocket: WebSocket, client_id: str, message: Dict[str, Any]):
        """处理音频数据"""
        try:
            # 获取音频数据
            audio_data = message.get("data", [])
            if not audio_data:
                await self._send_error(websocket, "音频数据为空")
                return
            
            # 将音频数据转换为字节
            audio_bytes = bytes(audio_data)
            
            # 保存临时音频文件
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                temp_file.write(audio_bytes)
                temp_audio_path = temp_file.name
            
            try:
                # 语音识别
                print("开始语音识别...")
                transcript = await self.voice_service.speech_to_text(temp_audio_path, "zh")
                print(f"识别结果: {transcript}")
                
                if not transcript.strip():
                    await self._send_error(websocket, "语音识别失败，请重试")
                    return
                
                # 发送识别结果
                await self._send_message(websocket, {
                    "type": "transcript",
                    "text": transcript
                })
                
                # 生成AI回复
                print("生成AI回复...")
                ai_response = await self._generate_ai_response(transcript, client_id)
                print(f"AI回复: {ai_response}")
                
                # 发送AI回复
                await self._send_message(websocket, {
                    "type": "response",
                    "text": ai_response
                })
                
                # 生成语音回复
                print("生成语音回复...")
                audio_url = await self._generate_voice_response(ai_response, client_id)
                
                if audio_url:
                    await self._send_message(websocket, {
                        "type": "audio_response",
                        "audioUrl": audio_url
                    })
                
            finally:
                # 清理临时文件
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
                    
        except Exception as e:
            print(f"处理音频失败: {e}")
            await self._send_error(websocket, f"处理音频失败: {str(e)}")
    
    async def _generate_ai_response(self, user_input: str, client_id: str) -> str:
        """生成AI回复"""
        try:
            # 这里需要根据client_id获取角色信息
            # 暂时使用简单的回复逻辑
            responses = [
                f"我听到了你说：{user_input}。这是一个很有趣的话题。",
                f"关于'{user_input}'，我想和你分享一些想法。",
                f"你提到的'{user_input}'让我想起了很多相关的故事。",
                f"'{user_input}'确实是一个值得深入讨论的问题。"
            ]
            
            import random
            return random.choice(responses)
            
        except Exception as e:
            print(f"生成AI回复失败: {e}")
            return "抱歉，我现在无法回复你的消息。"
    
    async def _generate_voice_response(self, text: str, client_id: str) -> str:
        """生成语音回复"""
        try:
            # 使用TTS服务生成语音
            # 这里需要根据client_id获取角色信息
            character_data = {
                "reference_audio_path": None,  # 暂时不使用参考音频
                "reference_audio_text": None,
                "reference_audio_language": "zh"
            }
            
            audio_url = await self.tts_service.generate_voice(
                text=text,
                character_id=client_id,
                character_data=character_data,
                text_language="zh"
            )
            
            return audio_url
            
        except Exception as e:
            print(f"生成语音回复失败: {e}")
            return None
    
    async def _send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """发送消息到客户端"""
        try:
            await websocket.send_text(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            print(f"发送消息失败: {e}")
    
    async def _send_error(self, websocket: WebSocket, error_message: str):
        """发送错误消息"""
        await self._send_message(websocket, {
            "type": "error",
            "message": error_message
        })

# 全局实例
voice_chat_service = VoiceChatService()
