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
import logging

# 设置日志
logger = logging.getLogger(__name__)

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
        """同步语音转文字 - 支持多种识别引擎和降级方案"""
        wav_path = None
        try:
            # 加载音频文件
            audio = AudioSegment.from_file(audio_path)
            
            # 音频预处理
            # 1. 转换为单声道
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # 2. 设置采样率为16kHz（Google Speech Recognition推荐）
            audio = audio.set_frame_rate(16000)
            
            # 3. 标准化音量
            audio = audio.normalize()
            
            # 4. 转换为WAV格式
            wav_path = audio_path.replace('.', '_processed.') + '.wav'
            audio.export(wav_path, format="wav", parameters=["-ac", "1", "-ar", "16000"])
            
            # 使用speech_recognition进行识别
            with sr.AudioFile(wav_path) as source:
                # 调整环境噪音
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio_data = self.recognizer.record(source)
            
            # 尝试多种识别引擎
            text = self._try_multiple_recognition_engines(audio_data, language)
            
            return text
            
        except sr.UnknownValueError:
            raise VoiceProcessingError("无法识别语音内容，请确保语音清晰")
        except Exception as e:
            raise VoiceProcessingError(f"语音识别失败: {str(e)}")
        finally:
            # 清理临时文件
            if wav_path and os.path.exists(wav_path):
                try:
                    os.remove(wav_path)
                except Exception as e:
                    logger.warning(f"清理临时文件失败: {e}")
    
    def _try_multiple_recognition_engines(self, audio_data, language: str) -> str:
        """尝试多种语音识别引擎"""
        recognition_engines = [
            ("Google Web Speech", lambda: self.recognizer.recognize_google(audio_data, language=language)),
            ("Google Cloud Speech", lambda: self.recognizer.recognize_google_cloud(audio_data, language=language)),
            ("Bing Speech", lambda: self.recognizer.recognize_bing(audio_data, language=language)),
            ("Azure Speech", lambda: self.recognizer.recognize_azure(audio_data, language=language)),
            ("Sphinx (Offline)", lambda: self.recognizer.recognize_sphinx(audio_data)),
        ]
        
        last_error = None
        
        for engine_name, recognition_func in recognition_engines:
            try:
                logger.info(f"尝试使用 {engine_name} 进行语音识别...")
                text = recognition_func()
                if text and text.strip():
                    logger.info(f"使用 {engine_name} 识别成功: {text}")
                    return text
            except sr.RequestError as e:
                logger.warning(f"{engine_name} 连接失败: {e}")
                last_error = e
                continue
            except sr.UnknownValueError as e:
                logger.warning(f"{engine_name} 无法识别语音: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"{engine_name} 发生未知错误: {e}")
                last_error = e
                continue
        
        # 如果所有在线引擎都失败，尝试离线引擎
        try:
            logger.info("尝试使用离线语音识别...")
            text = self.recognizer.recognize_sphinx(audio_data)
            if text and text.strip():
                logger.info(f"离线识别成功: {text}")
                return text
        except Exception as e:
            logger.warning(f"离线识别也失败: {e}")
        
        # 如果所有引擎都失败，返回模拟文本
        if last_error:
            logger.error(f"所有语音识别引擎都失败，最后错误: {last_error}")
            return self._get_fallback_response()
        
        raise VoiceProcessingError("无法识别语音内容，请确保语音清晰")
    
    def _get_fallback_response(self) -> str:
        """当语音识别失败时的降级响应"""
        fallback_responses = [
            "抱歉，我无法识别您的语音，请尝试重新录制或使用文字输入。",
            "语音识别服务暂时不可用，请使用文字输入与我交流。",
            "我听到了您的声音，但无法准确识别内容，请重试或使用文字输入。"
        ]
        import random
        return random.choice(fallback_responses)
    
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
