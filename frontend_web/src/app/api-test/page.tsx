'use client';

import { useState, useEffect } from 'react';

export default function ApiTestPage() {
  const [status, setStatus] = useState('未测试');
  const [results, setResults] = useState<any[]>([]);

  const testEndpoints = [
    { name: '后端健康检查', url: '/api/health' },
    { name: '存储配置', url: '/api/storage/config' },
    { name: '角色列表', url: '/api/characters' },
  ];

  const testEndpoint = async (endpoint: { name: string; url: string }) => {
    try {
      setStatus(`测试 ${endpoint.name}...`);
      
      const response = await fetch(endpoint.url);
      const data = await response.json();
      
      setResults(prev => [...prev, {
        name: endpoint.name,
        url: endpoint.url,
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setStatus(`${endpoint.name} 测试完成`);
    } catch (error) {
      setResults(prev => [...prev, {
        name: endpoint.name,
        url: endpoint.url,
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      }]);
      
      setStatus(`${endpoint.name} 测试失败`);
    }
  };

  const testAllEndpoints = async () => {
    setResults([]);
    setStatus('开始测试所有端点...');
    
    for (const endpoint of testEndpoints) {
      await testEndpoint(endpoint);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
    }
    
    setStatus('所有测试完成');
  };

  const clearResults = () => {
    setResults([]);
    setStatus('未测试');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API连接测试</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试控制</h2>
          <div className="flex gap-4 mb-4">
            <button
              onClick={testAllEndpoints}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              测试所有端点
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              清除结果
            </button>
          </div>
          <p className="text-sm text-gray-600">状态: {status}</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">测试结果</h2>
          
          {results.length === 0 ? (
            <p className="text-gray-500">暂无测试结果</p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{result.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? '成功' : '失败'}
                      </span>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>URL:</strong> {result.url}
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>状态码:</strong> {result.status}
                  </div>
                  
                  {result.error ? (
                    <div className="text-sm text-red-600">
                      <strong>错误:</strong> {result.error}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      <strong>响应:</strong> 
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2">说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 前端运行在: http://localhost:3000</li>
            <li>• 后端运行在: http://localhost:8000</li>
            <li>• Next.js代理配置: /api/* → http://localhost:8000/api/v1/*</li>
            <li>• 如果测试失败，请检查后端服务是否启动</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
