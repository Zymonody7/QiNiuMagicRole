'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings, RotateCcw, Phone, MessageSquare } from 'lucide-react';
import CharacterCard from '@/components/CharacterCard';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import Navigation from '@/components/Navigation';
import { Character, ChatMessage as ChatMessageType, ChatSession } from '@/types/character';
import { apiService } from '@/services/apiService';
import { ChatService } from '@/services/chatService';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCharacter = async () => {
    try {
      setIsLoading(true);
      const characterData = await apiService.getCharacterById(characterId);
      setCharacter(characterData);
      
      // 尝试获取用户的历史会话
      console.log('尝试获取历史会话');
      
      await fetchChatHistory(characterData);
    } catch (error) {
      console.error('获取角色信息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChatHistory = async (characterData: Character) => {
    try {
      // 获取用户与该角色的历史会话
      const sessions = await apiService.getUserSessions(characterData.id);
      console.log('历史会话:', sessions);
      if (sessions && sessions.length > 0) {
        // 使用最新的会话
        const latestSession = sessions[0];
        setSessionId(latestSession.id);
        
        // 获取该会话的历史消息
        const historyMessages = await apiService.getSessionMessages(latestSession.id);
        
        // 转换历史消息格式
        const formattedMessages: ChatMessageType[] = historyMessages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          isUser: msg.is_user,
          timestamp: new Date(msg.created_at),
          characterId: characterData.id
        }));
        
        setMessages(formattedMessages);
      } else {
        // 没有历史会话，创建新会话并添加欢迎消息
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
        
        const welcomeMessage: ChatMessageType = {
          id: `welcome_${Date.now()}`,
          content: ChatService.generateWelcomeMessage(characterData),
          isUser: false,
          timestamp: new Date(),
          characterId: characterData.id
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      // 如果获取历史失败，仍然显示欢迎消息
      const newSessionId = `session_${Date.now()}`;
      setSessionId(newSessionId);
      
      const welcomeMessage: ChatMessageType = {
        id: `welcome_${Date.now()}`,
        content: ChatService.generateWelcomeMessage(characterData),
        isUser: false,
        timestamp: new Date(),
        characterId: characterData.id
      };
      setMessages([welcomeMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!character || !content.trim()) return;

    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
      characterId: character.id
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      setIsLoading(true);
      const response = await ChatService.sendMessage(character.id, content, sessionId);
      
      const aiMessage: ChatMessageType = {
        id: `ai_${Date.now()}`,
        content: response,
        isUser: false,
        timestamp: new Date(),
        characterId: character.id
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: ChatMessageType = {
        id: `error_${Date.now()}`,
        content: '抱歉，我暂时无法回复您的消息。请稍后再试。',
        isUser: false,
        timestamp: new Date(),
        characterId: character.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = async (audioBlob: Blob) => {
    if (!character) return;

    try {
      setIsLoading(true);
      const response = await ChatService.sendVoiceMessage(character.id, audioBlob, sessionId);
      
      if (response.success) {
        // 语音识别成功，显示识别结果
        const userMessage: ChatMessageType = {
          id: `user_voice_${Date.now()}`,
          content: `[语音] ${response.text}`,
          isUser: true,
          timestamp: new Date(),
          characterId: character.id
        };
        setMessages(prev => [...prev, userMessage]);
        
        // 继续发送给AI处理
        const aiResponse = await ChatService.sendMessage(character.id, response.text, sessionId);
        const aiMessage: ChatMessageType = {
          id: `ai_${Date.now()}`,
          content: aiResponse,
          isUser: false,
          timestamp: new Date(),
          characterId: character.id
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 语音识别失败，显示错误信息
        const errorMessage: ChatMessageType = {
          id: `error_${Date.now()}`,
          content: response.message || '语音识别失败，请重试或使用文字输入。',
          isUser: false,
          timestamp: new Date(),
          characterId: character.id
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('发送语音消息失败:', error);
      const errorMessage: ChatMessageType = {
        id: `error_${Date.now()}`,
        content: '抱歉，我无法处理您的语音消息。请稍后再试。',
        isUser: false,
        timestamp: new Date(),
        characterId: character.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('确定要清空对话记录吗？')) {
      setMessages([]);
      ChatService.clearChatSession(sessionId);
    }
  };

  if (isLoading && !character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">角色不存在</h2>
          <p className="text-gray-600 mb-6">您要聊天的角色可能已被删除或不存在</p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* <CharacterCard
                character={character}
                onClick={() => {}}
                showActions={false}
                compact={true}
              /> */}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowVoiceChat(!showVoiceChat)}
                className={`p-2 rounded-lg transition-colors ${
                  showVoiceChat ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
                }`}
                title="语音聊天"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleClearChat}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="清空对话"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ChatMessage
                  message={message}
                  character={character}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            onVoiceInput={handleVoiceInput}
            isVoiceEnabled={true}
            isRecording={false}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}