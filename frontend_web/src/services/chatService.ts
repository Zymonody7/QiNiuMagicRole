import { Character, ChatMessage } from '@/types/character';

export class ChatService {
  private static baseUrl = '/api';

  static async sendMessage(
    characterId: string,
    message: string,
    sessionId: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_id: characterId,
          message,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return data.ai_message.content;
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  static async getCharacters(search?: string, category?: string): Promise<Character[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await fetch(`${this.baseUrl}/characters/?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error;
    }
  }

  static generateWelcomeMessage(character: Character): string {
    return `你好！我是${character.name}。${character.description} 很高兴与你对话！`;
  }

  static saveChatSession(sessionId: string, messages: ChatMessage[]): void {
    try {
      localStorage.setItem(`chat_session_${sessionId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('保存聊天记录失败:', error);
    }
  }

  static loadChatSession(sessionId: string): ChatMessage[] {
    try {
      const saved = localStorage.getItem(`chat_session_${sessionId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('加载聊天记录失败:', error);
      return [];
    }
  }

  static clearChatSession(sessionId: string): void {
    try {
      localStorage.removeItem(`chat_session_${sessionId}`);
    } catch (error) {
      console.error('清除聊天记录失败:', error);
    }
  }

  static async saveCharacterConfig(
    name: string,
    prompt: string,
    voiceData?: Blob,
    audioFile?: File,
    avatarFile?: File
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('prompt', prompt);
      
      if (voiceData) {
        formData.append('voiceData', voiceData, 'voice.wav');
      } else if (audioFile) {
        formData.append('audioFile', audioFile);
      }
      
      if (avatarFile) {
        formData.append('avatarFile', avatarFile);
      }

      const response = await fetch(`${this.baseUrl}/character-config`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '保存角色配置失败');
      }

      return data.data;
    } catch (error) {
      console.error('保存角色配置失败:', error);
      throw error;
    }
  }

  static async sendVoiceMessage(
    characterId: string,
    audioData: Blob,
    sessionId: string
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioData, 'voice.wav');
      formData.append('character_id', characterId);
      formData.append('language', 'zh-CN');

      const response = await fetch(`${this.baseUrl}/voice/process-voice-message`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || '发送语音消息失败');
      }

      return data.recognized_text;
    } catch (error) {
      console.error('发送语音消息失败:', error);
      throw error;
    }
  }

  static async getCharacterConfig(characterId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/character-config?id=${characterId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '获取角色配置失败');
      }

      return data.character;
    } catch (error) {
      console.error('获取角色配置失败:', error);
      throw error;
    }
  }
}
