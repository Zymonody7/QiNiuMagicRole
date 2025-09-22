'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings, RotateCcw, Phone, MessageSquare } from 'lucide-react';
import CharacterCard from '@/components/CharacterCard';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import VoiceCall from '@/components/VoiceCall';
import VoiceChat from '@/components/VoiceChat';
import Navigation from '@/components/Navigation';
import { Character, ChatMessage as ChatMessageType, ChatSession } from '@/types/character';
import { getCharacterById } from '@/data/characters';
import { useVoice } from '@/hooks/useVoice';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ChatService } from '@/services/chatService';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isRecording, isSupported: voiceSupported, startRecording, stopRecording, transcript } = useVoice();
  const { isPlaying, speak, stop } = useTextToSpeech();

  useEffect(() => {
    const foundCharacter = getCharacterById(characterId);
    if (foundCharacter) {
      setCharacter(foundCharacter);
      // 添加欢迎消息
      const welcomeMessage: ChatMessageType = {
        id: `welcome_${Date.now()}`,
        characterId: characterId,
        content: `你好！我是${foundCharacter.name}。${foundCharacter.description} 很高兴与你对话！`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    } else {
      router.push('/');
    }
  }, [characterId, router]);

  useEffect(() => {
    if (transcript) {
      handleSendMessage(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!character || !content.trim()) return;

    const userMessage: ChatMessageType = {
      id: `user_${Date.now()}`,
      characterId: characterId,
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // 模拟AI响应
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const aiResponse = generateAIResponse(content, character);
      
      const aiMessage: ChatMessageType = {
        id: `ai_${Date.now()}`,
        characterId: characterId,
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // 自动播放AI回复的语音
      if (voiceSupported) {
        speak(aiResponse);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = (userMessage: string, character: Character): string => {
    const responses = [
      `作为${character.name}，我想说：${userMessage}这个话题很有趣。${character.personality}，让我从我的角度来回答你。`,
      `你提到了${userMessage}，这让我想起了我的经历。${character.background}，所以我对这个问题有独特的见解。`,
      `关于${userMessage}，作为${character.name}，我认为这很重要。${character.personality}，让我分享一些我的想法。`,
      `你问的${userMessage}让我深思。${character.background}，这让我对这个问题有了新的理解。`,
      `作为${character.name}，我对${userMessage}这个话题很感兴趣。${character.personality}，让我告诉你我的看法。`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handlePlayAudio = (audioUrl: string) => {
    // 这里可以实现音频播放逻辑
    console.log('播放音频:', audioUrl);
  };

  const handleClearChat = () => {
    if (character) {
      const welcomeMessage: ChatMessageType = {
        id: `welcome_${Date.now()}`,
        characterId: characterId,
        content: `你好！我是${character.name}。${character.description} 很高兴与你对话！`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  };

  const handleStartCall = () => {
    setIsCallActive(true);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
  };

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    try {
      const response = await ChatService.sendVoiceMessage(characterId, audioBlob, sessionId);
      
      // 播放AI语音回复
      if (response.audioUrl) {
        const audio = new Audio(response.audioUrl);
        audio.play();
      }
      
      // 添加文字消息到聊天记录
      const voiceMessage: ChatMessageType = {
        id: `voice_${Date.now()}`,
        characterId: characterId,
        content: response.text || '语音消息',
        isUser: false,
        timestamp: new Date(),
        audioUrl: response.audioUrl
      };
      
      setMessages(prev => [...prev, voiceMessage]);
    } catch (error) {
      console.error('发送语音消息失败:', error);
    }
  };

  const handleReceiveVoiceMessage = (audioBlob: Blob) => {
    // 播放收到的语音消息
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  };

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
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
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <img
                    src={character.avatar}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{character.name}</h1>
                  <p className="text-sm text-gray-500">{character.description}</p>
                </div>
              </div>
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
              
              <button
                onClick={handleStartCall}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="语音通话"
              >
                <Phone className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                onClick={() => stop()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="停止语音"
              >
                {isPlaying ? (
                  <VolumeX className="w-5 h-5 text-red-500" />
                ) : (
                  <Volume2 className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-full flex flex-col">
            
            {/* Voice Chat Panel */}
            {showVoiceChat && character && (
              <div className="mb-4">
                <VoiceChat
                  character={character}
                  onMessage={handleSendMessage}
                  onReceiveMessage={(message) => {
                    const aiMessage: ChatMessageType = {
                      id: `voice_ai_${Date.now()}`,
                      characterId: characterId,
                      content: message,
                      isUser: false,
                      timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, aiMessage]);
                  }}
                />
              </div>
            )}
            {/* Character Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="py-6 border-b border-gray-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden">
                  <img
                    src={character.avatar}
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{character.name}</h2>
                  <p className="text-gray-600 mb-2">{character.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {character.tags.slice(0, 4).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-6 chat-scrollbar">
              <AnimatePresence>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    characterName={character.name}
                    characterAvatar={character.avatar}
                    onPlayAudio={handlePlayAudio}
                  />
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 mb-4"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onVoiceInput={handleVoiceInput}
        isVoiceEnabled={voiceSupported}
        isRecording={isRecording}
        isLoading={isLoading}
      />

      {/* Voice Call Modal */}
      {character && (
        <VoiceCall
          characterName={character.name}
          characterAvatar={character.avatar}
          isCallActive={isCallActive}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
          onSendVoiceMessage={handleSendVoiceMessage}
          onReceiveVoiceMessage={handleReceiveVoiceMessage}
        />
      )}
    </div>
  );
}
