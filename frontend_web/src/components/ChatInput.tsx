'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVoice } from '@/hooks/useVoice';
import OCRUpload from './OCRUpload';
import { useToastContext } from '@/contexts/ToastContext';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onVoiceInput: (audioBlob: Blob) => void;
  isVoiceEnabled: boolean;
  isRecording: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({ 
  onSendMessage, 
  onVoiceInput, 
  isVoiceEnabled, 
  isRecording, 
  isLoading,
  disabled = false 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { isSupported: voiceSupported } = useVoice();
  const { showError, showWarning } = useToastContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startVoiceRecording = useCallback(async () => {
    if (!voiceSupported) {
      showWarning('浏览器不支持', '您的浏览器不支持语音录制功能');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      // 检查浏览器支持的音频格式
      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // 如果不支持 webm，尝试其他格式
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        } else {
          // 使用默认格式
          delete options.mimeType;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        onVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        setIsVoiceRecording(false);
      };

      mediaRecorder.start();
      setIsVoiceRecording(true);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      showError('麦克风访问失败', '无法访问麦克风，请检查权限设置');
    }
  }, [voiceSupported, onVoiceInput]);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current && isVoiceRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [isVoiceRecording]);

  const handleVoiceToggle = () => {
    if (isVoiceRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-t border-gray-200 p-4"
    >
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入消息..."
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
        </div>
        
        <div className="flex gap-2">
          <OCRUpload
            onTextRecognized={(text) => {
              setMessage(text);
            }}
            disabled={disabled || isLoading}
          />
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleVoiceToggle}
            disabled={disabled || isLoading || !voiceSupported}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isVoiceRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isVoiceEnabled && voiceSupported
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-200 text-gray-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isVoiceRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </motion.button>
          
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!message.trim() || isLoading || disabled}
            className="p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>
      </form>
      
      {isVoiceRecording && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-center text-sm text-red-500"
        >
          正在录音中... 点击麦克风停止
        </motion.div>
      )}
      
      {!voiceSupported && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-center text-sm text-yellow-600"
        >
          您的浏览器不支持语音功能
        </motion.div>
      )}
    </motion.div>
  );
}
