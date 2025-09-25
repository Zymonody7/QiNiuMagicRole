'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface HomePageWrapperProps {
  children: ReactNode;
}

export default function HomePageWrapper({ children }: HomePageWrapperProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 如果还在加载中，不进行重定向
    if (isLoading) return;

    // 首页允许未登录用户访问，但登录后可以正常使用
    // 这里不需要重定向逻辑
  }, [isAuthenticated, isLoading, router]);

  // 如果还在加载中，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
