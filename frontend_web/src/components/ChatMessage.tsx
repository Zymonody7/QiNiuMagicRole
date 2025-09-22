'use client';

import { ChatMessage as ChatMessageType } from '@/types/character';
import { motion } from 'framer-motion';
import { User, Bot, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

interface ChatMessageProps {
  message: ChatMessageType;
  characterName: string;
  characterAvatar: string;
  onPlayAudio?: (audioUrl: string) => void;
}

export default function ChatMessage({ 
  message, 
  characterName, 
  characterAvatar, 
  onPlayAudio 
}: ChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = () => {
    if (message.audioUrl && onPlayAudio) {
      setIsPlaying(true);
      onPlayAudio(message.audioUrl);
      // 模拟播放完成
      setTimeout(() => setIsPlaying(false), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 mb-4 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`flex-shrink-0 ${message.isUser ? 'ml-3' : 'mr-3'}`}>
        {message.isUser ? (
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={characterAvatar}
              alt={characterName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
      
      <div className={`flex-1 ${message.isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
          message.isUser 
            ? 'bg-primary-500 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
        </div>
        
        {!message.isUser && message.audioUrl && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handlePlayAudio}
              disabled={isPlaying}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isPlaying ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              <span>{isPlaying ? '播放中...' : '播放语音'}</span>
            </button>
          </div>
        )}
        
        <div className={`text-xs text-gray-400 mt-1 ${message.isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </motion.div>
  );
}
