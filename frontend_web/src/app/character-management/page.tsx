'use client';

import React, { useState, useEffect } from 'react';
import { Character } from '@/types/character';
import CharacterCard from '@/components/CharacterCard';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import Navigation from '@/components/Navigation';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import CreateCharacterModal from '@/components/CreateCharacterModal';
import EditCharacterModal from '@/components/EditCharacterModal';
import CharacterDetailModal from '@/components/CharacterDetailModal';
import { apiService } from '@/services/apiService';

export default function CharacterManagementPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const categories = [
    { id: '', name: '全部' },
    { id: 'literature', name: '文学' },
    { id: 'history', name: '历史' },
    { id: 'science', name: '科学' },
    { id: 'mythology', name: '神话' },
    { id: 'art', name: '艺术' },
    { id: 'philosophy', name: '哲学' }
  ];

  useEffect(() => {
    fetchCharacters();
  }, []);

  useEffect(() => {
    filterCharacters();
  }, [characters, searchQuery, selectedCategory]);

  const fetchCharacters = async () => {
    try {
      setLoading(true);
      
      // 尝试从API获取数据
      try {
        const data = await apiService.getCharacters();
        console.log('从API获取到的角色数据:', data);
        setCharacters(data);
      } catch (apiError) {
        console.log('API调用失败，使用测试数据:', apiError);
        
        // 如果API调用失败，使用测试数据
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
        console.log('使用测试角色数据:', testCharacters);
      }
      
    } catch (error) {
      console.error('获取角色列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCharacters = () => {
    let filtered = characters;

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(query) ||
        char.description.toLowerCase().includes(query) ||
        char.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // 分类过滤
    if (selectedCategory) {
      filtered = filtered.filter(char => char.category === selectedCategory);
    }

    setFilteredCharacters(filtered);
  };

  const handleCreateCharacter = async (characterData: Partial<Character>) => {
    try {
      const newCharacter = await apiService.createCharacter(characterData);
      setCharacters(prev => [...prev, newCharacter]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('创建角色失败:', error);
    }
  };

  const handleEditCharacter = async (characterData: Partial<Character>) => {
    if (!selectedCharacter) return;

    try {
      const updatedCharacter = await apiService.updateCharacter(selectedCharacter.id, characterData);
      setCharacters(prev =>
        prev.map(char => char.id === updatedCharacter.id ? updatedCharacter : char)
      );
      setShowEditModal(false);
      setSelectedCharacter(null);
    } catch (error) {
      console.error('更新角色失败:', error);
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!confirm('确定要删除这个角色吗？')) return;

    try {
      await apiService.deleteCharacter(characterId);
      setCharacters(prev => prev.filter(char => char.id !== characterId));
    } catch (error) {
      console.error('删除角色失败:', error);
    }
  };

  const openEditModal = (character: Character) => {
    setSelectedCharacter(character);
    setShowEditModal(true);
  };

  const openDetailModal = (character: Character) => {
    setSelectedCharacter(character);
    setShowDetailModal(true);
  };

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
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">角色管理</h1>
            <p className="text-gray-600">管理和创建AI角色</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建角色
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="搜索角色名称、描述或标签..."
              />
            </div>
            <div className="md:w-64">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          </div>
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
            <div className="text-2xl font-bold text-orange-600">{filteredCharacters.length}</div>
            <div className="text-gray-600">当前显示</div>
          </div>
        </div>

        {/* 角色列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCharacters.map((character) => (
            <div key={character.id} className="relative group">
              <CharacterCard
                character={character}
                onClick={() => openDetailModal(character)}
                showActions={true}
              />
              
              {/* 操作按钮 */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetailModal(character);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(character);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCharacter(character.id);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCharacters.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">没有找到匹配的角色</div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建第一个角色
            </Button>
          </div>
        )}
      </div>

      {/* 模态框 */}
      {showCreateModal && (
        <CreateCharacterModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateCharacter}
        />
      )}

      {showEditModal && selectedCharacter && (
        <EditCharacterModal
          character={selectedCharacter}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCharacter(null);
          }}
          onSubmit={handleEditCharacter}
        />
      )}

      {showDetailModal && selectedCharacter && (
        <CharacterDetailModal
          character={selectedCharacter}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCharacter(null);
          }}
        />
      )}
      </div>
    </ErrorBoundary>
  );
}
