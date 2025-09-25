'use client';

import { useRouteProtection } from '@/hooks/useRouteProtection';
import { ComponentType } from 'react';

interface WithAuthOptions {
  redirectTo?: string;
  requireAuth?: boolean;
}

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = '/auth', requireAuth = true } = options;

  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, shouldRedirect } = useRouteProtection({
      requireAuth,
      redirectTo,
    });

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

    if (shouldRedirect) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
