'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Mic, MicOff, Play, Pause, Trash2, Music, FileText, Volume2 } from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';

interface PodcastExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: PodcastConfig) => void;
  characterName: string;
}

export interface PodcastConfig {
  userVoiceType: 'qiniu_male' | 'custom_upload' | 'custom_record';
  userVoiceFile?: File;
  userVoiceUrl?: string;
  backgroundMusic?: File;
  backgroundMusicUrl?: string;
  introText: string;
  outroText: string;
}

const defaultIntroText = "欢迎收听对话播客。";
const defaultOutroText = "感谢收听对话播客，再见！";

export default function PodcastExportModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  characterName 
}: PodcastExportModalProps) {
  const [userVoiceType, setUserVoiceType] = useState<'qiniu_male' | 'custom_upload' | 'custom_record'>('qiniu_male');
  const [userVoiceFile, setUserVoiceFile] = useState<File | null>(null);
  const [userVoiceUrl, setUserVoiceUrl] = useState<string>('');
  const [backgroundMusicFile, setBackgroundMusicFile] = useState<File | null>(null);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string>('');
  const [introText, setIntroText] = useState(defaultIntroText);
  const [outroText, setOutroText] = useState(defaultOutroText);
  
  // 录音状态
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { showSuccess, showError, showWarning } = useToastContext();

  const handleUserVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        showWarning('文件类型错误', '请选择音频文件');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        showWarning('文件过大', '音频文件大小不能超过10MB');
        return;
      }
      
      setUserVoiceFile(file);
      const url = URL.createObjectURL(file);
      setUserVoiceUrl(url);
      setUserVoiceType('custom_upload');
    }
  };

  const handleBackgroundMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        showWarning('文件类型错误', '请选择音频文件');
        return;
      }
      
      if (file.size > 20 * 1024 * 1024) {
        showWarning('文件过大', '背景音乐文件大小不能超过20MB');
        return;
      }
      
      setBackgroundMusicFile(file);
      const url = URL.createObjectURL(file);
      setBackgroundMusicUrl(url);
    }
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
        const audioFile = new File([audioBlob], 'user_voice.wav', { type: 'audio/wav' });
        setUserVoiceFile(audioFile);
        const url = URL.createObjectURL(audioBlob);
        setUserVoiceUrl(url);
        setUserVoiceType('custom_record');
        
        // 停止所有音频轨道
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
      showError('麦克风访问失败', '无法访问麦克风，请检查权限设置');
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

  const playAudio = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onended = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    
    audio.play();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const config: PodcastConfig = {
      userVoiceType,
      userVoiceFile: userVoiceFile || undefined,
      userVoiceUrl: userVoiceUrl || undefined,
      backgroundMusic: backgroundMusicFile || undefined,
      backgroundMusicUrl: backgroundMusicUrl || undefined,
      introText,
      outroText
    };
    
    onConfirm(config);
  };

  const resetToDefaults = () => {
    setUserVoiceType('qiniu_male');
    setUserVoiceFile(null);
    setUserVoiceUrl('');
    setBackgroundMusicFile(null);
    setBackgroundMusicUrl('');
    setIntroText(defaultIntroText);
    setOutroText(defaultOutroText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 背景遮罩 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        {/* 弹窗内容 */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              播客导出配置 - {characterName}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* 用户音色配置 */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">用户音色设置</h4>
              <div className="space-y-4">
                {/* 选项 */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="userVoice"
                      value="qiniu_male"
                      checked={userVoiceType === 'qiniu_male'}
                      onChange={(e) => setUserVoiceType(e.target.value as any)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">使用七牛云男声（默认）</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="userVoice"
                      value="custom_upload"
                      checked={userVoiceType === 'custom_upload'}
                      onChange={(e) => setUserVoiceType(e.target.value as any)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">上传自定义音色</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="userVoice"
                      value="custom_record"
                      checked={userVoiceType === 'custom_record'}
                      onChange={(e) => setUserVoiceType(e.target.value as any)}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">录制自定义音色</span>
                  </label>
                </div>

                {/* 上传音色 */}
                {userVoiceType === 'custom_upload' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleUserVoiceUpload}
                      className="hidden"
                      id="userVoiceUpload"
                    />
                    <label
                      htmlFor="userVoiceUpload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">点击上传音色文件</span>
                      <span className="text-xs text-gray-400">支持 MP3, WAV, M4A 格式，最大 10MB</span>
                    </label>
                    
                    {userVoiceFile && (
                      <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex items-center">
                          <Volume2 className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-700">{userVoiceFile.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {userVoiceUrl && (
                            <button
                              onClick={() => playAudio(userVoiceUrl)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setUserVoiceFile(null);
                              setUserVoiceUrl('');
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 录制音色 */}
                {userVoiceType === 'custom_record' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <div className="mb-4">
                        {!isRecording ? (
                          <button
                            onClick={startRecording}
                            className="flex items-center justify-center w-16 h-16 mx-auto bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                          >
                            <Mic className="w-6 h-6" />
                          </button>
                        ) : (
                          <button
                            onClick={stopRecording}
                            className="flex items-center justify-center w-16 h-16 mx-auto bg-gray-500 hover:bg-gray-600 text-white rounded-full transition-colors"
                          >
                            <MicOff className="w-6 h-6" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        {isRecording ? `录制中... ${formatTime(recordingDuration)}` : '点击开始录制'}
                      </div>
                      
                      {userVoiceFile && (
                        <div className="mt-3 flex items-center justify-center space-x-2">
                          <span className="text-sm text-gray-700">录制完成</span>
                          {userVoiceUrl && (
                            <button
                              onClick={() => playAudio(userVoiceUrl)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setUserVoiceFile(null);
                              setUserVoiceUrl('');
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 背景音乐配置 */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">背景音乐设置</h4>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleBackgroundMusicUpload}
                  className="hidden"
                  id="backgroundMusicUpload"
                />
                <label
                  htmlFor="backgroundMusicUpload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Music className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">点击上传背景音乐</span>
                  <span className="text-xs text-gray-400">支持 MP3, WAV, M4A 格式，最大 20MB</span>
                </label>
                
                {backgroundMusicFile && (
                  <div className="mt-3 flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex items-center">
                      <Music className="w-4 h-4 text-purple-500 mr-2" />
                      <span className="text-sm text-gray-700">{backgroundMusicFile.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {backgroundMusicUrl && (
                        <button
                          onClick={() => playAudio(backgroundMusicUrl)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setBackgroundMusicFile(null);
                          setBackgroundMusicUrl('');
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 开头结尾配置 */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">播客内容设置</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开头话术
                  </label>
                  <textarea
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="请输入播客开头话术..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结尾话术
                  </label>
                  <textarea
                    value={outroText}
                    onChange={(e) => setOutroText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="请输入播客结尾话术..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              重置为默认
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                开始生成播客
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
