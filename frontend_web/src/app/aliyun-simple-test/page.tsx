'use client';

import { useEffect, useState } from 'react';

export default function AliyunSimpleTestPage() {
  const [userId, setUserId] = useState('test-user-123');
  const [shareToken, setShareToken] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 动态加载阿里云AICall UI脚本
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        // 检查是否已经加载
        if ((window as any).ARTCAICallUI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://g.alicdn.com/apsara-media-aui/amaui-web-aicall/1.6.2/aicall-ui.js';
        script.async = true;
        
        script.onload = () => {
          console.log('阿里云AICall UI脚本加载成功');
          setIsLoaded(true);
          resolve();
        };
        
        script.onerror = () => {
          const errorMsg = '加载阿里云AICall UI脚本失败';
          console.error(errorMsg);
          setError(errorMsg);
          reject(new Error(errorMsg));
        };

        document.head.appendChild(script);
      });
    };

    loadScript().catch(err => {
      console.error('脚本加载失败:', err);
    });
  }, []);

  const startCall = () => {
    if (!shareToken) {
      setError('请输入ShareToken');
      return;
    }

    if (!isLoaded) {
      setError('脚本尚未加载完成，请稍后再试');
      return;
    }

    try {
      setError(null);
      
      // 创建容器
      const container = document.getElementById('aicall-container');
      if (!container) {
        setError('找不到容器元素');
        return;
      }

      // 清空容器
      container.innerHTML = '';

      // 创建AICall UI实例
      const aicallUI = new (window as any).ARTCAICallUI({
        userId: userId,
        root: container,
        shareToken: shareToken,
      });

      // 渲染UI
      aicallUI.render();
      
      console.log('阿里云AICall UI启动成功');
    } catch (err) {
      const errorMsg = '启动AICall UI失败: ' + (err instanceof Error ? err.message : '未知错误');
      console.error(errorMsg, err);
      setError(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">阿里云AICall UI简单测试</h1>
        
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

            <div className="flex space-x-2">
              <button
                onClick={startCall}
                disabled={!shareToken || !isLoaded}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-4 py-2 rounded"
              >
                开始通话
              </button>
              
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${isLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                <span className="text-sm text-gray-600">
                  {isLoaded ? '脚本已加载' : '脚本加载中...'}
                </span>
              </div>
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

        {/* AICall UI容器 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">智能体通话界面</h2>
          <div 
            id="aicall-container"
            className="w-full h-96 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center"
          >
            <p className="text-gray-500">点击"开始通话"按钮启动智能体通话</p>
          </div>
        </div>

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

        {/* 代码示例 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <h3 className="text-gray-800 font-semibold mb-2">集成代码示例</h3>
          <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto">
{`<script src="https://g.alicdn.com/apsara-media-aui/amaui-web-aicall/1.6.2/aicall-ui.js"></script>
<script>
  new ARTCAICallUI({
    userId: '${userId}',
    root: document.getElementById('aicall-container'),
    shareToken: '${shareToken}',
  }).render();
</script>`}
          </pre>
        </div>
      </div>
    </div>
  );
}
