import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 不需要认证的页面路径
const publicPaths = ['/auth', '/'];

// 需要认证的页面路径
const protectedPaths = ['/chat', '/character-management', '/character-config'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 检查是否为公开路径
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path));
  
  // 检查是否为受保护路径
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  // 如果是受保护路径，检查是否有认证token
  if (isProtectedPath) {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      // 没有token，重定向到登录页面
      const loginUrl = new URL('/auth', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // 如果用户访问登录页面但已经有token，重定向到首页
  if (pathname === '/auth') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
