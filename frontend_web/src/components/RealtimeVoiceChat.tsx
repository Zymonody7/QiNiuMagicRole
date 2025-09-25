'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { Character } from '@/types/character';

interface RealtimeVoiceChatProps {
  character: Character;
  onClose: () => void;
}

interface VoiceMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

export default function RealtimeVoiceChat({ character, onClose }: RealtimeVoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  // 清理资源
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const startCall = async () => {
    try {
      setIsProcessing(true);
      
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // 建立WebSocket连接
      const ws = new WebSocket('ws://localhost:8000/ws/voice-chat');
      websocketRef.current = ws;
      
      ws.onopen = () => {
        console.log('语音聊天连接已建立');
        setIsConnected(true);
        setIsProcessing(false);
        
        // 发送角色信息
        ws.send(JSON.stringify({
          type: 'init',
          characterId: character.id,
          characterName: character.name
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setIsProcessing(false);
      };
      
      ws.onclose = () => {
        console.log('语音聊天连接已断开');
        setIsConnected(false);
        setIsProcessing(false);
      };
      
    } catch (error) {
      console.error('启动语音聊天失败:', error);
      setIsProcessing(false);
    }
  };

  const endCall = () => {
    cleanup();
    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setMessages([]);
    setCurrentTranscript('');
    onClose();
  };

  const startRecording = () => {
    if (!streamRef.current || !websocketRef.current) return;
    
    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToServer(audioBlob);
      };
      
      mediaRecorder.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      
    } catch (error) {
      console.error('开始录音失败:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToServer = async (audioBlob: Blob) => {
    if (!websocketRef.current) return;
    
    try {
      // 将音频转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // 发送音频数据
      websocketRef.current.send(JSON.stringify({
        type: 'audio',
        data: Array.from(new Uint8Array(arrayBuffer))
      }));
      
    } catch (error) {
      console.error('发送音频失败:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'transcript':
        setCurrentTranscript(data.text);
        break;
        
      case 'response':
        // 添加AI回复到消息列表
        const aiMessage: VoiceMessage = {
          id: `ai_${Date.now()}`,
          text: data.text,
          isUser: false,
          timestamp: new Date(),
          audioUrl: data.audioUrl
        };
        setMessages(prev => [...prev, aiMessage]);
        
        // 播放AI回复的音频
        if (data.audioUrl) {
          playAudio(data.audioUrl);
        }
        break;
        
      case 'error':
        console.error('服务器错误:', data.message);
        break;
    }
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setIsSpeaking(true);
    
    audio.onended = () => {
      setIsSpeaking(false);
    };
    
    audio.onerror = () => {
      setIsSpeaking(false);
      console.error('音频播放失败');
    };
    
    audio.play().catch(error => {
      console.error('音频播放失败:', error);
      setIsSpeaking(false);
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        >
          {/* 头部 */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <img
                    src={character.avatar || '/default-avatar.svg'}
                    alt={character.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{character.name}</h3>
                  <p className="text-sm opacity-90">
                    {isConnected ? '语音通话中' : '准备连接...'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 状态指示器 */}
          <div className="p-4 bg-gray-50">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600">
                {isConnected ? '已连接' : '连接中...'}
              </span>
            </div>
          </div>

          {/* 消息显示区域 */}
          <div className="h-48 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>开始语音对话</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-2xl ${
                        message.isUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-800 border'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 当前识别文本 */}
          {currentTranscript && (
            <div className="px-4 py-2 bg-yellow-50 border-t">
              <p className="text-sm text-gray-600">
                <span className="font-medium">正在识别:</span> {currentTranscript}
              </p>
            </div>
          )}

          {/* 控制按钮 */}
          <div className="p-6 bg-white">
            {!isConnected ? (
              <div className="flex justify-center">
                <button
                  onClick={startCall}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-full text-white font-medium transition-all ${
                    isProcessing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>连接中...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-5 h-5" />
                      <span>开始通话</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                {/* 录音按钮 */}
                <button
                  onClick={toggleRecording}
                  disabled={isSpeaking}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  } ${isSpeaking ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* 挂断按钮 */}
                <button
                  onClick={endCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            )}

            {/* 状态提示 */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {isRecording && '正在录音...'}
                {isSpeaking && 'AI正在回复...'}
                {!isRecording && !isSpeaking && isConnected && '点击麦克风开始说话'}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
