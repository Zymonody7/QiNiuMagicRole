import { Character } from '@/types/character';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;

  constructor() {
    // 从localStorage恢复token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      console.log('API Service token:', this.token ? '已设置' : '未设置');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = 600000 // 默认10分钟超时
  ): Promise<T> {
    const url = `${API_BASE_URL}/api/v1${endpoint}`;
    
    // 检查是否是FormData，如果是则不设置Content-Type
    const isFormData = options.body instanceof FormData;
    
    const config: RequestInit = {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`请求超时 (${timeout/1000}秒)`);
      }
      throw error;
    }
  }

  // 角色相关API
  async getCharacters(
    skip: number = 0,
    limit: number = 100,
    category?: string,
    search?: string
  ): Promise<Character[]> {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    return this.request<Character[]>(`/characters/?${params}`);
  }

  async getCharacterById(characterId: string): Promise<Character> {
    return this.request<Character>(`/characters/${characterId}`);
  }

  async createCharacter(characterData: Partial<Character>): Promise<Character> {
    return this.request<Character>('/characters/', {
      method: 'POST',
      body: JSON.stringify(characterData),
    });
  }

  async createCharacterWithAudio(
    characterData: Partial<Character>,
    audioFile?: File
  ): Promise<Character> {
    if (audioFile) {
      // 如果有音频文件，使用FormData上传
      const formData = new FormData();
      
      // 添加角色数据
      Object.entries(characterData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'tags' && Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      // 添加音频文件
      formData.append('reference_audio', audioFile);
      
      const response = await fetch(`${API_BASE_URL}/api/v1/characters/with-audio`, {
        method: 'POST',
        headers: {
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } else {
      // 没有音频文件，使用普通JSON请求
      return this.createCharacter(characterData);
    }
  }

  async qiniuASRTranscribe(audioFile: File, language: string = 'zh'): Promise<{ success: boolean; transcribed_text: string; message: string; filename?: string }> {
    const formData = new FormData();
    formData.append('audio_file', audioFile);
    formData.append('language', language);

    const response = await fetch(`${API_BASE_URL}/api/v1/characters/qiniu-asr`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async testQiniuASR(audioUrl: string, language: string = 'zh'): Promise<{ success: boolean; transcribed_text: string; message: string; error?: string }> {
    const formData = new FormData();
    formData.append('audio_url', audioUrl);
    formData.append('language', language);

    const response = await fetch(`${API_BASE_URL}/api/v1/characters/qiniu-asr-test`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async updateCharacter(characterId: string, characterData: Partial<Character>): Promise<Character> {
    return this.request<Character>(`/characters/${characterId}`, {
      method: 'PUT',
      body: JSON.stringify(characterData),
    });
  }

  async updateCharacterWithAudio(characterId: string, characterData: Partial<Character> & { referenceAudio?: File }): Promise<Character> {
    const formData = new FormData();
    
    // 添加角色数据
    Object.entries(characterData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'referenceAudio' && value instanceof File) {
          formData.append('reference_audio', value);
        } else if (key !== 'referenceAudio') {
          formData.append(key, String(value));
        }
      }
    });

    const response = await fetch(`${API_BASE_URL}/api/v1/characters/${characterId}/with-audio`, {
      method: 'PUT',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteCharacter(characterId: string): Promise<void> {
    await this.request(`/characters/${characterId}`, {
      method: 'DELETE',
    });
  }

  async getPopularCharacters(limit: number = 10): Promise<Character[]> {
    return this.request<Character[]>(`/characters/popular/list?limit=${limit}`);
  }

  // 聊天相关API
  async sendMessage(
    characterId: string,
    message: string,
    sessionId: string
  ): Promise<string> {
    const response = await this.request<{ response: string }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        character_id: characterId,
        message,
        session_id: sessionId,
      }),
    });
    return response.response;
  }

  async getSessionMessages(sessionId: string): Promise<any[]> {
    return this.request<any[]>(`/chat/sessions/${sessionId}/messages`);
  }

  async getUserSessions(characterId?: string): Promise<any[]> {
    return this.request<any[]>(`/chat/sessions/${characterId}/session`);
  }

  async sendVoiceMessage(
    characterId: string,
    audioBlob: Blob,
    sessionId: string
  ): Promise<string> {
    const formData = new FormData();
    formData.append('character_id', characterId);
    formData.append('audio_data', audioBlob, 'voice.wav');
    formData.append('session_id', sessionId);

    const response = await fetch(`${API_BASE_URL}/api/v1/voice/speech-to-text`, {
      method: 'POST',
      headers: {
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  }

  // 用户相关API
  async getUserProfile(): Promise<any> {
    return this.request('/users/profile');
  }

  async updateUserProfile(userData: any): Promise<any> {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // OCR相关API
  async recognizeText(imageUrl: string): Promise<{ success: boolean; text: string; id?: string; message?: string }> {
    return this.request('/ocr/recognize', {
      method: 'POST',
      body: JSON.stringify({ image_url: imageUrl }),
    });
  }

  async getOCRStatus(): Promise<{ success: boolean; status: any }> {
    return this.request('/ocr/status');
  }

  // 导出功能
  async exportText(sessionId: string, characterId: string, format: 'word' | 'pdf', messages: any[]): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/export/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        sessionId,
        characterId,
        format,
        messages: messages.map(msg => ({
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.timestamp.toISOString()
        }))
      })
    });

    if (!response.ok) {
      throw new Error('导出失败');
    }

    return response.blob();
  }

  async exportAudio(sessionId: string, characterId: string, messages: any[], backgroundMusic?: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/v1/chat/export/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        sessionId,
        characterId,
        backgroundMusic,
        messages: messages.map(msg => ({
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.timestamp.toISOString(),
          audioUrl: msg.audioUrl
        }))
      })
    });

    if (!response.ok) {
      throw new Error('音频导出失败');
    }

    return response.blob();
  }

  async exportAudioWithConfig(sessionId: string, characterId: string, messages: any[], config: any): Promise<Blob> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('characterId', characterId);
    formData.append('messages', JSON.stringify(messages.map(msg => ({
      content: msg.content,
      isUser: msg.isUser,
      timestamp: msg.timestamp.toISOString(),
      audioUrl: msg.audioUrl
    }))));
    formData.append('userVoiceType', config.userVoiceType);
    formData.append('introText', config.introText);
    formData.append('outroText', config.outroText);
    
    if (config.userVoiceFile) {
      formData.append('userVoiceFile', config.userVoiceFile);
    }
    
    if (config.backgroundMusic) {
      formData.append('backgroundMusic', config.backgroundMusic);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/chat/export/audio-advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('音频导出失败');
    }

    return response.blob();
  }

  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const apiService = new ApiService();