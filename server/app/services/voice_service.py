"""
语音服务 - 负责语音识别和TTS
"""

import speech_recognition as sr
from gtts import gTTS
import os
import uuid
from typing import Optional
from app.core.config import settings
from app.core.exceptions import VoiceProcessingError
import asyncio
from pydub import AudioSegment
import tempfile

class VoiceService:
    """语音服务类"""
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.language = settings.SPEECH_RECOGNITION_LANGUAGE
        self.tts_language = settings.TTS_LANGUAGE
    
    async def speech_to_text(self, audio_path: str, language: str = "zh-CN") -> str:
        """语音转文字"""
        try:
            # 在异步环境中运行同步代码
            loop = asyncio.get_event_loop()
            text = await loop.run_in_executor(
                None, 
                self._speech_to_text_sync, 
                audio_path, 
                language
            )
            return text
        except Exception as e:
            raise VoiceProcessingError(f"语音识别失败: {str(e)}")
    
    def _speech_to_text_sync(self, audio_path: str, language: str) -> str:
        """同步语音转文字"""
        try:
            # 加载音频文件
            audio = AudioSegment.from_file(audio_path)
            
            # 转换为WAV格式（如果需要的話）
            if not audio_path.endswith('.wav'):
                wav_path = audio_path.replace('.', '_temp.') + '.wav'
                audio.export(wav_path, format="wav")
                audio_path = wav_path
            
            # 使用speech_recognition进行识别
            with sr.AudioFile(audio_path) as source:
                audio_data = self.recognizer.record(source)
            
            # 识别语音
            text = self.recognizer.recognize_google(
                audio_data, 
                language=language
            )
            
            # 清理临时文件
            if audio_path.endswith('_temp.wav'):
                os.remove(audio_path)
            
            return text
            
        except sr.UnknownValueError:
            raise VoiceProcessingError("无法识别语音内容")
        except sr.RequestError as e:
            raise VoiceProcessingError(f"语音识别服务错误: {str(e)}")
    
    async def text_to_speech(
        self, 
        text: str, 
        voice_style: str = "自然",
        language: str = "zh",
        speed: float = 1.0
    ) -> str:
        """文字转语音"""
        try:
            # 在异步环境中运行同步代码
            loop = asyncio.get_event_loop()
            audio_url = await loop.run_in_executor(
                None,
                self._text_to_speech_sync,
                text,
                voice_style,
                language,
                speed
            )
            return audio_url
        except Exception as e:
            raise VoiceProcessingError(f"语音合成失败: {str(e)}")
    
    def _text_to_speech_sync(
        self, 
        text: str, 
        voice_style: str, 
        language: str, 
        speed: float
    ) -> str:
        """同步文字转语音"""
        try:
            # 生成唯一文件名
            filename = f"tts_{uuid.uuid4().hex}.mp3"
            filepath = os.path.join(settings.UPLOAD_DIR, filename)
            
            # 确保目录存在
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
            
            # 使用gTTS生成语音
            tts = gTTS(text=text, lang=language, slow=False)
            tts.save(filepath)
            
            # 调整语速（如果需要）
            if speed != 1.0:
                audio = AudioSegment.from_mp3(filepath)
                # 调整语速
                new_audio = audio.speedup(playback_speed=speed)
                new_audio.export(filepath, format="mp3")
            
            # 返回可访问的URL
            return f"/static/uploads/{filename}"
            
        except Exception as e:
            raise VoiceProcessingError(f"语音合成失败: {str(e)}")
    
    async def get_character_voice_style(self, character_id: str) -> str:
        """获取角色语音风格"""
        # 这里应该从数据库获取角色信息
        # 暂时返回模拟数据
        voice_styles = {
            "harry-potter": "年轻、充满活力、英国口音",
            "socrates": "深沉、智慧、古希腊口音",
            "einstein": "温和、幽默、德国口音",
            "hermione-granger": "聪明、自信、英国口音",
            "sherlock-holmes": "冷静、分析性、英国口音",
            "cleopatra": "优雅、迷人、古埃及口音",
            "leonardo-da-vinci": "艺术性、富有想象力、意大利口音",
            "marie-curie": "坚定、科学、波兰口音",
            "shakespeare": "优雅、富有表现力、英国口音",
            "hercules": "威严、有力、古希腊口音"
        }
        
        return voice_styles.get(character_id, "自然、友好")
    
    async def process_audio_file(self, audio_path: str) -> dict:
        """处理音频文件（格式转换、降噪等）"""
        try:
            # 加载音频
            audio = AudioSegment.from_file(audio_path)
            
            # 基本处理
            # 1. 标准化音量
            audio = audio.normalize()
            
            # 2. 降噪（简单的高通滤波）
            audio = audio.high_pass_filter(80)
            
            # 3. 转换为单声道
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # 4. 设置采样率
            audio = audio.set_frame_rate(16000)
            
            # 保存处理后的文件
            processed_path = audio_path.replace('.', '_processed.')
            audio.export(processed_path, format="wav")
            
            return {
                "processed_path": processed_path,
                "duration": len(audio) / 1000,  # 秒
                "sample_rate": audio.frame_rate,
                "channels": audio.channels
            }
            
        except Exception as e:
            raise VoiceProcessingError(f"音频处理失败: {str(e)}")
