import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { appkey, token, text, format, sample_rate, voice, speed, pitch, volume } = await request.json();

    if (!appkey || !token || !text) {
      return NextResponse.json(
        { error: '缺少必要的参数' },
        { status: 400 }
      );
    }

    // 调用阿里云语音合成API
    const audioData = await callAliyunSynthesis({
      appkey,
      token,
      text,
      format: format || 'wav',
      sample_rate: sample_rate || 16000,
      voice: voice || 'xiaoyun',
      speed: speed || 1.0,
      pitch: pitch || 1.0,
      volume: volume || 50
    });

    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': audioData.length.toString()
      }
    });

  } catch (error) {
    console.error('语音合成失败:', error);
    return NextResponse.json(
      { error: '语音合成失败' },
      { status: 500 }
    );
  }
}

async function callAliyunSynthesis(params: {
  appkey: string;
  token: string;
  text: string;
  format: string;
  sample_rate: number;
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
}): Promise<Buffer> {
  // 这里应该调用阿里云的语音合成API
  // 为了简化，这里返回一个模拟的音频数据
  // 在实际项目中，您需要调用阿里云的语音合成服务
  
  const synthesisUrl = 'https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts';
  
  const requestData = {
    appkey: params.appkey,
    token: params.token,
    text: params.text,
    format: params.format,
    sample_rate: params.sample_rate,
    voice: params.voice,
    speed: params.speed,
    pitch: params.pitch,
    volume: params.volume
  };

  try {
    const response = await fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`阿里云语音合成API调用失败: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error('调用阿里云语音合成API失败:', error);
    throw error;
  }
}
