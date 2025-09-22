import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { characterId, message, sessionId, userId, audioUrl } = await request.json();

    if (!characterId || !message) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 调用后端聊天API
    const response = await fetch(`${BACKEND_URL}/api/v1/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character_id: characterId,
        message: message,
        user_id: userId,
        session_id: sessionId,
        audio_url: audioUrl
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || '聊天服务错误' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      response: data.ai_message.content,
      characterId: data.character_id,
      sessionId: data.session_id,
      timestamp: new Date().toISOString(),
      aiMessage: data.ai_message,
      userMessage: data.user_message
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
