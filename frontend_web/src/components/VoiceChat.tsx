'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Settings, Upload } from 'lucide-react';
import { useAdvancedVoice } from '@/hooks/useAdvancedVoice';
import { Character } from '@/types/character';

interface VoiceChatProps {
  character: Character;
  onMessage: (message: string) => void;
  onReceiveMessage: (message: string) => void;
}

export default function VoiceChat({ character, onMessage, onReceiveMessage }: VoiceChatProps) {
  const {
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
  } = useAdvancedVoice();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当识别到文本时，自动发送消息
  useEffect(() => {
    if (transcript && !isRecording) {
      onMessage(transcript);
    }
  }, [transcript, isRecording, onMessage]);

  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSpeakResponse = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      // 根据角色调整语音参数
      const characterVoiceSettings = getCharacterVoiceSettings(character);
      speak(text, characterVoiceSettings);
    }
  };

  const getCharacterVoiceSettings = (char: Character) => {
    // 根据角色特点调整语音参数
    const baseSettings = {
      language: 'zh-CN',
      speed: 1.0,
      pitch: 1.0,
      volume: 0.8,
    };

    // 根据角色类型调整参数
    switch (char.category) {
      case 'philosophy':
        return { ...baseSettings, speed: 0.9, pitch: 0.8 }; // 苏格拉底：较慢、深沉
      case 'science':
        return { ...baseSettings, speed: 1.1, pitch: 1.1 }; // 爱因斯坦：较快、活跃
      case 'literature':
        return { ...baseSettings, speed: 1.0, pitch: 1.0 }; // 文学角色：标准
      case 'history':
        return { ...baseSettings, speed: 0.95, pitch: 0.9 }; // 历史人物：稳重
      case 'art':
        return { ...baseSettings, speed: 1.05, pitch: 1.1 }; // 艺术家：富有表现力
      case 'mythology':
        return { ...baseSettings, speed: 0.9, pitch: 0.8 }; // 神话人物：威严
      default:
        return baseSettings;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const transcript = await processAudioFile(file);
      onMessage(transcript);
    } catch (err) {
      console.error('音频处理失败:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800">您的浏览器不支持语音功能</p>
        <p className="text-yellow-600 text-sm mt-1">请使用Chrome、Edge或Safari浏览器</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">语音聊天</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* 语音识别状态 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          onClick={handleVoiceToggle}
          disabled={isProcessing}
          className={`w-16 h-16 rounded-full ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isRecording ? '正在录音...' : '点击开始录音'}
          </p>
          {transcript && (
            <p className="text-sm text-gray-800 mt-2 bg-gray-100 p-2 rounded">
              {transcript}
            </p>
          )}
        </div>
      </div>

      {/* 语音合成控制 */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          onClick={() => handleSpeakResponse('你好，我是' + character.name + '，很高兴与你对话！')}
          variant={isSpeaking ? "destructive" : "outline"}
          disabled={isRecording}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
          {isSpeaking ? '停止播放' : '试听语音'}
        </Button>
      </div>

      {/* 文件上传 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isRecording}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isProcessing ? '处理中...' : '上传音频文件'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          支持 MP3、WAV、M4A 等格式
        </p>
      </div>

      {/* 语音设置 */}
      {showSettings && (
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">语音设置</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">语速</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.speed}
                onChange={(e) => updateVoiceSettings({ speed: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{voiceSettings.speed}x</span>
            </div>
            <div>
              <label className="text-xs text-gray-600">音调</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceSettings.pitch}
                onChange={(e) => updateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{voiceSettings.pitch}</span>
            </div>
            <div>
              <label className="text-xs text-gray-600">音量</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.volume}
                onChange={(e) => updateVoiceSettings({ volume: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{Math.round(voiceSettings.volume * 100)}%</span>
            </div>
            <div>
              <label className="text-xs text-gray-600">语言</label>
              <select
                value={voiceSettings.language}
                onChange={(e) => updateVoiceSettings({ language: e.target.value })}
                className="w-full text-xs border rounded px-2 py-1"
              >
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 角色语音特点提示 */}
      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
        <p className="text-sm text-purple-800">
          <strong>{character.name}</strong> 的语音特点：{character.voiceStyle}
        </p>
      </div>
    </div>
  );
}
