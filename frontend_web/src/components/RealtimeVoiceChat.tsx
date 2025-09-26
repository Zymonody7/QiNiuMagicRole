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
  const [isPreparing, setIsPreparing] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [silenceTimeout, setSilenceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasUserSpoken, setHasUserSpoken] = useState(false);
  const [greetingReady, setGreetingReady] = useState(false);
  const [greetingText, setGreetingText] = useState('');
  const [greetingAudioUrl, setGreetingAudioUrl] = useState<string | null>(null);
  const userSpokenDuringRecording = useRef<boolean>(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isUserSpeakingRef = useRef<boolean>(false);

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const startCall = async () => {
    try {
      setIsPreparing(true);
      setIsProcessing(true);
      
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,  // 降低采样率，更适合语音识别
          channelCount: 1,     // 单声道
          latency: 0.01        // 降低延迟
        } 
      });
      
      streamRef.current = stream;
      
      // 建立WebSocket连接
      const ws = new WebSocket('ws://localhost:8000/ws/voice-chat');
      websocketRef.current = ws;
      
      ws.onopen = () => {
        console.log('语音通话连接已建立');
        setIsProcessing(false);
        // 注意：这里不设置 setIsCallActive(true)，要等问候语准备好后才进入通话界面
        
        // 发送角色信息
        try {
          ws.send(JSON.stringify({
            type: 'init',
            characterId: character.id,
            characterName: character.name
          }));
          console.log('角色信息已发送:', character.name);
        } catch (error) {
          console.error('发送角色信息失败:', error);
        }
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
        console.log('语音通话连接已断开');
        setIsCallActive(false);
        setIsProcessing(false);
      };
      
    } catch (error) {
      console.error('启动语音通话失败:', error);
      setIsProcessing(false);
    }
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      // 创建音频上下文
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // 创建音频源
      const source = audioContext.createMediaStreamSource(stream);
      
      // 创建分析器
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      // 连接音频源到分析器
      source.connect(analyser);
      
      // 开始监听音频
      startAudioMonitoring();
      
    } catch (error) {
      console.error('设置音频分析失败:', error);
    }
  };

  const startAudioMonitoring = () => {
    if (!analyserRef.current) return;
    
    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const monitor = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // 计算音频强度
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const audioLevel = Math.round((average / 255) * 100);
      
      setAudioLevel(audioLevel);
      
      // 判断是否在说话（阈值可调整）
      const isSpeaking = audioLevel > 15; // 阈值：15%
      isUserSpeakingRef.current = isSpeaking;
      setIsUserSpeaking(isSpeaking);
      
      // 添加调试日志
      if (audioLevel > 5) { // 进一步降低阈值用于调试
      }
      
      
      // 如果用户在说话，重置静音超时
      if (isSpeaking) {
        setHasUserSpoken(true);
        userSpokenDuringRecording.current = true; // 标记在录音期间用户说话了
        resetSilenceTimeout();
      }
      
      // 继续监听
      animationFrameRef.current = requestAnimationFrame(monitor);
    };
    
    monitor();
  };

  const startActualCall = () => {
    // 设置音频分析器用于语音活动检测（现在才设置）
    if (streamRef.current) {
      setupAudioAnalysis(streamRef.current);
    }
    
    // 播放问候语
    if (greetingAudioUrl) {
      console.log('🎵 准备播放问候语:', greetingAudioUrl);
      playAudio(greetingAudioUrl);
    } else {
      console.log('⚠️ 问候语音频URL为空');
    }
    
    // 开始录音
    setTimeout(() => {
      startRecording();
    }, 1000); // 延迟1秒开始录音
  };

  const startActualCallWithAudio = (audioUrl: string) => {
    console.log('🎵 startActualCallWithAudio 被调用，isCallActive:', isCallActive);
    
    // 设置音频分析器用于语音活动检测（现在才设置）
    if (streamRef.current) {
      setupAudioAnalysis(streamRef.current);
    }
    
    // 播放问候语
    if (audioUrl) {
      console.log('🎵 准备播放问候语:', audioUrl);
      playAudio(audioUrl);
    } else {
      console.log('⚠️ 问候语音频URL为空');
    }
    
    // 开始录音 - 使用更长的延迟确保状态更新
    setTimeout(() => {
      console.log('🎵 准备开始录音，当前isCallActive:', isCallActive);
      console.log('🎵 开始录音前的状态检查:', {
        streamRef: !!streamRef.current,
        websocketRef: !!websocketRef.current,
        websocketState: websocketRef.current?.readyState
      });
      startRecording();
    }, 2000); // 延迟2秒开始录音
  };

  const endCall = () => {
    cleanup();
    setIsCallActive(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setIsUserSpeaking(false);
    setAudioLevel(0);
    setCurrentTranscript('');
    setGreetingReady(false);
    setGreetingText('');
    setGreetingAudioUrl(null);
    onClose();
  };

  const startRecording = () => {
    console.log('🎙️ ===== startRecording 被调用 =====');
    console.log('🎙️ 条件检查:', {
      streamRef: !!streamRef.current,
      websocketRef: !!websocketRef.current,
      isCallActive
    });
    
    if (!streamRef.current || !websocketRef.current) {
      console.log('❌ startRecording 基础条件不满足，退出');
      return;
    }
    
    // 如果isCallActive为false，但其他条件满足，强制开始录音
    if (!isCallActive) {
      console.log('⚠️ isCallActive为false，但强制开始录音');
    }
    
    try {
      console.log('🎙️ 创建MediaRecorder...');
      
      // 检查支持的MIME类型，优先选择适合语音的格式
      const supportedTypes = [
        'audio/webm;codecs=opus',  // 最佳语音质量
        'audio/mp4;codecs=mp4a.40.2',  // AAC编码，适合语音
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      let mimeType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('🎙️ 使用MIME类型:', mimeType);
          break;
        }
      }
      
      if (!mimeType) {
        console.error('❌ 没有支持的MIME类型');
        return;
      }
      
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('🎙️ 收到音频数据:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('🎙️ 音频数据质量检查:', {
            size: event.data.size,
            type: event.data.type,
            timestamp: new Date().toISOString()
          });
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('🛑 ===== 录音停止事件触发 =====');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // 检查用户是否在录音期间说话
        const wasUserSpeaking = userSpokenDuringRecording.current;
        
        console.log(`🛑 录音结束 - 音频大小: ${audioBlob.size}, 录音期间用户说话: ${wasUserSpeaking}`);
        console.log(`🛑 录音数据详情:`, {
          chunksCount: audioChunksRef.current.length,
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          wasUserSpeaking: wasUserSpeaking,
          userSpokenDuringRecording: userSpokenDuringRecording.current
        });
        
        // 临时：强制发送所有音频数据用于调试
        if (audioBlob.size > 0) {
          console.log('🎤 强制发送音频数据用于调试');
          console.log('🎤 音频Blob详情:', {
            size: audioBlob.size,
            type: audioBlob.type,
            wasUserSpeaking: wasUserSpeaking,
            userSpokenDuringRecording: userSpokenDuringRecording.current
          });
          sendAudioToServer(audioBlob);
          setHasUserSpoken(false); // 重置标志
        } else {
          console.log('🔇 音频数据为空，跳过发送');
        }
        
        // 重新开始录音（持续监听）
        setTimeout(() => {
          if (isCallActive && !isSpeaking) {
            startRecording();
          }
        }, 100);
      };
      
      // 开始连续录音，每3秒发送一次音频数据
      console.log('🎙️ 开始录音，每3秒发送一次音频数据');
      console.log('🎙️ MediaRecorder状态:', mediaRecorder.state);
      mediaRecorder.start();
      console.log('🎙️ 录音已启动，状态:', mediaRecorder.state);
      setIsRecording(true);
      
      // 手动控制录音停止，每3秒停止一次
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('🎙️ 手动停止录音（3秒后）');
          console.log('🎙️ 录音前请确保：');
          console.log('🎙️ 1. 麦克风权限已授予');
          console.log('🎙️ 2. 没有其他应用占用麦克风');
          console.log('🎙️ 3. 环境相对安静');
          mediaRecorderRef.current.stop();
        }
      }, 3000);
      
      // 重置用户说话标志
      userSpokenDuringRecording.current = false;
      console.log('🎙️ 录音已开始，用户说话标志已重置');
      
      // 开始录音时设置静音超时
      resetSilenceTimeout();
      
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
    console.log('📤 ===== sendAudioToServer 被调用 =====');
    if (!websocketRef.current) {
      console.error('❌ WebSocket连接不存在');
      return;
    }
    
    try {
      console.log(`🎵 准备发送音频数据，大小: ${audioBlob.size} bytes`);
      
      // 检查WebSocket连接状态
      if (websocketRef.current.readyState !== WebSocket.OPEN) {
        console.error('❌ WebSocket连接未打开，状态:', websocketRef.current.readyState);
        return;
      }
      
      // 将音频转换为ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = Array.from(new Uint8Array(arrayBuffer));
      
      console.log(`🎵 音频数据转换完成，数组长度: ${audioData.length}`);
      
      // 发送音频数据
      const message = {
        type: 'audio',
        data: audioData,
        characterId: character.id
      };
      
      console.log('📤 发送音频数据，角色ID:', character.id);
      
      console.log('📤 发送WebSocket消息:', { 
        type: message.type, 
        dataLength: message.data.length, 
        characterId: message.characterId,
        websocketState: websocketRef.current.readyState
      });
      
      websocketRef.current.send(JSON.stringify(message));
      
      console.log('✅ 音频数据发送成功');
      
    } catch (error) {
      console.error('❌ 发送音频失败:', error);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'greeting':
        // 存储问候语，不立即播放
        console.log('收到问候语:', data.text);
        console.log('问候语音频URL:', data.audioUrl);
        setGreetingText(data.text);
        setGreetingAudioUrl(data.audioUrl);
        setGreetingReady(true);
        setIsPreparing(false);
        // 问候语准备好后，才进入通话界面
        setIsCallActive(true);
        // 延迟一点时间确保状态更新完成
        setTimeout(() => {
          console.log('🎵 ===== 准备调用 startActualCallWithAudio =====');
          startActualCallWithAudio(data.audioUrl);
        }, 100);
        break;
        
      case 'transcript':
        setCurrentTranscript(data.text);
        // 重置静音超时
        resetSilenceTimeout();
        break;
        
      case 'response':
        // 停止录音，播放AI回复
        if (isRecording) {
          stopRecording();
        }
        
        // 清除静音超时
        if (silenceTimeout) {
          clearTimeout(silenceTimeout);
          setSilenceTimeout(null);
        }
        
        // 播放AI回复的音频
        if (data.audioUrl) {
          playAudio(data.audioUrl);
        }
        break;
        
      case 'ready':
        // AI回复播放完毕，开始录音
        if (isCallActive && !isRecording && !isSpeaking) {
          startRecording();
        }
        break;
        
      case 'error':
        console.error('服务器错误:', data.message);
        break;
    }
  };

  const resetSilenceTimeout = () => {
    // 清除之前的超时
    if (silenceTimeout) {
      clearTimeout(silenceTimeout);
    }
    
    // 设置新的超时（5秒静音后AI开始说话）
    const timeout = setTimeout(() => {
      if (isCallActive && !isSpeaking) {
        console.log('用户静音超时，AI开始说话');
        // 发送静音超时信号给服务器
        if (websocketRef.current) {
          websocketRef.current.send(JSON.stringify({
            type: 'silence_timeout',
            characterId: character.id
          }));
        }
      }
    }, 5000); // 5秒静音超时
    
    setSilenceTimeout(timeout);
  };

  const playAudio = (audioUrl: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    console.log('🎵 开始播放音频:', audioUrl);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setIsSpeaking(true);
    
    audio.onended = () => {
      console.log('🎵 音频播放完毕');
      setIsSpeaking(false);
      // 播放完毕后，通知服务器可以开始录音
      if (websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'ready'
        }));
      }
    };
    
    audio.onerror = (error) => {
      console.error('🎵 音频播放失败:', error);
      setIsSpeaking(false);
    };
    
    audio.play().catch(error => {
      console.error('🎵 音频播放启动失败:', error);
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
                    {isCallActive ? '通话中' : '准备拨号...'}
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
                isCallActive ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600">
                {isCallActive ? '通话中' : '准备中...'}
              </span>
            </div>
          </div>

          {/* 通话状态显示区域 */}
          <div className="h-48 flex items-center justify-center p-4 bg-gray-50">
            <div className="text-center">
              {!isCallActive ? (
                <div className="text-gray-500">
                  <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">准备拨号</p>
                  <p className="text-sm mt-2">点击拨号按钮开始通话</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <img
                      src={character.avatar || '/default-avatar.svg'}
                      alt={character.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  </div>
                  <p className="text-lg font-medium text-gray-800">{character.name}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {isRecording ? '正在听取您的声音...' : 
                     isSpeaking ? 'AI正在回复...' : 
                     isUserSpeaking ? '检测到您的声音...' :
                     '等待您说话...'}
                  </p>
                  
                </div>
              )}
            </div>
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
            {!isCallActive ? (
              <div className="flex justify-center">
                <button
                  onClick={startCall}
                  disabled={isProcessing || isPreparing}
                  className={`flex items-center space-x-2 px-8 py-4 rounded-full text-white font-medium transition-all ${
                    isProcessing || isPreparing
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>拨号中...</span>
                    </>
                  ) : isPreparing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>准备中...</span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-6 h-6" />
                      <span>拨打电话</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-4">
                {/* 测试录音按钮 */}
                <button
                  onClick={startRecording}
                  className="w-16 h-16 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                >
                  <Mic className="w-6 h-6" />
                </button>
                
                {/* 挂断按钮 */}
                <button
                  onClick={endCall}
                  className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                >
                  <PhoneOff className="w-8 h-8" />
                </button>
              </div>
            )}

            {/* 状态提示 */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {isProcessing && '正在建立连接...'}
                {isCallActive && isRecording && isUserSpeaking && '检测到您的声音，正在处理...'}
                {isCallActive && isRecording && !isUserSpeaking && '正在监听...'}
                {isCallActive && isSpeaking && 'AI正在回复...'}
                {isCallActive && !isRecording && !isSpeaking && '等待您说话...'}
              </p>
              
              {/* 调试信息 */}
              {isCallActive && (
                <div className="mt-2 text-xs text-gray-400">
                  <p>录音状态: {isRecording ? '进行中' : '已停止'}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
