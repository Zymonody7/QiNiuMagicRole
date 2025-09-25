'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Mic, MicOff, Play, Pause, Trash2, Save, User, Settings, Image, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChatService } from '@/services/chatService';
import AvatarUpload from '@/components/AvatarUpload';
import { withAuth } from '@/components/withAuth';

interface CustomCharacter {
  id: string;
  name: string;
  prompt: string;
  avatar?: string;
  avatarFile?: File;
  voiceData?: Blob;
  audioFile?: File;
  voiceUrl?: string;
}

function CharacterConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'voice' | 'upload'>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [character, setCharacter] = useState<CustomCharacter>({
    id: '',
    name: '',
    prompt: '',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        const audioUrl = URL.createObjectURL(audioBlob);
        setCharacter(prev => ({
          ...prev,
          voiceData: audioBlob,
          voiceUrl: audioUrl
        }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // 开始计时
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (character.voiceUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(character.voiceUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      
      audio.play();
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCharacter(prev => ({
        ...prev,
        audioFile: file,
        voiceUrl: URL.createObjectURL(file)
      }));
    }
  };

  const handleAvatarChange = (file: File | null) => {
    if (file) {
      setCharacter(prev => ({
        ...prev,
        avatarFile: file,
        avatar: URL.createObjectURL(file)
      }));
    } else {
      if (character.avatar) {
        URL.revokeObjectURL(character.avatar);
      }
      setCharacter(prev => ({
        ...prev,
        avatar: undefined,
        avatarFile: undefined
      }));
    }
  };

  const removeVoiceData = () => {
    if (character.voiceUrl) {
      URL.revokeObjectURL(character.voiceUrl);
    }
    setCharacter(prev => ({
      ...prev,
      voiceData: undefined,
      audioFile: undefined,
      voiceUrl: undefined
    }));
    setIsPlaying(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!character.name.trim() || !character.prompt.trim()) {
      alert('请填写角色名称和提示词');
      return;
    }

    if (!character.voiceData && !character.audioFile) {
      alert('请录制或上传音频文件');
      return;
    }

    if (!character.avatar && !character.avatarFile) {
      alert('请设置角色头像');
      return;
    }

    try {
      const savedCharacter = await ChatService.saveCharacterConfig(
        character.name,
        character.prompt,
        character.voiceData,
        character.audioFile,
        character.avatarFile
      );
      
      alert(`角色配置保存成功！角色ID: ${savedCharacter.id}`);
      router.push('/');
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
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
              
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-primary-600" />
                <h1 className="text-xl font-bold text-gray-900">角色配置</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* 基本信息 */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            
            {/* 头像设置 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                角色头像
              </label>
              <AvatarUpload
                avatar={character.avatar}
                onAvatarChange={handleAvatarChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称
                </label>
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="输入角色名称"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色ID
                </label>
                <input
                  type="text"
                  value={character.id}
                  onChange={(e) => setCharacter(prev => ({ ...prev, id: e.target.value }))}
                  placeholder="输入角色ID（可选）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色提示词
              </label>
              <textarea
                value={character.prompt}
                onChange={(e) => setCharacter(prev => ({ ...prev, prompt: e.target.value }))}
                placeholder="描述角色的性格、背景、说话方式等..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* 语音配置 */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">语音配置</h2>
            
            {/* 标签页 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('voice')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'voice'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                录制语音
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                上传音频
              </button>
            </div>

            {/* 录制语音 */}
            {activeTab === 'voice' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-16 h-16 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">录制您的语音</h3>
                  <p className="text-gray-600 mb-6">
                    录制一段语音样本，AI将学习您的音色特征
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-4 rounded-full transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
                  >
                    {isRecording ? (
                      <MicOff className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </motion.button>
                </div>

                {isRecording && (
                  <div className="text-center">
                    <div className="text-2xl font-mono text-red-500 mb-2">
                      {formatDuration(recordingDuration)}
                    </div>
                    <p className="text-sm text-gray-600">正在录音中...</p>
                  </div>
                )}

                {character.voiceUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">录制的语音</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={isPlaying ? stopPlayback : playRecording}
                          className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={removeVoiceData}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      时长: {formatDuration(recordingDuration)}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* 上传音频 */}
            {activeTab === 'upload' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-16 h-16 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">上传音频文件</h3>
                  <p className="text-gray-600 mb-6">
                    上传包含您语音的音频文件，支持 WAV、MP3、M4A 格式
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    选择音频文件
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    或拖拽文件到此区域
                  </p>
                </div>

                {character.audioFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">上传的音频</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={isPlaying ? stopPlayback : playRecording}
                          className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={removeVoiceData}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      文件名: {character.audioFile.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      大小: {(character.audioFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* 保存按钮 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end gap-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存配置
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default withAuth(CharacterConfigPage);
