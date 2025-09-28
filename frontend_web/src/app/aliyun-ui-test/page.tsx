'use client';

import { useState } from 'react';
import AliyunAICallUI from '@/components/AliyunAICallUI';

export default function AliyunUITestPage() {
  const [userId, setUserId] = useState('test-user-123');
  const [shareToken, setShareToken] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCallBegin = () => {
    console.log('通话开始');
    setIsCallActive(true);
  };

  const handleCallEnd = () => {
    console.log('通话结束');
    setIsCallActive(false);
  };

  const handleError = (errorMsg: string) => {
    console.error('AICall UI错误:', errorMsg);
    setError(errorMsg);
  };

  const startCall = () => {
    if (!shareToken) {
      setError('请输入ShareToken');
      return;
    }
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">阿里云AICall UI测试</h1>
        
        {/* 配置区域 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">配置参数</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="请输入用户ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ShareToken
              </label>
              <input
                type="text"
                value={shareToken}
                onChange={(e) => setShareToken(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="请输入从控制台获取的ShareToken"
              />
              <p className="text-sm text-gray-500 mt-1">
                请从阿里云控制台智能体管理页面获取体验Token
              </p>
            </div>

            <button
              onClick={startCall}
              disabled={!shareToken}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded"
            >
              开始通话
            </button>
          </div>
        </div>

        {/* 状态显示 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">状态信息</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">通话状态</p>
              <p className={isCallActive ? 'text-green-600' : 'text-gray-600'}>
                {isCallActive ? '通话中' : '未通话'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">用户ID</p>
              <p className="text-gray-800">{userId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ShareToken</p>
              <p className="text-gray-800">{shareToken ? '已配置' : '未配置'}</p>
            </div>
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">错误信息</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* AICall UI */}
        {shareToken && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">智能体通话界面</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <AliyunAICallUI
                userId={userId}
                shareToken={shareToken}
                onCallBegin={handleCallBegin}
                onCallEnd={handleCallEnd}
                onError={handleError}
              />
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="text-blue-800 font-semibold mb-2">使用说明</h3>
          <div className="text-sm text-blue-700 space-y-2">
            <p>1. 登录阿里云控制台，进入智能媒体服务</p>
            <p>2. 选择智能体管理，找到要测试的智能体</p>
            <p>3. 点击"Demo体验二维码"按钮</p>
            <p>4. 选择二维码过期时间，生成体验Token</p>
            <p>5. 将Token复制到上面的输入框中</p>
            <p>6. 点击"开始通话"按钮</p>
            <p className="text-red-600 font-semibold">
              注意：该方案仅供测试效果使用，不建议进行正式发布
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
