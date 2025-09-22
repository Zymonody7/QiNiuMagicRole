'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAuthPage() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">认证测试页面</h1>
        
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">✓</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">已登录</h2>
              <p className="text-gray-600">欢迎，{user?.username}！</p>
            </div>
            
            <div className="space-y-2">
              <p><strong>用户ID:</strong> {user?.id}</p>
              <p><strong>用户名:</strong> {user?.username}</p>
              <p><strong>邮箱:</strong> {user?.email}</p>
              <p><strong>状态:</strong> {user?.isActive ? '活跃' : '非活跃'}</p>
              <p><strong>会员:</strong> {user?.isPremium ? '高级会员' : '普通用户'}</p>
            </div>
            
            <button
              onClick={logout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-600 text-2xl">👤</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">未登录</h2>
              <p className="text-gray-600">请先登录或注册</p>
            </div>
            
            <div className="space-y-3">
              <Link
                href="/auth"
                className="block w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
              >
                去登录/注册
              </Link>
              
              <Link
                href="/"
                className="block w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-center"
              >
                返回首页
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
