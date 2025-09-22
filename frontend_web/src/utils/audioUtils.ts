/**
 * 音频处理工具类
 * 提供音频录制、播放、格式转换等功能
 */

export class AudioUtils {
  /**
   * 检查浏览器是否支持音频录制
   */
  static isRecordingSupported(): boolean {
    return typeof window !== 'undefined' && 
           'MediaRecorder' in window && 
           'getUserMedia' in navigator.mediaDevices;
  }

  /**
   * 检查浏览器是否支持音频播放
   */
  static isPlaybackSupported(): boolean {
    return typeof window !== 'undefined' && 'Audio' in window;
  }

  /**
   * 获取支持的音频格式
   */
  static getSupportedAudioTypes(): string[] {
    const types = [];
    
    if (typeof window !== 'undefined') {
      const audio = new Audio();
      
      if (audio.canPlayType('audio/wav')) types.push('audio/wav');
      if (audio.canPlayType('audio/mp3')) types.push('audio/mp3');
      if (audio.canPlayType('audio/mpeg')) types.push('audio/mpeg');
      if (audio.canPlayType('audio/mp4')) types.push('audio/mp4');
      if (audio.canPlayType('audio/ogg')) types.push('audio/ogg');
      if (audio.canPlayType('audio/webm')) types.push('audio/webm');
    }
    
    return types;
  }

  /**
   * 格式化音频时长
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证音频文件
   */
  static validateAudioFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const supportedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm'];
    
    if (file.size > maxSize) {
      return { valid: false, error: '文件大小不能超过50MB' };
    }
    
    if (!supportedTypes.includes(file.type)) {
      return { valid: false, error: '不支持的音频格式' };
    }
    
    return { valid: true };
  }

  /**
   * 创建音频播放器
   */
  static createAudioPlayer(audioUrl: string): HTMLAudioElement {
    const audio = new Audio(audioUrl);
    audio.preload = 'auto';
    return audio;
  }

  /**
   * 播放音频
   */
  static async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = this.createAudioPlayer(audioUrl);
      
      audio.oncanplaythrough = () => {
        audio.play().then(resolve).catch(reject);
      };
      
      audio.onerror = () => {
        reject(new Error('音频播放失败'));
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    });
  }

  /**
   * 停止音频播放
   */
  static stopAudio(audio: HTMLAudioElement): void {
    audio.pause();
    audio.currentTime = 0;
  }

  /**
   * 获取音频波形数据（简化版）
   */
  static async getAudioWaveform(audioBlob: Blob): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // 简化的波形数据提取
          const channelData = audioBuffer.getChannelData(0);
          const samples = 100; // 采样点数
          const blockSize = Math.floor(channelData.length / samples);
          const waveform: number[] = [];
          
          for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channelData[i * blockSize + j]);
            }
            waveform.push(sum / blockSize);
          }
          
          resolve(waveform);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * 压缩音频文件
   */
  static async compressAudio(audioBlob: Blob, quality: number = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // 这里可以实现音频压缩逻辑
          // 简化处理，直接返回原文件
          resolve(audioBlob);
        } catch (error) {
          reject(error);
        }
      };
      
      fileReader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * 合并多个音频文件
   */
  static async mergeAudioFiles(audioBlobs: Blob[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const promises = audioBlobs.map(blob => 
        new Promise<AudioBuffer>((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.onload = async (e) => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
              resolve(audioBuffer);
            } catch (error) {
              reject(error);
            }
          };
          fileReader.onerror = () => reject(new Error('文件读取失败'));
          fileReader.readAsArrayBuffer(blob);
        })
      );
      
      Promise.all(promises)
        .then(audioBuffers => {
          // 这里可以实现音频合并逻辑
          // 简化处理，返回第一个文件
          resolve(audioBlobs[0]);
        })
        .catch(reject);
    });
  }
}
