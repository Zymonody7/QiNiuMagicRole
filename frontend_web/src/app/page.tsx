'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, MessageCircle, Users, Sparkles, Settings } from 'lucide-react';
import CharacterCard from '@/components/CharacterCard';
import CharacterDetailModal from '@/components/CharacterDetailModal';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import UserMenu from '@/components/UserMenu';
import Navigation from '@/components/Navigation';
import { Character } from '@/types/character';
import { apiService } from '@/services/apiService';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const categories = [
  { id: 'all', name: '全部' },
  { id: 'literature', name: '文学' },
  { id: 'history', name: '历史' },
  { id: 'science', name: '科学' },
  { id: 'mythology', name: '神话' },
  { id: 'art', name: '艺术' },
  { id: 'philosophy', name: '哲学' }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // 获取角色数据
  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoading(true);
        const data = await apiService.getCharacters();
        setCharacters(data);
      } catch (error) {
        console.error('获取角色列表失败:', error);
        setCharacters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  // 过滤角色
  useEffect(() => {
    let filtered = characters;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(char =>
        char.name.toLowerCase().includes(query) ||
        char.description.toLowerCase().includes(query) ||
        char.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(char => char.category === selectedCategory);
    }

    setFilteredCharacters(filtered);
  }, [characters, searchQuery, selectedCategory]);

  const handleCharacterClick = (character: Character) => {
    router.push(`/chat/${character.id}`);
  };

  const handleShowDetail = (character: Character) => {
    setSelectedCharacter(character);
  };

  const handleCloseDetail = () => {
    setSelectedCharacter(null);
  };

  const popularCharacters = characters.filter(char => char.isPopular);

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
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              与
              <span className="gradient-text">传奇人物</span>
              对话
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              体验与历史名人、文学角色、科学家等著名人物的AI对话，支持语音聊天，开启跨越时空的交流之旅
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <SearchBar onSearch={setSearchQuery} placeholder="搜索您感兴趣的角色..." />
          </motion.div>

          {/* Category Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-4xl mx-auto"
          >
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          </motion.div>
        </div>
      </section>

      {/* Popular Characters */}
      {!searchQuery && selectedCategory === 'all' && (
        <section className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-center mb-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-2">热门角色</h3>
              <p className="text-gray-600">最受欢迎的角色，开始您的对话之旅</p>
            </motion.div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {popularCharacters.slice(0, 4).map((character, index) => (
                <motion.div
                  key={character.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                >
                  <CharacterCard
                    character={character}
                    onClick={handleCharacterClick}
                    onShowDetail={handleShowDetail}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Characters */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center mb-8"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {searchQuery ? `搜索结果 (${filteredCharacters.length})` : '所有角色'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `找到 ${filteredCharacters.length} 个相关角色`
                : '探索更多有趣的角色'
              }
            </p>
          </motion.div>
          
          {filteredCharacters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCharacters.map((character, index) => (
                <motion.div
                  key={character.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <CharacterCard
                    character={character}
                    onClick={handleCharacterClick}
                    onShowDetail={handleShowDetail}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-500 mb-2">未找到相关角色</h3>
              <p className="text-gray-400">尝试使用不同的关键词搜索</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-4">为什么选择我们？</h3>
            <p className="text-xl text-gray-600">体验最先进的AI角色扮演技术</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: '智能对话',
                description: '基于先进AI技术，提供自然流畅的对话体验'
              },
              {
                icon: Star,
                title: '丰富角色',
                description: '涵盖文学、历史、科学等各个领域的知名人物'
              },
              {
                icon: Users,
                title: '语音交互',
                description: '支持语音输入和输出，让对话更加生动自然'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.2 }}
                className="text-center p-6 bg-white rounded-xl shadow-lg"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 Qiniu Magic Role
          </p>
        </div>
      </footer>

      {/* Character Detail Modal */}
      {selectedCharacter && (
        <CharacterDetailModal
          character={selectedCharacter}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
