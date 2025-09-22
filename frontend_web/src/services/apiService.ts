import { Character } from '@/types/character';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiService {
  private token: string | null = null;

  constructor() {
    // 从localStorage恢复token
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api/v1${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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

  async updateCharacter(characterId: string, characterData: Partial<Character>): Promise<Character> {
    return this.request<Character>(`/characters/${characterId}`, {
      method: 'PUT',
      body: JSON.stringify(characterData),
    });
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
    const params = characterId ? `?character_id=${characterId}` : '';
    return this.request<any[]>(`/chat/sessions${params}`);
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

  // Token管理
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
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