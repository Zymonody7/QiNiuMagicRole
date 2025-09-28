/**
 * 阿里云AICall UI组件
 * 基于官方文档: https://www.alibabacloud.com/help/zh/ims/user-guide/quickly-integrate-ai-agents
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface AliyunAICallUIProps {
  userId: string;
  shareToken: string;
  onCallBegin?: () => void;
  onCallEnd?: () => void;
  onError?: (error: string) => void;
}

export default function AliyunAICallUI({ 
  userId, 
  shareToken, 
  onCallBegin, 
  onCallEnd, 
  onError 
}: AliyunAICallUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 动态加载阿里云AICall UI脚本
    const loadAICallScript = async () => {
      try {
        // 检查是否已经加载
        if (window.ARTCAICallUI) {
          setIsLoaded(true);
          return;
        }

        // 动态加载脚本
        const script = document.createElement('script');
        script.src = 'https://g.alicdn.com/apsara-media-aui/amaui-web-aicall/1.6.2/aicall-ui.js';
        script.async = true;
        
        script.onload = () => {
          console.log('阿里云AICall UI脚本加载成功');
          setIsLoaded(true);
        };
        
        script.onerror = () => {
          const errorMsg = '加载阿里云AICall UI脚本失败';
          console.error(errorMsg);
          setError(errorMsg);
          onError?.(errorMsg);
        };

        document.head.appendChild(script);
      } catch (err) {
        const errorMsg = '初始化阿里云AICall UI失败';
        console.error(errorMsg, err);
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    loadAICallScript();
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !shareToken) {
      return;
    }

    try {
      console.log('初始化阿里云AICall UI:', { userId, shareToken });
      
      // 创建AICall UI实例
      const aicallUI = new (window as any).ARTCAICallUI({
        userId: userId,
        root: containerRef.current,
        shareToken: shareToken,
        onCallBegin: () => {
          console.log('通话开始');
          onCallBegin?.();
        },
        onCallEnd: () => {
          console.log('通话结束');
          onCallEnd?.();
        },
        onError: (error: any) => {
          console.error('AICall UI错误:', error);
          onError?.(error.message || '通话发生错误');
        }
      });

      // 渲染UI
      aicallUI.render();
      
      console.log('阿里云AICall UI渲染成功');
    } catch (err) {
      const errorMsg = '渲染阿里云AICall UI失败';
      console.error(errorMsg, err);
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [isLoaded, userId, shareToken, onCallBegin, onCallEnd, onError]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">加载失败</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-blue-600">加载阿里云AICall UI中...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] bg-gray-100 rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
}
