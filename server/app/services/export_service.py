"""
导出服务 - 处理对话导出功能
"""

import asyncio
import io
import tempfile
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
from docx import Document
from docx.shared import Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pydub import AudioSegment
from pydub.effects import normalize
import aiofiles

from app.core.config import settings
from app.services.tts_service import TTSService
from app.services.static_asset_service import static_asset_service


class ExportService:
    """导出服务类"""
    
    def __init__(self, db):
        self.db = db
        self.tts_service = TTSService()
        self.storage_service = static_asset_service
    
    def _safe_string(self, text):
        """安全处理字符串，避免编码问题"""
        if text is None:
            return ""
        if isinstance(text, str):
            # 清理可能的编码问题
            return text.encode('utf-8', errors='ignore').decode('utf-8')
        return str(text)
    
    async def generate_text_export(
        self, 
        messages: List[Dict], 
        character: Any, 
        format_type: str = "word"
    ) -> bytes:
        """生成文本导出文件"""
        if format_type == "word":
            return await self._generate_word_document(messages, character)
        elif format_type == "pdf":
            return await self._generate_pdf_document(messages, character)
        else:
            raise ValueError(f"不支持的格式: {format_type}")
    
    async def _generate_word_document(self, messages: List[Dict], character: Any) -> bytes:
        """生成Word文档"""
        doc = Document()
        
        # 设置文档标题
        title = doc.add_heading(f'与{character.name}的对话记录', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # 添加角色信息
        doc.add_heading('角色信息', level=1)
        doc.add_paragraph(f'角色名称: {self._safe_string(character.name)}')
        doc.add_paragraph(f'角色描述: {self._safe_string(character.description)}')
        doc.add_paragraph(f'性格特点: {self._safe_string(character.personality)}')
        doc.add_paragraph(f'背景故事: {self._safe_string(character.background)}')
        
        # 添加对话记录
        doc.add_heading('对话记录', level=1)
        doc.add_paragraph(f'导出时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        doc.add_paragraph(f'总消息数: {len(messages)}')
        doc.add_paragraph('')
        
        # 添加消息内容
        for i, message in enumerate(messages, 1):
            # 消息头部
            speaker = "用户" if message.get('is_user', False) else character.name
            timestamp = message.get('created_at', '')
            if timestamp:
                try:
                    # 如果timestamp已经是datetime对象，直接格式化
                    if isinstance(timestamp, datetime):
                        timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        # 如果是字符串，尝试解析
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    # 如果解析失败，尝试截取字符串
                    if isinstance(timestamp, str):
                        timestamp = timestamp[:19] if len(timestamp) > 19 else timestamp
                    else:
                        timestamp = str(timestamp)[:19]
            
            doc.add_heading(f'{i}. {speaker} ({timestamp})', level=2)
            
            # 消息内容
            content = message.get('content', '')
            # 确保内容为字符串并处理编码
            if isinstance(content, str):
                # 清理可能的编码问题
                content = content.encode('utf-8', errors='ignore').decode('utf-8')
            else:
                content = str(content)
            doc.add_paragraph(content)
            doc.add_paragraph('')  # 空行分隔
        
        # 保存到内存
        doc_buffer = io.BytesIO()
        try:
            doc.save(doc_buffer)
            doc_buffer.seek(0)
            return doc_buffer.getvalue()
        except UnicodeEncodeError as e:
            # 如果出现编码错误，尝试重新处理文档内容
            print(f"编码错误，尝试修复: {e}")
            # 重新创建文档，确保所有内容都是安全的
            return await self._generate_word_document_safe(messages, character)
    
    async def _generate_word_document_safe(self, messages: List[Dict], character: Any) -> bytes:
        """安全生成Word文档，处理编码问题"""
        doc = Document()
        
        # 设置文档标题
        title = doc.add_heading(f'与{self._safe_string(character.name)}的对话记录', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # 添加角色信息
        doc.add_heading('角色信息', level=1)
        doc.add_paragraph(f'角色名称: {self._safe_string(character.name)}')
        doc.add_paragraph(f'角色描述: {self._safe_string(character.description)}')
        doc.add_paragraph(f'性格特点: {self._safe_string(character.personality)}')
        doc.add_paragraph(f'背景故事: {self._safe_string(character.background)}')
        
        # 添加对话记录
        doc.add_heading('对话记录', level=1)
        doc.add_paragraph(f'导出时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        doc.add_paragraph(f'总消息数: {len(messages)}')
        doc.add_paragraph('')
        
        # 添加消息内容
        for i, message in enumerate(messages, 1):
            # 消息头部
            speaker = "用户" if message.get('is_user', False) else self._safe_string(character.name)
            timestamp = message.get('created_at', '')
            if timestamp:
                try:
                    if isinstance(timestamp, datetime):
                        timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    if isinstance(timestamp, str):
                        timestamp = timestamp[:19] if len(timestamp) > 19 else timestamp
                    else:
                        timestamp = str(timestamp)[:19]
            
            doc.add_heading(f'{i}. {speaker} ({timestamp})', level=2)
            
            # 消息内容
            content = self._safe_string(message.get('content', ''))
            doc.add_paragraph(content)
            doc.add_paragraph('')
        
        # 保存到内存
        doc_buffer = io.BytesIO()
        doc.save(doc_buffer)
        doc_buffer.seek(0)
        return doc_buffer.getvalue()
    
    async def _generate_pdf_document(self, messages: List[Dict], character: Any) -> bytes:
        """生成PDF文档"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # 标题样式
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # 居中
        )
        
        # 添加标题
        story.append(Paragraph(f'与{character.name}的对话记录', title_style))
        story.append(Spacer(1, 20))
        
        # 角色信息
        story.append(Paragraph('角色信息', styles['Heading2']))
        story.append(Paragraph(f'<b>角色名称:</b> {self._safe_string(character.name)}', styles['Normal']))
        story.append(Paragraph(f'<b>角色描述:</b> {self._safe_string(character.description)}', styles['Normal']))
        story.append(Paragraph(f'<b>性格特点:</b> {self._safe_string(character.personality)}', styles['Normal']))
        story.append(Paragraph(f'<b>背景故事:</b> {self._safe_string(character.background)}', styles['Normal']))
        story.append(Spacer(1, 20))
        
        # 对话记录
        story.append(Paragraph('对话记录', styles['Heading2']))
        story.append(Paragraph(f'导出时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', styles['Normal']))
        story.append(Paragraph(f'总消息数: {len(messages)}', styles['Normal']))
        story.append(Spacer(1, 20))
        
        # 添加消息内容
        for i, message in enumerate(messages, 1):
            speaker = "用户" if message.get('is_user', False) else character.name
            timestamp = message.get('created_at', '')
            if timestamp:
                try:
                    # 如果timestamp已经是datetime对象，直接格式化
                    if isinstance(timestamp, datetime):
                        timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        # 如果是字符串，尝试解析
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    # 如果解析失败，尝试截取字符串
                    if isinstance(timestamp, str):
                        timestamp = timestamp[:19] if len(timestamp) > 19 else timestamp
                    else:
                        timestamp = str(timestamp)[:19]
            
            # 消息标题
            story.append(Paragraph(f'{i}. {speaker} ({timestamp})', styles['Heading3']))
            
            # 消息内容
            content = message.get('content', '')
            # 确保内容为字符串并处理编码
            if isinstance(content, str):
                # 清理可能的编码问题
                content = content.encode('utf-8', errors='ignore').decode('utf-8')
            else:
                content = str(content)
            content = content.replace('\n', '<br/>')
            story.append(Paragraph(content, styles['Normal']))
            story.append(Spacer(1, 12))
        
        try:
            doc.build(story)
            buffer.seek(0)
            return buffer.getvalue()
        except UnicodeEncodeError as e:
            # 如果出现编码错误，尝试重新处理PDF内容
            print(f"PDF编码错误，尝试修复: {e}")
            return await self._generate_pdf_document_safe(messages, character)
    
    async def _generate_pdf_document_safe(self, messages: List[Dict], character: Any) -> bytes:
        """安全生成PDF文档，处理编码问题"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # 标题样式
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # 居中
        )
        
        # 添加标题
        story.append(Paragraph(f'与{self._safe_string(character.name)}的对话记录', title_style))
        story.append(Spacer(1, 20))
        
        # 角色信息
        story.append(Paragraph('角色信息', styles['Heading2']))
        story.append(Paragraph(f'<b>角色名称:</b> {self._safe_string(character.name)}', styles['Normal']))
        story.append(Paragraph(f'<b>角色描述:</b> {self._safe_string(character.description)}', styles['Normal']))
        story.append(Paragraph(f'<b>性格特点:</b> {self._safe_string(character.personality)}', styles['Normal']))
        story.append(Paragraph(f'<b>背景故事:</b> {self._safe_string(character.background)}', styles['Normal']))
        story.append(Spacer(1, 20))
        
        # 对话记录
        story.append(Paragraph('对话记录', styles['Heading2']))
        story.append(Paragraph(f'导出时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}', styles['Normal']))
        story.append(Paragraph(f'总消息数: {len(messages)}', styles['Normal']))
        story.append(Spacer(1, 20))
        
        # 添加消息内容
        for i, message in enumerate(messages, 1):
            speaker = "用户" if message.get('is_user', False) else self._safe_string(character.name)
            timestamp = message.get('created_at', '')
            if timestamp:
                try:
                    if isinstance(timestamp, datetime):
                        timestamp = timestamp.strftime('%Y-%m-%d %H:%M:%S')
                    else:
                        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        timestamp = dt.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    if isinstance(timestamp, str):
                        timestamp = timestamp[:19] if len(timestamp) > 19 else timestamp
                    else:
                        timestamp = str(timestamp)[:19]
            
            # 消息标题
            story.append(Paragraph(f'{i}. {speaker} ({timestamp})', styles['Heading3']))
            
            # 消息内容
            content = self._safe_string(message.get('content', ''))
            content = content.replace('\n', '<br/>')
            story.append(Paragraph(content, styles['Normal']))
            story.append(Spacer(1, 12))
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    async def generate_podcast_audio(
        self, 
        messages: List[Dict], 
        character: Any
    ) -> bytes:
        """生成播客音频"""
        try:
            # 创建临时目录
            with tempfile.TemporaryDirectory() as temp_dir:
                audio_segments = []
                
                # 处理每条消息
                for i, message in enumerate(messages):
                    content = message.get('content', '')
                    is_user = message.get('is_user', False)
                    existing_audio_url = message.get('audio_url')
                    
                    if existing_audio_url and not is_user:
                        # 使用现有的AI音频
                        try:
                            audio_segment = await self._download_audio(existing_audio_url)
                            if audio_segment:
                                audio_segments.append(audio_segment)
                        except Exception as e:
                            print(f"下载现有音频失败: {e}")
                            # 生成新的音频
                            audio_segment = await self._generate_tts_audio(content, character, is_user)
                            if audio_segment:
                                audio_segments.append(audio_segment)
                    else:
                        # 生成TTS音频
                        audio_segment = await self._generate_tts_audio(content, character, is_user)
                        if audio_segment:
                            audio_segments.append(audio_segment)
                
                if not audio_segments:
                    raise Exception("没有生成任何音频片段")
                
                # 拼接所有音频
                final_audio = self._concatenate_audios(audio_segments)
                
                # 添加背景音乐（可选）
                final_audio = await self._add_background_music(final_audio)
                
                # 导出为MP3
                output_path = os.path.join(temp_dir, "podcast.mp3")
                final_audio.export(output_path, format="mp3", bitrate="128k")
                
                # 读取文件内容
                async with aiofiles.open(output_path, 'rb') as f:
                    return await f.read()
                    
        except Exception as e:
            print(f"生成播客音频失败: {e}")
            raise Exception(f"播客生成失败: {str(e)}")
    
    async def _download_audio(self, audio_url: str) -> Optional[AudioSegment]:
        """下载音频文件"""
        try:
            response = requests.get(audio_url, timeout=30)
            if response.status_code == 200:
                # 创建临时文件
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                    temp_file.write(response.content)
                    temp_file.flush()
                    
                    # 加载音频
                    audio = AudioSegment.from_file(temp_file.name)
                    os.unlink(temp_file.name)  # 删除临时文件
                    return audio
        except Exception as e:
            print(f"下载音频失败: {e}")
            return None
    
    async def _generate_tts_audio(self, text: str, character: Any, is_user: bool) -> Optional[AudioSegment]:
        """生成TTS音频"""
        try:
            if is_user:
                # 用户消息使用默认TTS
                audio_url = await self.tts_service.generate_voice(
                    text=text,
                    character_id="default_user",
                    character_data={"voice_style": "自然"},
                    text_language="zh"
                )
            else:
                # AI消息使用角色TTS
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
                return await self._download_audio(audio_url)
        except Exception as e:
            print(f"生成TTS音频失败: {e}")
            return None
    
    def _concatenate_audios(self, audio_segments: List[AudioSegment]) -> AudioSegment:
        """拼接音频片段"""
        if not audio_segments:
            raise Exception("没有音频片段可拼接")
        
        # 添加短暂静音分隔
        silence = AudioSegment.silent(duration=500)  # 0.5秒静音
        
        result = audio_segments[0]
        for segment in audio_segments[1:]:
            result += silence + segment
        
        return result
    
    async def _add_background_music(self, audio: AudioSegment) -> AudioSegment:
        """添加背景音乐（可选功能）"""
        try:
            # 这里可以添加背景音乐逻辑
            # 目前只返回原音频
            return audio
        except Exception as e:
            print(f"添加背景音乐失败: {e}")
            return audio
