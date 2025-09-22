import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const popularOnly = searchParams.get('popular_only') === 'true';
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    // 构建查询参数
    const queryParams = new URLSearchParams();
    if (category) queryParams.append('category', category);
    if (search) queryParams.append('search', search);
    if (popularOnly) queryParams.append('popular_only', 'true');
    queryParams.append('limit', limit);
    queryParams.append('offset', offset);

    // 调用后端API
    const response = await fetch(`${BACKEND_URL}/api/v1/characters?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`后端API错误: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      characters: data,
      total: data.length
    });

  } catch (error) {
    console.error('Characters API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
