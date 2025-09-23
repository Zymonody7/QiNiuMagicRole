'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Star, Users, Calendar, Tag } from 'lucide-react';
import { Character } from '@/types/character';
import { useRouter } from 'next/navigation';

interface CharacterDetailModalProps {
  character: Character;
  onClose: () => void;
}

export default function CharacterDetailModal({ character, onClose }: CharacterDetailModalProps) {
  const router = useRouter();

  const handleStartChat = () => {
    router.push(`/chat/${character.id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={character.avatar || '/default-avatar.svg'}
                  alt={character.name}
                  className="w-24 h-24 rounded-xl object-cover bg-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/default-avatar.svg';
                  }}
                />
                
                {/* Popular Badge */}
                {character.is_popular && (
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    热门
                  </div>
                )}
              </div>
              
              {/* Basic Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{character.name}</h2>
                <p className="text-gray-600 mb-4">{character.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{character.popularity} 人气</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{character.category}</span>
                  </div>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={handleStartChat}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  开始对话
                </button>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Personality */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">性格特点</h3>
              <p className="text-gray-600 leading-relaxed">{character.personality}</p>
            </div>
            
            {/* Background */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">背景故事</h3>
              <p className="text-gray-600 leading-relaxed">{character.background}</p>
            </div>
            
            {/* Voice Style */}
            {character.voice_style && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">语音风格</h3>
                <p className="text-gray-600">{character.voice_style}</p>
              </div>
            )}
            
            {/* Tags */}
            {character.tags && character.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">标签</h3>
                <div className="flex flex-wrap gap-2">
                  {character.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      <Tag className="w-3 h-3 inline mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}