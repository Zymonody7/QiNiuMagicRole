"""
TTS缓存服务 - 缓存已生成的TTS音频，避免重复生成
"""

import os
import hashlib
import json
from typing import Optional, Dict, Any
from pathlib import Path
import aiofiles
from app.core.config import settings

class TTSCacheService:
    """TTS缓存服务类"""
    
    def __init__(self):
        self.cache_dir = Path(settings.UPLOAD_DIR) / "tts_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self._load_metadata()
    
    def _load_metadata(self):
        """加载缓存元数据"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {}
        except Exception as e:
            print(f"加载TTS缓存元数据失败: {e}")
            self.metadata = {}
    
    def _save_metadata(self):
        """保存缓存元数据"""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"保存TTS缓存元数据失败: {e}")
    
    def _generate_cache_key(self, text: str, voice_type: str, speed: float = 1.0) -> str:
        """生成缓存键"""
        content = f"{text}_{voice_type}_{speed}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    async def get_cached_audio(self, text: str, voice_type: str, speed: float = 1.0) -> Optional[str]:
        """获取缓存的音频文件"""
        try:
            cache_key = self._generate_cache_key(text, voice_type, speed)
            
            if cache_key in self.metadata:
                audio_path = self.cache_dir / f"{cache_key}.mp3"
                if audio_path.exists():
                    print(f"找到TTS缓存: {cache_key}")
                    return str(audio_path)
                else:
                    # 文件不存在，清理元数据
                    del self.metadata[cache_key]
                    self._save_metadata()
            
            return None
        except Exception as e:
            print(f"获取TTS缓存失败: {e}")
            return None
    
    async def cache_audio(self, text: str, voice_type: str, audio_data: bytes, speed: float = 1.0) -> str:
        """缓存音频数据"""
        try:
            cache_key = self._generate_cache_key(text, voice_type, speed)
            audio_path = self.cache_dir / f"{cache_key}.mp3"
            
            # 保存音频文件
            async with aiofiles.open(audio_path, 'wb') as f:
                await f.write(audio_data)
            
            # 更新元数据
            self.metadata[cache_key] = {
                "text": text,
                "voice_type": voice_type,
                "speed": speed,
                "file_path": str(audio_path),
                "file_size": len(audio_data),
                "created_at": str(os.path.getctime(audio_path))
            }
            
            self._save_metadata()
            print(f"TTS音频已缓存: {cache_key}")
            return str(audio_path)
            
        except Exception as e:
            print(f"缓存TTS音频失败: {e}")
            raise
    
    async def cleanup_old_cache(self, max_age_days: int = 30):
        """清理过期缓存"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_days * 24 * 60 * 60
            
            keys_to_remove = []
            for cache_key, metadata in self.metadata.items():
                try:
                    created_at = float(metadata.get("created_at", 0))
                    if current_time - created_at > max_age_seconds:
                        keys_to_remove.append(cache_key)
                        
                        # 删除文件
                        file_path = Path(metadata.get("file_path", ""))
                        if file_path.exists():
                            file_path.unlink()
                            
                except Exception as e:
                    print(f"清理缓存项失败: {e}")
                    keys_to_remove.append(cache_key)
            
            # 从元数据中移除过期项
            for key in keys_to_remove:
                if key in self.metadata:
                    del self.metadata[key]
            
            if keys_to_remove:
                self._save_metadata()
                print(f"清理了 {len(keys_to_remove)} 个过期缓存项")
                
        except Exception as e:
            print(f"清理过期缓存失败: {e}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        try:
            total_files = len(self.metadata)
            total_size = sum(metadata.get("file_size", 0) for metadata in self.metadata.values())
            
            return {
                "total_files": total_files,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "cache_dir": str(self.cache_dir)
            }
        except Exception as e:
            print(f"获取缓存统计失败: {e}")
            return {"error": str(e)}

# 全局实例
tts_cache_service = TTSCacheService()
