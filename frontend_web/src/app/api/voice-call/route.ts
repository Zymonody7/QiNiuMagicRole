import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const characterId = formData.get('characterId') as string;
    const language = formData.get('language') as string || 'zh-CN';

    if (!audioFile || !characterId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 构建FormData发送到后端
    const backendFormData = new FormData();
    backendFormData.append('audio_file', audioFile);
    backendFormData.append('character_id', characterId);
    backendFormData.append('language', language);

    // 调用后端语音处理API
    const response = await fetch(`${BACKEND_URL}/api/v1/voice/process-voice-message`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '语音处理错误' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      recognizedText: data.recognized_text,
      characterId: data.character_id,
      language: data.language,
      message: data.message
    });

  } catch (error) {
    console.error('Voice API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const characterId = searchParams.get('characterId');
    const language = searchParams.get('language') || 'zh';
    const speed = searchParams.get('speed') || '1.0';

    if (!text || !characterId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 构建查询参数
    const queryParams = new URLSearchParams();
    queryParams.append('text', text);
    queryParams.append('character_id', characterId);
    queryParams.append('language', language);
    queryParams.append('speed', speed);

    // 调用后端TTS API
    const response = await fetch(`${BACKEND_URL}/api/v1/voice/text-to-speech?${queryParams}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '语音合成错误' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      audioUrl: data.audio_url,
      text: data.text,
      characterId: data.character_id
    });

  } catch (error) {
    console.error('Voice API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}