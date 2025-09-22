'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';

interface VoiceCallProps {
  characterName: string;
  characterAvatar: string;
  isCallActive: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onSendVoiceMessage: (audioBlob: Blob) => void;
  onReceiveVoiceMessage: (audioBlob: Blob) => void;
}

export default function VoiceCall({
  characterName,
  characterAvatar,
  isCallActive,
  onStartCall,
  onEndCall,
  onSendVoiceMessage,
  onReceiveVoiceMessage
}: VoiceCallProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isCallActive) {
      // 开始计时
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      // 停止计时
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isCallActive]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onSendVoiceMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('无法访问麦克风:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (audioBlob: Blob) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.play();
  };

  const handleCallAction = () => {
    if (isCallActive) {
      onEndCall();
    } else {
      onStartCall();
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <AnimatePresence>
      {isCallActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
          >
            {/* 角色信息 */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4">
                <img
                  src={characterAvatar}
                  alt={characterName}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{characterName}</h3>
              <p className="text-gray-600 mb-4">语音通话中</p>
              <div className="text-2xl font-mono text-primary-600">
                {formatDuration(callDuration)}
              </div>
            </div>

            {/* 通话状态指示器 */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
                <span className="text-sm text-gray-600">
                  {isRecording ? '正在录音...' : '等待中'}
                </span>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex justify-center gap-4 mb-6">
              {/* 麦克风开关 */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleMicToggle}
                className={`p-4 rounded-full transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : isMuted
                    ? 'bg-gray-300 text-gray-600'
                    : 'bg-primary-500 text-white hover:bg-primary-600'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </motion.button>

              {/* 扬声器开关 */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`p-4 rounded-full transition-all ${
                  isSpeakerOn
                    ? 'bg-primary-500 text-white hover:bg-primary-600'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-6 h-6" />
                ) : (
                  <VolumeX className="w-6 h-6" />
                )}
              </motion.button>

              {/* 结束通话 */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCallAction}
                className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </motion.button>
            </div>

            {/* 通话提示 */}
            <div className="text-center text-sm text-gray-500">
              <p>点击麦克风开始录音，松开结束录音</p>
              <p className="mt-1">录音将自动发送给{characterName}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
