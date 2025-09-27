'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Settings, RotateCcw, Phone, MessageSquare, Download, FileText, Music } from 'lucide-react';
import RealtimeVoiceChat from '@/components/RealtimeVoiceChat';
import CharacterCard from '@/components/CharacterCard';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import Navigation from '@/components/Navigation';
import { Character, ChatMessage as ChatMessageType, ChatSession } from '@/types/character';
import { apiService } from '@/services/apiService';
import { ChatService } from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import { withAuth } from '@/components/withAuth';
import { useToastContext } from '@/contexts/ToastContext';

function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.id as string;
  
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [showRealtimeVoiceChat, setShowRealtimeVoiceChat] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState<string>('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useToastContext();

  useEffect(() => {
    if (characterId) {
      fetchCharacter();
    }
  }, [characterId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

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
        console.log('历史消息原始数据:', historyMessages);
        
        // 转换历史消息格式
        const formattedMessages: ChatMessageType[] = historyMessages.map((msg: any) => {
          console.log('处理消息:', msg, 'audio_url:', msg.audio_url);
          return {
            id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: msg.content || '',
            isUser: msg.is_user || false,
            timestamp: new Date(msg.created_at || Date.now()),
            characterId: characterData.id,
            audioUrl: msg.audio_url
          };
        });
        
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
      
      // 检查响应是否包含音频URL
      const aiMessage: ChatMessageType = {
        id: `ai_${Date.now()}`,
        content: response.content || '抱歉，我无法生成回复。',
        isUser: false,
        timestamp: new Date(),
        characterId: character.id,
        audioUrl: response.audioUrl || response.ai_message?.audioUrl
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 根据错误类型显示不同的提示
      let errorContent = '抱歉，我暂时无法回复您的消息。请稍后再试。';
      if (error instanceof Error && error.message && error.message.includes('超时')) {
        errorContent = '语音生成需要较长时间，请稍后重试。如果问题持续，请检查网络连接。';
      }
      
      const errorMessage: ChatMessageType = {
        id: `error_${Date.now()}`,
        content: errorContent,
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
          content: aiResponse.content || '抱歉，我无法生成回复。',
          isUser: false,
          timestamp: new Date(),
          characterId: character.id,
          audioUrl: aiResponse.audioUrl || aiResponse.ai_message?.audioUrl
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

  const handleExportText = async (format: 'word' | 'pdf') => {
    if (!character || messages.length === 0) return;
    
    // 检查sessionId是否是真实的数据库ID（不是前端生成的假ID）
    if (sessionId.startsWith('session_')) {
      showError('无法导出', '请先与角色进行对话后再导出文本');
      return;
    }
    
    setIsExporting(true);
    try {
      const blob = await apiService.exportText(sessionId, character.id, format, messages);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `对话记录_${character.name}_${new Date().toLocaleDateString()}.${format === 'word' ? 'docx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出文本失败:', error);
      showError('导出失败', '请稍后重试');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportAudio = async () => {
    if (!character || messages.length === 0) return;
    
    // 检查sessionId是否是真实的数据库ID（不是前端生成的假ID）
    if (sessionId.startsWith('session_')) {
      showError('无法导出', '请先与角色进行对话后再导出音频');
      return;
    }
    
    setIsExporting(true);
    try {
      const blob = await apiService.exportAudio(sessionId, character.id, messages, selectedBackgroundMusic || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `播客_${character.name}_${new Date().toLocaleDateString()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出音频失败:', error);
      showError('音频导出失败', '请稍后重试');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
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
                onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                className={`p-2 rounded-lg transition-colors ${
                  autoPlayAudio ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'
                }`}
                title={autoPlayAudio ? '关闭自动播放' : '开启自动播放'}
              >
                {autoPlayAudio ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
                <button
                  onClick={() => setShowRealtimeVoiceChat(true)}
                  className="p-2 rounded-lg transition-colors hover:bg-green-100 text-green-600"
                  title="实时语音对话"
                >
                  <Phone className="w-5 h-5" />
                </button>

              {/* 导出按钮 */}
              <div className="relative export-menu">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isExporting || messages.length === 0}
                  className="p-2 rounded-lg transition-colors hover:bg-blue-100 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="导出对话"
                >
                  {isExporting ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
                
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                      导出选项
                    </div>
                    <button
                      onClick={() => handleExportText('word')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      导出为Word文档
                    </button>
                    <button
                      onClick={() => handleExportText('pdf')}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4 text-red-600" />
                      导出为PDF文档
                    </button>
                    <div className="border-t pt-2">
                      <div className="px-3 py-2 text-xs text-gray-500 mb-2">背景音乐选择</div>
                      <select
                        value={selectedBackgroundMusic}
                        onChange={(e) => setSelectedBackgroundMusic(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-2"
                      >
                        <option value="">无背景音乐</option>
                        <option value="soft">柔和音乐</option>
                        <option value="ambient">环境音乐</option>
                        <option value="classical">古典音乐</option>
                        <option value="jazz">爵士音乐</option>
                      </select>
                      <button
                        onClick={handleExportAudio}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Music className="w-4 h-4 text-purple-600" />
                        生成播客音频
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
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
                  autoPlay={autoPlayAudio && message && message.id && message.id.startsWith('ai_') || false}
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
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">正在生成回复和语音...</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  语音生成可能需要1-2分钟，请耐心等待
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

      {/* 实时语音聊天模态框 */}
      {showRealtimeVoiceChat && character && (
        <RealtimeVoiceChat
          character={character}
          onClose={() => setShowRealtimeVoiceChat(false)}
        />
      )}
    </div>
  );
}

export default withAuth(ChatPage);