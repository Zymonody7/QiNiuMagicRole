import asyncio
import json
import base64
import tempfile
import os
import time
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
            elif message_type == "silence_timeout":
                await self._handle_silence_timeout(websocket, client_id, message)
            elif message_type == "ready":
                await self._handle_ready(websocket, client_id, message)
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
        
        # 生成问候语
        try:
            print("开始生成问候语...")
            greeting_result = await self.ai_service.generate_response(
                character_id=character_id,
                user_message="请说一句简短的问候语，欢迎用户开始对话",
                session_history=[]
            )
            
            greeting_text = greeting_result.get("content", "")
            print(f"生成的问候语: {greeting_text}")
            
            if greeting_text.strip():
                # 生成问候语音频
                print("开始生成问候语音频...")
                greeting_audio_url = await self._generate_voice_response(greeting_text, character_id)
                
                # 发送问候语
                await self._send_message(websocket, {
                    "type": "greeting",
                    "text": greeting_text,
                    "audioUrl": greeting_audio_url
                })
                print("问候语发送完成")
            else:
                print("问候语生成失败，使用默认问候语")
                await self._send_message(websocket, {
                    "type": "greeting",
                    "text": f"你好！我是{character_name}，很高兴和你聊天！",
                    "audioUrl": None
                })
                
        except Exception as e:
            print(f"生成问候语失败: {e}")
            # 使用默认问候语
            await self._send_message(websocket, {
                "type": "greeting",
                "text": f"你好！我是{character_name}，很高兴和你聊天！",
                "audioUrl": None
            })
        
        # 发送初始化确认
        await self._send_message(websocket, {
            "type": "init_success",
            "characterId": character_id,
            "characterName": character_name
        })
    
    async def _handle_audio(self, websocket: WebSocket, client_id: str, message: Dict[str, Any]):
        """处理音频数据 - 电话模式：七牛云ASR -> AI服务 -> llm_server TTS"""
        try:
            print(f"收到音频消息，客户端ID: {client_id}")
            print(f"消息内容: {message}")
            
            # 获取角色ID
            character_id = message.get("characterId")
            print(f"🔍 音频处理中的角色ID: {character_id}")
            
            # 获取音频数据
            audio_data = message.get("data", [])
            if not audio_data:
                print("音频数据为空")
                await self._send_error(websocket, "音频数据为空")
                return
            
            print(f"音频数据长度: {len(audio_data)}")
            
            # 将音频数据转换为字节
            audio_bytes = bytes(audio_data)
            print(f"音频字节长度: {len(audio_bytes)}")
            print(f"音频数据前10个字节: {audio_data[:10]}...")  # 只显示前10个字节
            
            # 保存临时音频文件
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
                temp_file.write(audio_bytes)
                temp_audio_path = temp_file.name
                print(f"临时音频文件保存到: {temp_audio_path}")
            
            try:
                # 1. 使用七牛云ASR进行语音识别
                print("开始七牛云ASR语音识别...")
                from app.services.qiniu_asr_service import qiniu_asr_service
                from app.services.qiniu_service import qiniu_service
                
                # 上传音频到七牛云存储
                print("上传音频到七牛云存储...")
                upload_result = qiniu_service.upload_file(temp_audio_path, f"voice_chat/{client_id}_{int(time.time())}.webm")
                if not upload_result.get("success"):
                    print(f"音频上传失败: {upload_result}")
                    await self._send_error(websocket, "音频上传失败")
                    return
                
                audio_url = upload_result.get("url")
                print(f"音频上传成功，URL: {audio_url}")
                
                # 调用七牛云ASR
                transcript = await qiniu_asr_service.speech_to_text(audio_url, "zh")
                print(f"七牛云ASR识别结果: {transcript}")
                
                if not transcript.strip():
                    # 如果没有识别到内容，不发送错误，继续监听
                    print("未识别到语音内容，继续监听...")
                    return
                
                # 发送识别结果
                await self._send_message(websocket, {
                    "type": "transcript",
                    "text": transcript
                })
                
                # 2. 使用现有的AI服务生成回复
                print("开始AI服务生成回复...")
                character_id = message.get("characterId")
                if not character_id:
                    await self._send_error(websocket, "缺少角色ID")
                    return
                
                # 获取会话历史（这里简化处理，实际应该从数据库获取）
                session_history = []
                
                ai_response_result = await self.ai_service.generate_response(
                    character_id=character_id,
                    user_message=transcript,
                    session_history=session_history
                )
                
                ai_response = ai_response_result.get("content", "")
                print(f"AI服务回复: {ai_response}")
                
                if not ai_response.strip():
                    await self._send_error(websocket, "AI回复生成失败")
                    return
                
                # 3. 使用llm_server进行TTS
                print("开始llm_server TTS...")
                audio_url = await self._generate_voice_response(ai_response, character_id)
                
                if audio_url:
                    # 发送AI回复和音频
                    await self._send_message(websocket, {
                        "type": "response",
                        "text": ai_response,
                        "audioUrl": audio_url
                    })
                else:
                    # 只发送文本回复
                    await self._send_message(websocket, {
                        "type": "response",
                        "text": ai_response
                    })
                
            finally:
                # 清理临时文件
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
                    
        except Exception as e:
            print(f"处理音频失败: {e}")
            await self._send_error(websocket, f"处理音频失败: {str(e)}")
    
    async def _handle_silence_timeout(self, websocket: WebSocket, client_id: str, message: Dict[str, Any]):
        """处理静音超时 - AI主动说话"""
        try:
            print("处理静音超时，AI主动说话...")
            print(f"收到的消息: {message}")
            
            # 获取角色ID
            character_id = message.get("characterId")
            print(f"角色ID: {character_id}")
            if not character_id:
                await self._send_error(websocket, "缺少角色ID")
                return
            
            print("开始调用AI服务生成回复...")
            try:
                # 生成AI主动说话的内容
                ai_response_result = await self.ai_service.generate_response(
                    character_id=character_id,
                    user_message="用户长时间没有说话，请主动发起对话",
                    session_history=[]
                )
            except Exception as ai_error:
                print(f"AI服务调用失败: {ai_error}")
                await self._send_error(websocket, f"AI服务调用失败: {str(ai_error)}")
                return
            
            print(f"AI服务返回结果: {ai_response_result}")
            ai_response = ai_response_result.get("content", "")
            print(f"AI主动回复内容: '{ai_response}'")
            print(f"回复内容长度: {len(ai_response)}")
            print(f"回复内容是否为空: {not ai_response.strip()}")
            
            if not ai_response.strip():
                print("AI回复为空，发送错误消息")
                await self._send_error(websocket, "AI回复生成失败")
                return
            
            # 生成语音回复
            audio_url = await self._generate_voice_response(ai_response, character_id)
            
            if audio_url:
                # 发送AI回复和音频
                await self._send_message(websocket, {
                    "type": "response",
                    "text": ai_response,
                    "audioUrl": audio_url
                })
            else:
                # 只发送文本回复
                await self._send_message(websocket, {
                    "type": "response",
                    "text": ai_response
                })
                
        except Exception as e:
            print(f"处理静音超时失败: {e}")
            await self._send_error(websocket, f"处理静音超时失败: {str(e)}")
    
    async def _handle_ready(self, websocket: WebSocket, client_id: str, message: Dict[str, Any]):
        """处理ready消息 - 准备开始下一轮录音"""
        try:
            print("收到ready消息，准备开始下一轮录音")
            # 这里可以添加一些准备逻辑，比如重置状态等
            await self._send_message(websocket, {
                "type": "ready_ack",
                "message": "准备开始录音"
            })
        except Exception as e:
            print(f"处理ready消息失败: {e}")
    
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
    
    async def _generate_voice_response(self, text: str, character_id: str) -> str:
        """生成语音回复"""
        try:
            # 从数据库获取角色信息
            from app.core.database import AsyncSessionLocal
            from app.services.character_service import CharacterService
            
            async with AsyncSessionLocal() as db:
                character_service = CharacterService(db)
                print(f"🔍 查找角色ID: {character_id}")
                character = await character_service.get_character_by_id(character_id)
                
                if not character:
                    print(f"❌ 角色 {character_id} 不存在，使用默认TTS")
                    return await self.tts_service._generate_default_voice(text, "zh")
                else:
                    print(f"✅ 找到角色: {character.name} (ID: {character.id})")
                
                # 构建角色数据
                character_data = {
                    "reference_audio_path": character.reference_audio_path,
                    "reference_audio_text": character.reference_audio_text,
                    "reference_audio_language": character.reference_audio_language or "zh"
                }
                
                print(f"角色 {character.name} 的参考音频: {character.reference_audio_path}")
                
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id=character_id,
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
