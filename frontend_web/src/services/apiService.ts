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
  async getCharacters(params?: {
    category?: string;
    search?: string;
    popular_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Character[]> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.popular_only) queryParams.append('popular_only', 'true');
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/characters?${queryString}` : '/characters';
    
    return this.request<Character[]>(endpoint);
  }

  async getCharacter(id: string): Promise<Character> {
    return this.request<Character>(`/characters/${id}`);
  }

  async createCharacter(characterData: Partial<Character>): Promise<Character> {
    return this.request<Character>('/characters', {
      method: 'POST',
      body: JSON.stringify(characterData),
    });
  }

  async updateCharacter(id: string, characterData: Partial<Character>): Promise<Character> {
    return this.request<Character>(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(characterData),
    });
  }

  async deleteCharacter(id: string): Promise<void> {
    return this.request<void>(`/characters/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategories(): Promise<{ categories: Array<{ id: string; name: string }> }> {
    return this.request<{ categories: Array<{ id: string; name: string }> }>('/characters/categories/list');
  }

  // AI技能相关API
  async generateCreativeContent(data: {
    character_id: string;
    prompt: string;
    content_type: string;
  }): Promise<{ content: string; character_id: string; skill_type: string; metadata?: any }> {
    return this.request('/ai-skills/creative-content', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async answerKnowledgeQuestion(data: {
    character_id: string;
    question: string;
  }): Promise<{ content: string; character_id: string; skill_type: string }> {
    return this.request('/ai-skills/knowledge-qa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async provideEmotionalSupport(data: {
    character_id: string;
    message: string;
  }): Promise<{ content: string; character_id: string; skill_type: string }> {
    return this.request('/ai-skills/emotional-support', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async rolePlayScenario(data: {
    character_id: string;
    scenario: string;
    user_role: string;
  }): Promise<{ content: string; character_id: string; skill_type: string; metadata?: any }> {
    return this.request('/ai-skills/role-play', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async analyzeSentiment(text: string): Promise<{ text: string; sentiment: { positive: number; negative: number; neutral: number } }> {
    return this.request('/ai-skills/sentiment-analysis', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  async getCharacterSkills(characterId: string): Promise<string[]> {
    return this.request<string[]>(`/ai-skills/skills/${characterId}`);
  }

  // 更新token
  setToken(token: string): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // 清除token
  clearToken(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

export const apiService = new ApiService();
