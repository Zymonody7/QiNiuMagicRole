'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, MessageCircle, Users, Sparkles, Settings } from 'lucide-react';
import CharacterCard from '@/components/CharacterCard';
import SearchBar from '@/components/SearchBar';
import CategoryFilter from '@/components/CategoryFilter';
import { Character } from '@/types/character';
import { characters, searchCharacters, getCharactersByCategory, getPopularCharacters } from '@/data/characters';
import { useRouter } from 'next/navigation';

const categories = ['all', 'literature', 'history', 'science', 'mythology', 'art', 'philosophy'];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>(characters);
  const router = useRouter();

  useEffect(() => {
    let filtered = characters;

    if (searchQuery) {
      filtered = searchCharacters(searchQuery);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(char => char.category === selectedCategory);
    }

    setFilteredCharacters(filtered);
  }, [searchQuery, selectedCategory]);

  const handleCharacterClick = (character: Character) => {
    router.push(`/chat/${character.id}`);
  };

  const popularCharacters = getPopularCharacters();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold gradient-text">AI角色扮演</h1>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <button
                onClick={() => router.push('/character-config')}
                className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">配置角色</span>
              </button>
              
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>与历史人物对话</span>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

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
              体验与哈利·波特、苏格拉底、爱因斯坦等著名角色的AI对话，支持语音聊天，开启跨越时空的交流之旅
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
    </div>
  );
}
