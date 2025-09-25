'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onClear: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onClear }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 清理资源
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob);
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // 开始计时
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('无法访问麦克风:', error);
      alert('无法访问麦克风，请检查浏览器权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const clearRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    onClear();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">录制参考音频</h3>
        <p className="text-sm text-gray-600 mb-4">
          请清晰地说出您希望角色模仿的语音内容
        </p>
      </div>

      {/* 录制控制 */}
      <div className="flex justify-center space-x-4">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <Mic className="w-5 h-5 mr-2" />
            开始录制
          </Button>
        )}

        {isRecording && (
          <Button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <Square className="w-5 h-5 mr-2" />
            停止录制
          </Button>
        )}

        {audioBlob && (
          <div className="flex space-x-2">
            <Button
              onClick={playRecording}
              variant="outline"
              size="lg"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 mr-2" />
              ) : (
                <Play className="w-5 h-5 mr-2" />
              )}
              {isPlaying ? '暂停' : '播放'}
            </Button>
            
            <Button
              onClick={clearRecording}
              variant="outline"
              size="lg"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              重新录制
            </Button>
          </div>
        )}
      </div>

      {/* 录制时间显示 */}
      {isRecording && (
        <div className="text-center">
          <div className="text-2xl font-mono text-red-600">
            {formatTime(recordingTime)}
          </div>
          <div className="text-sm text-gray-500 mt-1">正在录制...</div>
        </div>
      )}

      {/* 音频预览 */}
      {audioUrl && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 text-center">
            录制时长: {formatTime(recordingTime)}
          </div>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="w-full"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
        </div>
      )}

      {/* 录制提示 */}
      {!audioBlob && (
        <div className="text-xs text-gray-500 text-center space-y-1">
          <div>• 请确保在安静的环境中录制</div>
          <div>• 说话清晰，语速适中</div>
          <div>• 录制时长建议10-30秒</div>
        </div>
      )}
    </div>
  );
}
