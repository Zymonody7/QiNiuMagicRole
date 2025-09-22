'use client';

import React, { useState } from 'react';

export default function DebugPage() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDirectBackend = async () => {
    addResult('开始测试直接访问后端...');
    try {
      const response = await fetch('http://localhost:8000/api/v1/characters/');
      addResult(`直接访问后端状态码: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`直接访问成功，获取到 ${data.length} 个角色`);
      } else {
        const errorText = await response.text();
        addResult(`直接访问失败: ${errorText}`);
      }
    } catch (error) {
      addResult(`直接访问错误: ${error.message}`);
    }
  };

  const testProxyBackend = async () => {
    addResult('开始测试代理访问后端...');
    try {
      const response = await fetch('/api/characters/');
      addResult(`代理访问状态码: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        addResult(`代理访问成功，获取到 ${data.length} 个角色`);
      } else {
        const errorText = await response.text();
        addResult(`代理访问失败: ${errorText}`);
      }
    } catch (error) {
      addResult(`代理访问错误: ${error.message}`);
    }
  };

  const testChatAPI = async () => {
    addResult('开始测试聊天API...');
    try {
      const chatData = {
        character_id: "2a86b707-3cba-4cd9-99ac-d5238f48ba2a",
        message: "你好，测试消息",
        session_id: "test_session_" + Date.now()
      };
      
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData)
      });
      
      addResult(`聊天API状态码: ${response.status}`);
      
      if (response.ok) {
        const chatResult = await response.json();
        addResult(`聊天成功！AI回复: ${chatResult.ai_message.content.substring(0, 100)}...`);
      } else {
        const errorText = await response.text();
        addResult(`聊天失败: ${errorText}`);
      }
    } catch (error) {
      addResult(`聊天API错误: ${error.message}`);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">前端后端连接调试</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">测试按钮</h2>
          <div className="space-x-4">
            <button
              onClick={testDirectBackend}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              测试直接访问后端
            </button>
            <button
              onClick={testProxyBackend}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              测试代理访问后端
            </button>
            <button
              onClick={testChatAPI}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
            >
              测试聊天API
            </button>
            <button
              onClick={clearResults}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              清空结果
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">测试结果</h2>
          <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">暂无测试结果</p>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="text-sm font-mono text-gray-800">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
