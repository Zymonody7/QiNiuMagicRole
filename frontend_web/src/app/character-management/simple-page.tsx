'use client';

import React, { useState, useEffect } from 'react';

interface Character {
  id: string;
  name: string;
  description: string;
  avatar: string;
  personality: string;
  background: string;
  voiceStyle: string;
  category: string;
  tags: string[];
  popularity: number;
  isPopular?: boolean;
  isCustom?: boolean;
}

export default function SimpleCharacterManagementPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 使用测试数据
    const testCharacters: Character[] = [
      {
        id: 'harry-potter',
        name: '哈利·波特',
        description: '来自霍格沃茨魔法学校的年轻巫师，勇敢、善良，拥有强大的魔法天赋。',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
        personality: '勇敢、善良、忠诚、有时冲动',
        background: '哈利·波特是J.K.罗琳创作的魔法世界中的主角，他在霍格沃茨魔法学校学习魔法，与朋友们一起对抗黑魔法师伏地魔。',
        voiceStyle: '年轻、充满活力、英国口音',
        category: 'literature',
        tags: ['魔法', '冒险', '友谊', '勇气'],
        popularity: 95,
        isPopular: true,
        isCustom: false
      },
      {
        id: 'socrates',
        name: '苏格拉底',
        description: '古希腊哲学家，以苏格拉底式问答法闻名，追求真理和智慧。',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
        personality: '智慧、好奇、耐心、善于提问',
        background: '苏格拉底是古希腊最著名的哲学家之一，他通过不断的提问和对话来探索真理，对西方哲学产生了深远影响。',
        voiceStyle: '深沉、智慧、古希腊口音',
        category: 'philosophy',
        tags: ['哲学', '智慧', '真理', '对话'],
        popularity: 88,
        isPopular: true,
        isCustom: false
      }
    ];
    
    setCharacters(testCharacters);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">角色管理</h1>
          <p className="text-gray-600">管理和创建AI角色</p>
        </div>

        {/* 角色统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-purple-600">{characters.length}</div>
            <div className="text-gray-600">总角色数</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">
              {characters.filter(char => char.isPopular).length}
            </div>
            <div className="text-gray-600">热门角色</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">
              {characters.filter(char => char.isCustom).length}
            </div>
            <div className="text-gray-600">自定义角色</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-orange-600">{characters.length}</div>
            <div className="text-gray-600">当前显示</div>
          </div>
        </div>

        {/* 角色列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {characters.map((character) => (
            <div key={character.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100">
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{character.popularity}</span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{character.name}</h3>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {character.category}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {character.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {character.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {character.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{character.tags.length - 3}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>开始对话</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>{character.popularity}% 受欢迎</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
