/**
 * 阿里云智能语音交互服务
 * 基于WebSocket的实时语音识别和语音合成
 */

export interface AliyunVoiceConfig {
  appKey: string;
  accessKeyId: string;
  accessKeySecret: string;
  region?: string;
}

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

export class AliyunVoiceService {
  private config: AliyunVoiceConfig;
  private recognitionWebSocket: WebSocket | null = null;
  private synthesisWebSocket: WebSocket | null = null;
  private isConnected = false;
  private token: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(config: AliyunVoiceConfig) {
    this.config = {
      region: 'cn-shanghai',
      ...config
    };
  }

  /**
   * 获取访问令牌
   */
  private async getToken(): Promise<string> {
    // 如果token未过期，直接返回
    if (this.token && Date.now() < this.tokenExpireTime) {
      return this.token;
    }

    try {
      // 这里应该调用后端API获取token，避免在前端暴露AccessKey
      const response = await fetch('/api/aliyun/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKeyId: this.config.accessKeyId,
          accessKeySecret: this.config.accessKeySecret,
          region: this.config.region
        })
      });

      if (!response.ok) {
        throw new Error('获取token失败');
      }

      const data = await response.json();
      this.token = data.token;
      this.tokenExpireTime = Date.now() + (data.expireTime - 60) * 1000; // 提前1分钟过期
      
      return this.token;
    } catch (error) {
      console.error('获取阿里云token失败:', error);
      throw new Error('无法获取访问令牌');
    }
  }

  /**
   * 建立语音识别WebSocket连接
   */
  async connectRecognition(): Promise<void> {
    if (this.recognitionWebSocket && this.recognitionWebSocket.readyState === WebSocket.OPEN) {
      return;
    }

    // 检查配置是否有效
    if (!this.config.appKey || !this.config.accessKeyId || 
        this.config.appKey === 'your_app_key_here' || 
        this.config.accessKeyId === 'your_access_key_id_here' ||
        this.config.appKey.length < 10 ||
        this.config.accessKeyId.length < 10) {
      throw new Error('阿里云配置无效，请使用模拟服务');
    }

    try {
      const token = await this.getToken();
      
      // 阿里云语音识别WebSocket URL格式
      const wsUrl = `wss://nls-gateway-${this.config.region}.aliyuncs.com/ws/v1`;
      
      console.log('正在连接阿里云语音识别服务:', wsUrl);
      
      this.recognitionWebSocket = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('连接超时'));
        }, 10000); // 10秒超时

        this.recognitionWebSocket!.onopen = () => {
          console.log('阿里云语音识别连接已建立');
          clearTimeout(timeout);
          
          // 发送鉴权请求
          const authRequest = {
            header: {
              appkey: this.config.appKey,
              token: token,
              message_id: this.generateMessageId(),
              namespace: 'SpeechRecognizer',
              name: 'StartRecognition'
            },
            payload: {
              format: 'pcm',
              sample_rate: 16000,
              enable_intermediate_result: true,
              enable_punctuation_prediction: true,
              enable_inverse_text_normalization: true
            }
          };
          
          console.log('发送鉴权请求:', authRequest);
          this.recognitionWebSocket?.send(JSON.stringify(authRequest));
          this.isConnected = true;
          resolve();
        };

        this.recognitionWebSocket!.onerror = (error) => {
          console.error('阿里云语音识别连接错误:', error);
          clearTimeout(timeout);
          this.isConnected = false;
          reject(new Error('WebSocket连接失败'));
        };

        this.recognitionWebSocket!.onclose = (event) => {
          console.log('阿里云语音识别连接已关闭:', event.code, event.reason);
          clearTimeout(timeout);
          this.isConnected = false;
          if (event.code !== 1000) { // 非正常关闭
            reject(new Error(`连接关闭: ${event.code} ${event.reason}`));
          }
        };

        this.recognitionWebSocket!.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('收到阿里云响应:', data);
            
            if (data.header && data.header.status === 20000000) {
              console.log('阿里云语音识别鉴权成功');
            } else if (data.header && data.header.status !== 20000000) {
              console.error('阿里云鉴权失败:', data.header.status_text);
            }
          } catch (error) {
            console.error('解析阿里云响应失败:', error);
          }
        };
      });

    } catch (error) {
      console.error('建立语音识别连接失败:', error);
      throw error;
    }
  }

  /**
   * 开始实时语音识别
   */
  async startRecognition(
    onResult: (result: VoiceRecognitionResult) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (!this.recognitionWebSocket) {
      await this.connectRecognition();
    }

    if (!this.recognitionWebSocket) {
      throw new Error('语音识别连接未建立');
    }

    // 设置消息处理
    this.recognitionWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.header && data.header.status === 20000000) {
          // 鉴权成功
          console.log('阿里云语音识别鉴权成功');
        } else if (data.header && data.header.status === 20000001) {
          // 识别结果
          const result: VoiceRecognitionResult = {
            text: data.payload?.result || '',
            isFinal: data.payload?.index === data.payload?.total,
            confidence: data.payload?.confidence
          };
          onResult(result);
        } else if (data.header && data.header.status !== 20000000) {
          // 错误处理
          const errorMsg = `语音识别错误: ${data.header.status_text || '未知错误'}`;
          console.error(errorMsg);
          onError?.(errorMsg);
        }
      } catch (error) {
        console.error('解析语音识别结果失败:', error);
        onError?.('解析识别结果失败');
      }
    };
  }

  /**
   * 发送音频数据
   */
  sendAudioData(audioData: ArrayBuffer): void {
    if (this.recognitionWebSocket && this.recognitionWebSocket.readyState === WebSocket.OPEN) {
      this.recognitionWebSocket.send(audioData);
    }
  }

  /**
   * 停止语音识别
   */
  stopRecognition(): void {
    if (this.recognitionWebSocket) {
      // 发送停止识别请求
      const stopRequest = {
        header: {
          message_id: this.generateMessageId(),
          namespace: 'SpeechRecognizer',
          name: 'StopRecognition'
        }
      };
      this.recognitionWebSocket.send(JSON.stringify(stopRequest));
    }
  }

  /**
   * 关闭语音识别连接
   */
  closeRecognition(): void {
    if (this.recognitionWebSocket) {
      this.recognitionWebSocket.close();
      this.recognitionWebSocket = null;
      this.isConnected = false;
    }
  }

  /**
   * 语音合成
   */
  async synthesizeSpeech(
    text: string, 
    options: VoiceSynthesisOptions = {}
  ): Promise<Blob> {
    try {
      const token = await this.getToken();
      
      const requestData = {
        appkey: this.config.appKey,
        token: token,
        text: text,
        format: 'wav',
        sample_rate: 16000,
        voice: options.voice || 'xiaoyun',
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 50
      };

      const response = await fetch('/api/aliyun/synthesis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('语音合成失败');
      }

      const audioBlob = await response.blob();
      return audioBlob;
    } catch (error) {
      console.error('语音合成失败:', error);
      throw error;
    }
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 检查连接状态
   */
  isRecognitionConnected(): boolean {
    return this.recognitionWebSocket?.readyState === WebSocket.OPEN;
  }
}

// 创建默认实例
const aliyunConfig = {
  appKey: process.env.NEXT_PUBLIC_ALIYUN_APP_KEY || '',
  accessKeyId: process.env.NEXT_PUBLIC_ALIYUN_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.NEXT_PUBLIC_ALIYUN_ACCESS_KEY_SECRET || '',
  region: process.env.NEXT_PUBLIC_ALIYUN_REGION || 'cn-shanghai'
};

// 检查配置是否有效
const hasValidConfig = aliyunConfig.appKey && 
                      aliyunConfig.accessKeyId && 
                      aliyunConfig.appKey !== 'your_app_key_here' && 
                      aliyunConfig.accessKeyId !== 'your_access_key_id_here' &&
                      aliyunConfig.appKey.length > 10 &&
                      aliyunConfig.accessKeyId.length > 10;

console.log('阿里云配置检查:', {
  hasAppKey: !!aliyunConfig.appKey,
  hasAccessKeyId: !!aliyunConfig.accessKeyId,
  appKey: aliyunConfig.appKey,
  accessKeyId: aliyunConfig.accessKeyId,
  hasValidConfig
});

export const aliyunVoiceService = new AliyunVoiceService(aliyunConfig);
