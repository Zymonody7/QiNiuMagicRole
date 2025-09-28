"""
高级音频导出服务 - 支持自定义音色、背景音乐等
"""

import os
import tempfile
import aiofiles
import asyncio
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
            print(f"开头话术: {intro_text}")
            print(f"结尾话术: {outro_text}")
            
            # 创建临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                audio_segments = []
                
                # 添加播客开头
                intro_audio = await self._generate_custom_intro(intro_text, user_voice_type, user_voice_file)
                if intro_audio:
                    audio_segments.append(intro_audio)
                
                # 处理每条消息
                for i, message in enumerate(messages):
                    print(f"处理消息 {i+1}/{len(messages)} - {'用户' if message.get('is_user', False) else 'AI'}")
                    content = message.get('content', '')
                    is_user = message.get('is_user', False)
                    existing_audio_url = message.get('audio_url')
                    
                    if is_user:
                        # 用户消息 - 根据配置生成音频
                        user_audio = await self._generate_user_audio(
                            content, 
                            user_voice_type, 
                            user_voice_file,
                            character
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
                outro_audio = await self._generate_custom_outro(outro_text, user_voice_type, user_voice_file)
                if outro_audio:
                    final_audio = final_audio + outro_audio
                
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
    
    async def _generate_custom_intro(self, intro_text: str, user_voice_type: str, user_voice_file: Optional[Any]) -> Optional[AudioSegment]:
        """生成自定义开头"""
        try:
            if user_voice_type == 'qiniu_male':
                # 使用七牛云男声
                return await self._generate_qiniu_tts_audio(intro_text, "qiniu_zh_male_whxkxg")
            elif user_voice_type in ['custom_upload', 'custom_record'] and user_voice_file:
                # 使用用户自定义音色
                return await self._generate_custom_voice_audio(intro_text, user_voice_file)
            else:
                # 默认使用七牛云男声
                return await self._generate_qiniu_tts_audio(intro_text, "qiniu_zh_male_whxkxg")
        except Exception as e:
            print(f"生成自定义开头失败: {e}")
            return None
    
    async def _generate_custom_outro(self, outro_text: str, user_voice_type: str, user_voice_file: Optional[Any]) -> Optional[AudioSegment]:
        """生成自定义结尾"""
        try:
            if user_voice_type == 'qiniu_male':
                # 使用七牛云男声
                return await self._generate_qiniu_tts_audio(outro_text, "qiniu_zh_male_whxkxg")
            elif user_voice_type in ['custom_upload', 'custom_record'] and user_voice_file:
                # 使用用户自定义音色
                return await self._generate_custom_voice_audio(outro_text, user_voice_file)
            else:
                # 默认使用七牛云男声
                return await self._generate_qiniu_tts_audio(outro_text, "qiniu_zh_male_whxkxg")
        except Exception as e:
            print(f"生成自定义结尾失败: {e}")
            return None
    
    async def _generate_user_audio(self, text: str, user_voice_type: str, user_voice_file: Optional[Any], character: Any) -> Optional[AudioSegment]:
        """生成用户音频"""
        try:
            # 检查缓存
            cache_key = f"user_{text}_{user_voice_type}"
            cached_audio = await self.tts_cache.get_cached_audio(text, user_voice_type)
            if cached_audio:
                return AudioSegment.from_file(cached_audio)
            
            if user_voice_type == 'qiniu_male':
                # 使用七牛云男声
                audio = await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            elif user_voice_type in ['custom_upload', 'custom_record'] and user_voice_file:
                # 使用用户自定义音色
                audio = await self._generate_custom_voice_audio(text, user_voice_file)
            else:
                # 默认使用七牛云男声
                audio = await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            
            # 缓存音频
            if audio:
                audio_data = audio.export(format="mp3").read()
                await self.tts_cache.cache_audio(text, user_voice_type, audio_data)
            
            return audio
        except Exception as e:
            print(f"生成用户音频失败: {e}")
            return None
    
    async def _generate_ai_audio(self, text: str, character: Any) -> Optional[AudioSegment]:
        """生成AI音频"""
        try:
            # 检查缓存
            cache_key = f"ai_{text}_{character.id}"
            cached_audio = await self.tts_cache.get_cached_audio(text, f"ai_{character.id}")
            if cached_audio:
                return AudioSegment.from_file(cached_audio)
            
            # 使用TTS服务生成AI音频
            if character.reference_audio_path:
                character_data = {
                    "reference_audio_path": character.reference_audio_path,
                    "reference_audio_text": character.reference_audio_text,
                    "reference_audio_language": character.reference_audio_language
                }
                
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id=character.id,
                    character_data=character_data,
                    text_language="zh"
                )
                
                if audio_url:
                    # 下载音频
                    audio = await self._download_audio(audio_url)
                    if audio:
                        # 缓存音频
                        audio_data = audio.export(format="mp3").read()
                        await self.tts_cache.cache_audio(text, f"ai_{character.id}", audio_data)
                        return audio
            
            # 降级到七牛云TTS
            return await self._generate_qiniu_tts_audio(text, "qiniu_zh_female_wwxkjx")
            
        except Exception as e:
            print(f"生成AI音频失败: {e}")
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
    
    async def _generate_custom_voice_audio(self, text: str, user_voice_file: Any) -> Optional[AudioSegment]:
        """使用用户自定义音色生成音频"""
        try:
            print(f"使用用户自定义音色生成音频: {text[:30]}...")
            
            # 上传用户音色文件到存储
            if hasattr(user_voice_file, 'read'):
                # 如果是文件对象
                voice_data = await user_voice_file.read()
                filename = getattr(user_voice_file, 'filename', 'user_voice.wav')
            else:
                # 如果是文件路径
                with open(user_voice_file, 'rb') as f:
                    voice_data = f.read()
                filename = 'user_voice.wav'
            
            # 上传到存储服务
            voice_url = await static_asset_service.upload_file(
                voice_data,
                f"user_voices/{filename}"
            )
            
            if voice_url:
                # 使用TTS服务进行语音克隆
                # 这里需要创建一个临时的角色数据
                character_data = {
                    "reference_audio_path": voice_url,
                    "reference_audio_text": "用户自定义音色",
                    "reference_audio_language": "zh"
                }
                
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id="user_custom_voice",
                    character_data=character_data,
                    text_language="zh"
                )
                
                if audio_url:
                    return await self._download_audio(audio_url)
            
            # 降级到七牛云TTS
            return await self._generate_qiniu_tts_audio(text, "qiniu_zh_male_whxkxg")
            
        except Exception as e:
            print(f"自定义音色生成失败: {e}")
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
