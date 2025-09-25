'use client';

import { useState } from 'react';

export default function TestWebSocketPage() {
  const [status, setStatus] = useState('未连接');
  const [messages, setMessages] = useState<string[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = () => {
    try {
      const websocket = new WebSocket('ws://localhost:8000/ws/voice-chat');
      
      websocket.onopen = () => {
        setStatus('已连接');
        setMessages(prev => [...prev, 'WebSocket连接已建立']);
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, `收到消息: ${JSON.stringify(data)}`]);
      };
      
      websocket.onerror = (error) => {
        setStatus('连接错误');
        setMessages(prev => [...prev, `错误: ${error}`]);
      };
      
      websocket.onclose = () => {
        setStatus('连接已关闭');
        setMessages(prev => [...prev, 'WebSocket连接已关闭']);
      };
      
      setWs(websocket);
    } catch (error) {
      setStatus('连接失败');
      setMessages(prev => [...prev, `连接失败: ${error}`]);
    }
  };

  const disconnectWebSocket = () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  const sendTestMessage = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'init',
        characterId: 'test-character',
        characterName: '测试角色'
      };
      ws.send(JSON.stringify(message));
      setMessages(prev => [...prev, `发送消息: ${JSON.stringify(message)}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">WebSocket测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">连接状态</h2>
          <p className="text-lg mb-4">状态: <span className={`font-bold ${status === '已连接' ? 'text-green-600' : 'text-red-600'}`}>{status}</span></p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={connectWebSocket}
              disabled={ws?.readyState === WebSocket.OPEN}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              连接WebSocket
            </button>
            
            <button
              onClick={disconnectWebSocket}
              disabled={!ws || ws.readyState === WebSocket.CLOSED}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
            >
              断开连接
            </button>
            
            <button
              onClick={sendTestMessage}
              disabled={!ws || ws.readyState !== WebSocket.OPEN}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              发送测试消息
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">消息日志</h2>
          <div className="bg-gray-50 rounded p-4 h-64 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-gray-500">暂无消息</p>
            ) : (
              messages.map((message, index) => (
                <div key={index} className="mb-2 text-sm">
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
