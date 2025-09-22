'use client';

import { useState, useCallback } from 'react';

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isSupported: boolean;
  speak: (text: string, voiceSettings?: VoiceSettings) => void;
  stop: () => void;
  error: string | null;
}

interface VoiceSettings {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text: string, voiceSettings?: VoiceSettings) => {
    if (!isSupported) {
      setError('您的浏览器不支持语音合成功能');
      return;
    }

    try {
      // 停止当前播放
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.rate = voiceSettings?.rate || 1;
      utterance.pitch = voiceSettings?.pitch || 1;
      utterance.volume = voiceSettings?.volume || 1;
      
      if (voiceSettings?.voice) {
        utterance.voice = voiceSettings.voice;
      }

      utterance.onstart = () => {
        setIsPlaying(true);
        setError(null);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (event) => {
        setError(`语音合成错误: ${event.error}`);
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setError('语音合成失败');
      setIsPlaying(false);
    }
  }, [isSupported]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isSupported]);

  return {
    isPlaying,
    isSupported,
    speak,
    stop,
    error
  };
}
