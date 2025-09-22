export interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  personality: string;
  background: string;
  voiceStyle: string;
  category: string; // 改为string类型，避免类型错误
  tags: string[];
  popularity: number;
  isPopular?: boolean;
  isCustom?: boolean; // 是否为自定义角色
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  characterId: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export interface ChatSession {
  id: string;
  characterId: string;
  character: Character;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  voice: string;
  speed: number;
  pitch: number;
}
