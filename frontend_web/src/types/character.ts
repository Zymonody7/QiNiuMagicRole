/**
 * 角色相关类型定义
 */

export interface Character {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  personality: string;
  background: string;
  voice_style?: string;
  reference_audio_path?: string;
  reference_audio_text?: string;
  reference_audio_language?: string;
  category: string;
  tags: string[];
  popularity: number;
  is_popular: boolean;
  is_custom: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  characterId: string;
}

export interface ChatSession {
  id: string;
  characterId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceSettings {
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}

export interface CharacterCreateRequest {
  name: string;
  description: string;
  avatar?: string;
  personality: string;
  background: string;
  voice_style?: string;
  reference_audio_path?: string;
  reference_audio_text?: string;
  reference_audio_language?: string;
  category: string;
  tags?: string[];
}

export interface CharacterUpdateRequest {
  name?: string;
  description?: string;
  avatar?: string;
  personality?: string;
  background?: string;
  voice_style?: string;
  reference_audio_path?: string;
  reference_audio_text?: string;
  reference_audio_language?: string;
  category?: string;
  tags?: string[];
  popularity?: number;
  is_popular?: boolean;
}