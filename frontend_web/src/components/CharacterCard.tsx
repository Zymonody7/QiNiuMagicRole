import React from 'react';
import { motion } from 'framer-motion';
import { Star, MessageCircle, Users, Info } from 'lucide-react';
import { Character } from '@/types/character';

interface CharacterCardProps {
  character: Character;
  onClick?: (character: Character) => void;
  onShowDetail?: (character: Character) => void;
  showActions?: boolean;
  compact?: boolean;
}

export default function CharacterCard({ 
  character, 
  onClick, 
  onShowDetail,
  showActions = true,
  compact = false 
}: CharacterCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(character);
    }
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowDetail) {
      onShowDetail(character);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl ${
        compact ? 'p-3' : 'p-6'
      }`}
    >
      {/* 头像 */}
      <div className={`relative ${compact ? 'mb-3' : 'mb-4'}`}>
        <img
          src={character.avatar || '/default-avatar.svg'}
          alt={character.name}
          className={`rounded-lg object-cover bg-gray-200 ${
            compact ? 'w-12 h-12' : 'w-full h-48'
          }`}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/default-avatar.svg';
          }}
        />
        
        {/* 热门标签 */}
        {character.is_popular && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3" />
            热门
          </div>
        )}
        
        {/* 自定义标签 */}
        {character.is_custom && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            自定义
          </div>
        )}
      </div>

      {/* 角色信息 */}
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <h3 className={`font-bold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
          {character.name}
        </h3>
        
        <p className={`text-gray-600 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
          {character.description}
        </p>
        
        {/* 分类标签 */}
        <div className="flex items-center gap-2">
          <span className={`bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium ${
            compact ? 'text-xs' : 'text-sm'
          }`}>
            {character.category}
          </span>
        </div>
        
        {/* 标签 */}
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {character.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* 统计信息和操作按钮 */}
        {showActions && !compact && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{character.popularity}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>对话</span>
              </div>
            </div>
            
            {/* 详情按钮 */}
            {onShowDetail && (
              <button
                onClick={handleDetailClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="查看详情"
              >
                <Info className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}