'use client';

import { Character } from '@/types/character';
import { motion } from 'framer-motion';
import { MessageCircle, Star, Users } from 'lucide-react';
import Image from 'next/image';

interface CharacterCardProps {
  character: Character;
  onClick: (character: Character) => void;
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100"
      onClick={() => onClick(character)}
    >
      <div className="relative h-48 bg-gradient-to-br from-primary-100 to-secondary-100">
        <Image
          src={character.avatar}
          alt={character.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-current" />
          <span className="text-xs font-medium text-gray-700">{character.popularity}</span>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{character.name}</h3>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
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
            <MessageCircle className="w-4 h-4" />
            <span>开始对话</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>{character.popularity}% 受欢迎</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
