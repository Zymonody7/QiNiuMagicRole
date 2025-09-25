'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mic, MicOff, Play, Square, Download, Trash2 } from 'lucide-react';

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void;
  onAudioText?: (text: string) => void;
  language?: string;
  disabled?: boolean;
}

export default function AudioRecorder({ 
  onAudioRecorded, 
  onAudioText,
  language = 'zh',
  disabled = false 
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
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
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      
      // 尝试使用WAV格式的MediaRecorder
      let mediaRecorder: MediaRecorder;
      let mimeType = 'audio/webm';
      
      // 检查浏览器支持的格式
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });
        mimeType = 'audio/wav';
        console.log('使用WAV格式录制');
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mimeType = 'audio/webm';
        console.log('使用WebM格式录制，将转换为WAV');
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
        mimeType = 'audio/mp4';
        console.log('使用MP4格式录制，将转换为WAV');
      } else {
        // 使用默认格式
        mediaRecorder = new MediaRecorder(stream);
        console.log('使用默认格式录制，将转换为WAV');
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const originalBlob = new Blob(audioChunks, { type: mimeType });
        console.log('录制完成，格式:', mimeType, '大小:', originalBlob.size);
        
        try {
          setIsConverting(true);
          setError(null);
          
          let finalBlob: Blob;
          
          if (mimeType === 'audio/wav') {
            // 已经是WAV格式，直接使用
            console.log('录制格式已经是WAV，无需转换');
            finalBlob = originalBlob;
          } else {
            // 需要转换为WAV格式
            console.log('开始转换音频格式:', mimeType, '-> WAV');
            finalBlob = await convertWebMToWav(originalBlob);
          }
          
          setAudioBlob(finalBlob);
          
          // 创建预览URL（使用原始格式用于播放预览）
          const url = URL.createObjectURL(originalBlob);
          setAudioUrl(url);
          
          // 传递最终格式的音频给父组件
          onAudioRecorded(finalBlob);
          
          // 自动进行语音识别
          if (onAudioText) {
            transcribeAudio(finalBlob);
          }
        } catch (error) {
          console.error('音频转换失败:', error);
          setError('音频转换失败，使用原始格式');
          
          // 降级处理：使用原始格式，但创建WAV类型的Blob
          const wavBlob = new Blob([originalBlob], { type: 'audio/wav' });
          setAudioBlob(wavBlob);
          const url = URL.createObjectURL(originalBlob);
          setAudioUrl(url);
          onAudioRecorded(wavBlob);
        } finally {
          setIsConverting(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // 开始计时
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('录音失败:', err);
      setError('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const downloadRecording = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const convertWebMToWav = async (webmBlob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // 检查浏览器支持
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          throw new Error('浏览器不支持AudioContext');
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async () => {
          try {
            const arrayBuffer = fileReader.result as ArrayBuffer;
            
            // 检查音频数据是否有效
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
              throw new Error('音频数据为空');
            }
            
            console.log('开始解码音频数据，大小:', arrayBuffer.byteLength);
            
            // 尝试使用OfflineAudioContext进行更稳定的解码
            let audioBuffer;
            try {
              audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            } catch (decodeError) {
              console.warn('AudioContext解码失败，尝试OfflineAudioContext:', decodeError);
              // 使用OfflineAudioContext作为备用方案
              const offlineContext = new OfflineAudioContext(1, 1, 44100);
              try {
                audioBuffer = await offlineContext.decodeAudioData(arrayBuffer);
              } catch (offlineError) {
                console.warn('OfflineAudioContext也失败，尝试直接转换:', offlineError);
                // 如果都失败，直接返回原始数据作为WAV
                const wavBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
                resolve(wavBlob);
                return;
              }
            }
            
            console.log('音频解码成功:', {
              length: audioBuffer.length,
              sampleRate: audioBuffer.sampleRate,
              numberOfChannels: audioBuffer.numberOfChannels
            });
            
            // 转换为WAV格式
            const wavBlob = audioBufferToWav(audioBuffer);
            console.log('WAV转换成功，大小:', wavBlob.size);
            resolve(wavBlob);
          } catch (error) {
            console.error('音频解码失败:', error);
            reject(new Error(`音频解码失败: ${error instanceof Error ? error.message : String(error)}`));
          }
        };
        
        fileReader.onerror = () => {
          console.error('文件读取失败');
          reject(new Error('文件读取失败'));
        };
        
        console.log('开始读取WebM文件，大小:', webmBlob.size);
        fileReader.readAsArrayBuffer(webmBlob);
      } catch (error) {
        console.error('转换初始化失败:', error);
        reject(error);
      }
    });
  };

  const audioBufferToWav = (audioBuffer: AudioBuffer): Blob => {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const numberOfChannels = audioBuffer.numberOfChannels;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);
    
    // WAV文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);
    
    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('reference_audio', audioBlob);
      formData.append('language', language);

      const response = await fetch('/api/v1/characters/transcribe-audio', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.transcribed_text) {
          onAudioText?.(result.transcribed_text);
        }
      }
    } catch (error) {
      console.error('语音识别失败:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">录制声音</Label>
        {recordingTime > 0 && (
          <span className="text-sm text-gray-500">
            {formatTime(recordingTime)}
          </span>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {isConverting && (
        <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
          🔄 正在转换音频格式...
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Mic className="w-4 h-4" />
            开始录制
          </Button>
        ) : (
          <Button
            type="button"
            onClick={stopRecording}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            停止录制
          </Button>
        )}

        {audioBlob && (
          <>
            <Button
              type="button"
              onClick={isPlaying ? stopPlaying : playRecording}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? '停止播放' : '播放'}
            </Button>

            <Button
              type="button"
              onClick={downloadRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载
            </Button>

            <Button
              type="button"
              onClick={clearRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              清除
            </Button>
          </>
        )}
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
          className="w-full"
          controls
        />
      )}

      <div className="text-xs text-gray-500">
        <p>• 请确保在安静的环境中录制</p>
        <p>• 建议录制时长在10-30秒之间</p>
        <p>• 录制完成后会自动进行语音识别</p>
      </div>
    </div>
  );
}
