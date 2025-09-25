'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 不需要认证的页面路径
  const publicPaths = ['/auth', '/'];
  
  // 检查当前路径是否为公开路径
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // 如果还在加载中，不进行重定向
    if (isLoading) return;

    // 如果需要认证但用户未登录
    if (requireAuth && !isAuthenticated && !isPublicPath) {
      console.log('用户未登录，重定向到登录页面');
      router.push('/auth');
      return;
    }

    // 如果用户已登录但访问登录页面，重定向到首页
    if (isAuthenticated && pathname === '/auth') {
      console.log('用户已登录，重定向到首页');
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, requireAuth, router]);

  // 如果还在加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600">正在验证身份...</p>
        </div>
      </div>
    );
  }

  // 如果需要认证但用户未登录且不是公开路径，不渲染内容
  if (requireAuth && !isAuthenticated && !isPublicPath) {
    return null;
  }

  // 如果用户已登录但访问登录页面，不渲染内容
  if (isAuthenticated && pathname === '/auth') {
    return null;
  }

  return <>{children}</>;
}
