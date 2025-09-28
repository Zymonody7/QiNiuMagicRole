/**
 * 模拟语音识别服务
 * 用于测试和开发环境
 */

export interface VoiceRecognitionResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface VoiceSynthesisOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export class MockVoiceService {
  private isConnected = false;
  private isRecording = false;
  private recognitionCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrame: number | null = null;

  /**
   * 连接语音服务
   */
  async connectRecognition(): Promise<void> {
    console.log('模拟语音服务连接中...');
    
    // 模拟连接延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.isConnected = true;
    console.log('模拟语音服务连接成功');
  }

  /**
   * 开始语音识别
   */
  async startRecognition(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('语音服务未连接');
    }

    this.recognitionCallback = onResult;
    this.errorCallback = onError;

    try {
      // 获取麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 创建音频上下文
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);

      // 创建MediaRecorder
      const options = { mimeType: 'audio/webm;codecs=opus' };
      this.mediaRecorder = new MediaRecorder(stream, options);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // 模拟语音识别处理
          this.simulateRecognition();
        }
      };

      this.mediaRecorder.start(100); // 每100ms发送一次数据
      this.isRecording = true;

      // 开始音频级别监控
      this.startAudioLevelMonitoring();

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '启动录音失败';
      this.errorCallback?.(errorMsg);
      throw error;
    }
  }

  /**
   * 发送音频数据
   */
  sendAudioData(audioData: ArrayBuffer): void {
    // 模拟音频数据处理
    console.log('模拟处理音频数据:', audioData.byteLength, 'bytes');
  }

  /**
   * 停止语音识别
   */
  stopRecognition(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * 关闭连接
   */
  closeRecognition(): void {
    this.stopRecognition();
    this.isConnected = false;
    this.recognitionCallback = null;
    this.errorCallback = null;
  }

  /**
   * 语音合成
   */
  async synthesizeSpeech(
    text: string, 
    options: VoiceSynthesisOptions = {}
  ): Promise<Blob> {
    console.log('模拟语音合成:', text, options);
    
    // 模拟合成延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 创建一个简单的音频Blob（实际应用中这里应该是真实的语音合成）
    const audioData = new ArrayBuffer(1024);
    return new Blob([audioData], { type: 'audio/wav' });
  }

  /**
   * 检查连接状态
   */
  isRecognitionConnected(): boolean {
    return this.isConnected;
  }

  /**
   * 模拟语音识别
   */
  private simulateRecognition(): void {
    // 模拟识别延迟
    setTimeout(() => {
      const mockResults = [
        '你好',
        '你好，我是',
        '你好，我是小明',
        '你好，我是小明，很高兴认识你',
        '你好，我是小明，很高兴认识你！'
      ];

      let index = 0;
      const interval = setInterval(() => {
        if (index < mockResults.length) {
          const result: VoiceRecognitionResult = {
            text: mockResults[index],
            isFinal: index === mockResults.length - 1,
            confidence: 0.9
          };
          
          this.recognitionCallback?.(result);
          index++;
        } else {
          clearInterval(interval);
        }
      }, 500);
    }, 2000);
  }

  /**
   * 开始音频级别监控
   */
  private startAudioLevelMonitoring(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    const updateLevel = () => {
      if (this.analyser && this.isRecording) {
        this.analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        console.log('音频级别:', average);
        this.animationFrame = requestAnimationFrame(updateLevel);
      }
    };
    
    updateLevel();
  }
}

// 创建默认实例
export const mockVoiceService = new MockVoiceService();
