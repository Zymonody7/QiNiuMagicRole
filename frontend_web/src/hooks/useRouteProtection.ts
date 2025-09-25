'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface UseRouteProtectionOptions {
  requireAuth?: boolean;
  redirectTo?: string;
}

export function useRouteProtection(options: UseRouteProtectionOptions = {}) {
  const { requireAuth = true, redirectTo = '/auth' } = options;
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // 公开路径，不需要认证
  const publicPaths = ['/auth', '/'];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // 如果还在加载中，不进行重定向
    if (isLoading) return;

    // 如果需要认证但用户未登录且不是公开路径
    if (requireAuth && !isAuthenticated && !isPublicPath) {
      console.log('用户未登录，重定向到登录页面');
      router.push(redirectTo);
      return;
    }

    // 如果用户已登录但访问登录页面，重定向到首页
    if (isAuthenticated && pathname === '/auth') {
      console.log('用户已登录，重定向到首页');
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, requireAuth, redirectTo, router]);

  return {
    isAuthenticated,
    isLoading,
    isPublicPath,
    shouldRedirect: requireAuth && !isAuthenticated && !isPublicPath,
  };
}
