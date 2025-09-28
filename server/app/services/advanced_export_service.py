"""
高级音频导出服务 - 支持自定义音色、背景音乐等
"""

import os
import tempfile
import aiofiles
import asyncio
import hashlib
from typing import List, Dict, Any, Optional
from pydub import AudioSegment
from pydub.effects import normalize
import numpy as np
from app.services.export_service import ExportService
from app.services.tts_cache_service import tts_cache_service
from app.services.qiniu_podcast_tts_service import qiniu_podcast_tts_service
from app.services.tts_service import TTSService
from app.services.static_asset_service import static_asset_service

class AdvancedExportService(ExportService):
    """高级音频导出服务"""
    
    def __init__(self, db):
        super().__init__(db)
        self.tts_cache = tts_cache_service
        self.tts_service = TTSService()
    
    async def generate_advanced_podcast_audio(
        self,
        messages: List[Dict],
        character: Any,
        user_voice_type: str,
        user_voice_file: Optional[Any] = None,
        background_music_file: Optional[Any] = None,
        intro_text: str = "欢迎收听对话播客。",
        outro_text: str = "感谢收听对话播客，再见！"
    ) -> bytes:
        """生成高级播客音频"""
        try:
            print(f"开始生成高级播客，共 {len(messages)} 条消息")
            print(f"用户音色类型: {user_voice_type}")
            print(f"用户音色文件: {user_voice_file}")
            print(f"开头话术: {intro_text}")
            print(f"结尾话术: {outro_text}")
            
            # 预先读取用户音色文件数据，避免重复读取导致空数据
            user_voice_data = None
            if user_voice_file and user_voice_type in ['custom_upload', 'custom_record']:
                print("预先读取用户音色文件数据...")
                try:
                    if hasattr(user_voice_file, 'read'):
                        user_voice_data = await user_voice_file.read()
                        print(f"用户音色文件数据大小: {len(user_voice_data)} 字节")
                    else:
                        with open(user_voice_file, 'rb') as f:
                            user_voice_data = f.read()
                        print(f"用户音色文件数据大小: {len(user_voice_data)} 字节")
                except Exception as e:
                    print(f"读取用户音色文件失败: {e}")
                    user_voice_data = None
            
            # 创建临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                audio_segments = []
                
                # 添加播客开头
                print(f"开始生成播客开头: {intro_text}")
                intro_audio = await self._generate_custom_intro(intro_text, user_voice_type, user_voice_file, user_voice_data)
                if intro_audio:
                    print(f"播客开头生成成功，时长: {len(intro_audio)}ms")
                    audio_segments.append(intro_audio)
                else:
                    print("播客开头生成失败")
                
                # 处理每条消息
                for i, message in enumerate(messages):
                    print(f"处理消息 {i+1}/{len(messages)}")
                    print(f"消息数据结构: {message}")
                    
                    # 检查多种可能的用户标识字段
                    is_user = message.get('is_user', False) or message.get('isUser', False)
                    print(f"is_user字段值: {message.get('is_user', 'NOT_FOUND')}")
                    print(f"isUser字段值: {message.get('isUser', 'NOT_FOUND')}")
                    print(f"最终is_user值: {is_user}")
                    print(f"消息类型: {'用户' if is_user else 'AI'}")
                    
                    content = message.get('content', '')
                    existing_audio_url = message.get('audio_url') or message.get('audioUrl')
                    
                    if is_user:
                        # 用户消息 - 根据配置生成音频
                        user_audio = await self._generate_user_audio(
                            content, 
                            user_voice_type, 
                            user_voice_file,
                            character,
                            user_voice_data
                        )
                        if user_audio:
                            # 对用户音频使用增强的标准化
                            user_audio = self._normalize_audio_with_gain(user_audio, target_db=-18.0)
                            audio_segments.append(user_audio)
                    else:
                        # AI消息 - 优先使用现有音频
                        if existing_audio_url:
                            try:
                                ai_audio = await self._download_audio(existing_audio_url)
                                if ai_audio:
                                    ai_audio = self._normalize_audio(ai_audio)
                                    audio_segments.append(ai_audio)
                                    continue
                            except Exception as e:
                                print(f"下载AI音频失败: {e}")
                        
                        # 生成新的AI音频
                        ai_audio = await self._generate_ai_audio(content, character)
                        if ai_audio:
                            # 对AI音频也使用标准化处理
                            ai_audio = self._normalize_audio(ai_audio)
                            audio_segments.append(ai_audio)
                    
                    # 添加消息间隔
                    if i < len(messages) - 1:
                        pause_audio = self._generate_pause()
                        if pause_audio:
                            audio_segments.append(pause_audio)
                
                if not audio_segments:
                    raise Exception("没有生成任何音频片段")
                
                print(f"开始拼接 {len(audio_segments)} 个音频片段")
                
                # 拼接所有音频，使用音量平衡
                final_audio = self._concatenate_audios_with_volume_balance(audio_segments)
                
                # 添加播客结尾
                print(f"开始生成播客结尾: {outro_text}")
                outro_audio = await self._generate_custom_outro(outro_text, user_voice_type, user_voice_file, user_voice_data)
                if outro_audio:
                    print(f"播客结尾生成成功，时长: {len(outro_audio)}ms")
                    final_audio = final_audio + outro_audio
                else:
                    print("播客结尾生成失败")
                
                # 添加背景音乐
                if background_music_file:
                    final_audio = await self._add_custom_background_music(final_audio, background_music_file)
                
                # 最终音频处理
                final_audio = self._finalize_audio(final_audio)
                
                # 导出为MP3
                output_path = os.path.join(temp_dir, "advanced_podcast.mp3")
                final_audio.export(output_path, format="mp3", bitrate="128k")
                
                print(f"高级播客生成完成，文件大小: {os.path.getsize(output_path)} 字节")
                
                # 读取文件内容
                async with aiofiles.open(output_path, 'rb') as f:
                    return await f.read()
                    
        except Exception as e:
            print(f"生成高级播客音频失败: {e}")
            import traceback
            traceback.print_exc()
            raise Exception(f"高级播客生成失败: {str(e)}")
    
    async def _generate_custom_intro(self, intro_text: str, user_voice_type: str, user_voice_file: Optional[Any], user_voice_data: Optional[bytes] = None) -> Optional[AudioSegment]:
        """生成自定义开头 - 统一使用七牛云TTS"""
        try:
            print(f"生成播客开头 - 文本: {intro_text}")
            print("播客开头统一使用七牛云男声（不管用户选择什么音色）")
            
            # 开头话术统一使用七牛云TTS，不管用户选择什么音色
            return await self._generate_qiniu_tts_audio(intro_text, "qiniu_zh_male_whxkxg")
        except Exception as e:
            print(f"生成自定义开头失败: {e}")
            return None
    
    async def _generate_custom_outro(self, outro_text: str, user_voice_type: str, user_voice_file: Optional[Any], user_voice_data: Optional[bytes] = None) -> Optional[AudioSegment]:
        """生成自定义结尾 - 统一使用七牛云TTS"""
        try:
            print(f"生成播客结尾 - 文本: {outro_text}")
            print("播客结尾统一使用七牛云男声（不管用户选择什么音色）")
            
            # 结尾话术统一使用七牛云TTS，不管用户选择什么音色
            return await self._generate_qiniu_tts_audio(outro_text, "qiniu_zh_male_whxkxg")
        except Exception as e:
            print(f"生成自定义结尾失败: {e}")
            return None
    
    async def _generate_user_audio(self, text: str, user_voice_type: str, user_voice_file: Optional[Any], character: Any, user_voice_data: Optional[bytes] = None) -> Optional[AudioSegment]:
        """生成用户音频 - 每次都重新生成，不使用缓存"""
        try:
            print(f"生成用户音频 - 音色类型: {user_voice_type}, 文本: {text[:30]}...")
            print(f"用户音色文件存在: {user_voice_file is not None}")
            if user_voice_file:
                print(f"用户音色文件类型: {type(user_voice_file)}")
            
            print(f"音色类型检查:")
            print(f"  - user_voice_type == 'qiniu_male': {user_voice_type == 'qiniu_male'}")
            print(f"  - user_voice_type in ['custom_upload', 'custom_record']: {user_voice_type in ['custom_upload', 'custom_record']}")
            print(f"  - user_voice_file存在: {user_voice_file is not None}")
            print(f"  - 自定义音色条件: {user_voice_type in ['custom_upload', 'custom_record'] and user_voice_file}")
            
            if user_voice_type == 'qiniu_male':
                # 使用七牛云男声 - 直接调用七牛云TTS服务，不调用llm_server
                print("使用七牛云男声生成用户音频")
                audio = await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            elif user_voice_type in ['custom_upload', 'custom_record'] and user_voice_file:
                # 使用用户自定义音色 - 调用llm_server进行语音克隆
                print("使用用户自定义音色生成音频，调用llm_server")
                audio = await self._generate_custom_voice_audio(text, user_voice_file, user_voice_data)
            else:
                # 默认使用七牛云男声
                print("默认使用七牛云男声生成用户音频")
                audio = await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            
            if audio:
                print(f"用户音频生成成功，时长: {len(audio)}ms")
            else:
                print("用户音频生成失败")
            
            return audio
        except Exception as e:
            print(f"生成用户音频失败: {e}")
            return None
    
    async def _generate_ai_audio(self, text: str, character: Any) -> Optional[AudioSegment]:
        """生成AI音频 - 使用数据库记录的角色信息，支持缓存"""
        try:
            print(f"生成AI音频 - 角色: {character.name}, 文本: {text[:30]}...")
            
            # 检查缓存 - 角色音频使用缓存机制
            cached_audio = await self.tts_cache.get_cached_audio(text, f"ai_{character.id}")
            if cached_audio:
                print("使用缓存的AI音频")
                return AudioSegment.from_file(cached_audio)
            
            # 使用TTS服务生成AI音频 - 使用角色的参考音频（数据库记录）
            if character.reference_audio_path:
                print(f"使用角色参考音频生成AI音频: {character.reference_audio_path}")
                character_data = {
                    "reference_audio_path": character.reference_audio_path,
                    "reference_audio_text": character.reference_audio_text,
                    "reference_audio_language": character.reference_audio_language
                }
                
                print("调用llm_server生成AI音频...")
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id=character.id,
                    character_data=character_data,
                    text_language="zh"
                )
                
                if audio_url:
                    print(f"AI音频生成成功，URL: {audio_url}")
                    # 下载音频
                    audio = await self._download_audio(audio_url)
                    if audio:
                        # 缓存音频 - 角色音频使用缓存
                        audio_data = audio.export(format="mp3").read()
                        await self.tts_cache.cache_audio(text, f"ai_{character.id}", audio_data)
                        print(f"AI音频生成成功，时长: {len(audio)}ms")
                        return audio
                else:
                    print("AI音频生成失败，降级到七牛云TTS")
            else:
                print("角色没有参考音频，降级到七牛云TTS")
            
            # 降级到七牛云TTS
            print("使用七牛云女声作为AI音频")
            return await self._generate_qiniu_tts_audio(text, "qiniu_zh_female_wwxkjx")
            
        except Exception as e:
            print(f"生成AI音频失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _generate_qiniu_tts_audio(self, text: str, voice_type: str) -> Optional[AudioSegment]:
        """生成七牛云TTS音频"""
        try:
            if qiniu_podcast_tts_service.is_enabled():
                return await qiniu_podcast_tts_service.generate_podcast_voice(
                    text=text,
                    voice_type=voice_type,
                    speed_ratio=1.0,
                    encoding="mp3"
                )
            else:
                return self._generate_mock_audio(text, False)
        except Exception as e:
            print(f"七牛云TTS生成失败: {e}")
            return self._generate_mock_audio(text, False)
    
    async def _generate_custom_voice_audio(self, text: str, user_voice_file: Any, user_voice_data: Optional[bytes] = None) -> Optional[AudioSegment]:
        """使用用户自定义音色生成音频"""
        try:
            print(f"使用用户自定义音色生成音频: {text[:30]}...")
            print(f"用户音色文件类型: {type(user_voice_file)}")
            
            # 直接尝试调用llm_server，失败时降级到七牛云TTS
            print("准备调用llm_server进行语音克隆...")
            
            # 使用预先读取的文件数据
            if user_voice_data is not None:
                print(f"使用预先读取的用户音色数据，大小: {len(user_voice_data)} 字节")
                voice_data = user_voice_data
                filename = getattr(user_voice_file, 'filename', 'user_voice.wav')
            else:
                # 如果没有预先读取的数据，尝试从文件对象读取
                if hasattr(user_voice_file, 'read'):
                    # 如果是UploadFile对象，使用正确的读取方式
                    print(f"处理UploadFile对象: {type(user_voice_file)}")
                    print(f"文件名: {getattr(user_voice_file, 'filename', 'unknown')}")
                    print(f"内容类型: {getattr(user_voice_file, 'content_type', 'unknown')}")
                    print(f"文件大小: {getattr(user_voice_file, 'size', 'unknown')}")
                    
                    try:
                        # UploadFile的read()方法是异步的，直接await
                        voice_data = await user_voice_file.read()
                        print(f"从UploadFile读取音色数据，大小: {len(voice_data)} 字节")
                        
                    except Exception as e:
                        print(f"读取UploadFile数据失败: {e}")
                        voice_data = b""
                    
                    filename = getattr(user_voice_file, 'filename', 'user_voice.wav')
                else:
                    # 如果是文件路径
                    with open(user_voice_file, 'rb') as f:
                        voice_data = f.read()
                    filename = 'user_voice.wav'
                    print(f"从文件路径读取音色数据，大小: {len(voice_data)} 字节")
            
            # 检查文件数据是否有效
            if len(voice_data) == 0:
                print("警告：用户音色文件为空，降级到七牛云TTS")
                return await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            
            # 上传到存储服务
            print("上传用户音色文件到存储服务...")
            if static_asset_service.use_qiniu:
                # 使用七牛云存储直接上传字节数据
                from app.services.qiniu_service import qiniu_service
                result = qiniu_service.upload_data(
                    data=voice_data,
                    key=f"user_voices/{filename}",
                    mime_type="audio/wav"
                )
                if result["success"]:
                    voice_url = result["url"]
                    print(f"七牛云上传成功: {voice_url}")
                else:
                    print(f"七牛云上传失败: {result['error']}")
                    voice_url = None
            else:
                # 使用本地存储
                import os
                upload_dir = os.path.join(static_asset_service.upload_dir, "user_voices")
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)
                with open(file_path, 'wb') as f:
                    f.write(voice_data)
                voice_url = f"/static/uploads/user_voices/{filename}"
                print(f"本地存储成功: {voice_url}")
            
            if voice_url:
                print(f"用户音色文件已上传: {voice_url}")
                
                # 使用七牛云ASR自动获取音频的实际文本内容
                print("使用七牛云ASR获取音频文本内容...")
                try:
                    from app.services.qiniu_asr_service import qiniu_asr_service
                    if qiniu_asr_service.is_enabled():
                        # 使用ASR服务获取音频的实际文本
                        prompt_text = await qiniu_asr_service.speech_to_text(voice_url, "zh")
                        print(f"ASR识别结果: {prompt_text}")
                        
                        if not prompt_text or len(prompt_text.strip()) == 0:
                            print("ASR识别结果为空，使用默认文本")
                            prompt_text = "你好，这是一个测试音频"
                    else:
                        print("七牛云ASR服务未启用，使用默认文本")
                        prompt_text = "你好，这是一个测试音频"
                except Exception as e:
                    print(f"ASR识别失败: {e}，使用默认文本")
                    prompt_text = "你好，这是一个测试音频"
                
                # 使用TTS服务进行语音克隆 - 调用llm_server
                character_data = {
                    "reference_audio_path": voice_url,
                    "reference_audio_text": prompt_text,  # 使用ASR识别的实际文本
                    "reference_audio_language": "zh"
                }
                
                print(f"准备调用llm_server，角色数据: {character_data}")
                print("调用llm_server进行语音克隆...")
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id="user_custom_voice",
                    character_data=character_data,
                    text_language="zh"
                )
                
                if audio_url:
                    print(f"语音克隆成功，音频URL: {audio_url}")
                    audio = await self._download_audio(audio_url)
                    if audio:
                        print(f"下载的音频时长: {len(audio)}ms")
                        if len(audio) == 0:
                            print("警告：下载的音频时长为0，可能是空文件")
                        return audio
                    else:
                        print("音频下载失败，降级到七牛云TTS")
                else:
                    print("语音克隆失败，降级到七牛云TTS")
            else:
                print("用户音色文件上传失败，降级到七牛云TTS")
            
            # 降级到七牛云TTS
            print("降级到七牛云TTS")
            return await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            
        except Exception as e:
            print(f"自定义音色生成失败: {e}")
            import traceback
            traceback.print_exc()
            return await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
    
    async def _add_custom_background_music(self, audio: AudioSegment, background_music_file: Any) -> AudioSegment:
        """添加自定义背景音乐"""
        try:
            print("添加自定义背景音乐")
            
            # 读取背景音乐文件
            if hasattr(background_music_file, 'read'):
                # 如果是文件对象
                music_data = await background_music_file.read()
            else:
                # 如果是文件路径
                with open(background_music_file, 'rb') as f:
                    music_data = f.read()
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                temp_file.write(music_data)
                temp_file.flush()
                temp_file_path = temp_file.name
            
            try:
                # 加载背景音乐
                music_segment = AudioSegment.from_file(temp_file_path)
                
                # 调整背景音乐长度以匹配主音频
                if len(music_segment) < len(audio):
                    # 如果背景音乐太短，循环播放
                    loops_needed = (len(audio) // len(music_segment)) + 1
                    music_segment = music_segment * loops_needed
                
                # 截取到主音频长度
                music_segment = music_segment[:len(audio)]
                
                # 降低背景音乐音量
                music_segment = music_segment - 10  # -10dB
                
                # 混合音频
                mixed_audio = audio.overlay(music_segment)
                print(f"自定义背景音乐混合完成，原时长: {len(audio)}ms，混合后: {len(mixed_audio)}ms")
                return mixed_audio
                
            finally:
                # 清理临时文件
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
        except Exception as e:
            print(f"添加自定义背景音乐失败: {e}")
            return audio
