'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceSettings {
  language: string;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}

interface UseAdvancedVoiceReturn {
  // 语音识别
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  transcript: string;
  error: string | null;
  
  // 语音合成
  isSpeaking: boolean;
  speak: (text: string, settings?: Partial<VoiceSettings>) => void;
  stopSpeaking: () => void;
  
  // 设置
  voiceSettings: VoiceSettings;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  
  // 音频处理
  processAudioFile: (file: File) => Promise<string>;
}

const defaultVoiceSettings: VoiceSettings = {
  language: 'zh-CN',
  voice: 'default',
  speed: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

export function useAdvancedVoice(): UseAdvancedVoiceReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(defaultVoiceSettings);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) &&
    'speechSynthesis' in window;

  // 语音识别功能
  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('您的浏览器不支持语音识别功能');
      return;
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = voiceSettings.language;

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setError(null);
        setTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        setTranscript(finalTranscript || interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        setError(`语音识别错误: ${event.error}`);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.start();
    } catch (err) {
      setError('启动语音识别失败');
      setIsRecording(false);
    }
  }, [isSupported, voiceSettings.language]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // 语音合成功能
  const speak = useCallback((text: string, customSettings?: Partial<VoiceSettings>) => {
    if (!isSupported) {
      setError('您的浏览器不支持语音合成功能');
      return;
    }

    try {
      // 停止当前播放
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }

      const settings = { ...voiceSettings, ...customSettings };
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.lang = settings.language;
      utterance.rate = settings.speed;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      // 选择语音
      const voices = speechSynthesis.getVoices();
      const selectedVoice = voices.find(voice => 
        voice.lang.includes(settings.language.split('-')[0])
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        setError(`语音合成错误: ${event.error}`);
        setIsSpeaking(false);
      };

      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    } catch (err) {
      setError('语音合成失败');
      setIsSpeaking(false);
    }
  }, [isSupported, voiceSettings]);

  const stopSpeaking = useCallback(() => {
    if (speechSynthesisRef.current) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // 更新语音设置
  const updateVoiceSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setVoiceSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // 音频文件处理
  const processAudioFile = useCallback(async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/v1/voice/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('音频处理失败');
      }

      const result = await response.json();
      return result.transcript;
    } catch (err) {
      setError('音频文件处理失败');
      throw err;
    }
  }, []);

  // 清理资源
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    transcript,
    error,
    isSpeaking,
    speak,
    stopSpeaking,
    voiceSettings,
    updateVoiceSettings,
    processAudioFile,
  };
}

// 扩展 Window 接口
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
