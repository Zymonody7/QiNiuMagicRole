'use client';

import React from 'react';
import { FileText, Mic, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ButtonStyleTest() {
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">按钮样式对比测试</h1>
      
      <div className="flex gap-4 items-center">
        {/* OCR按钮 */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600"
          style={{
            minWidth: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="OCR文字识别"
        >
          <FileText className="w-5 h-5" />
        </motion.button>
        
        {/* 语音按钮 */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600"
          style={{
            minWidth: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="语音录制"
        >
          <Mic className="w-5 h-5" />
        </motion.button>
        
        {/* 发送按钮 */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl transition-all duration-200 bg-primary-500 text-white hover:bg-primary-600"
          style={{
            minWidth: '48px',
            minHeight: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="发送消息"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>
      
      <div className="mt-8 p-4 bg-white rounded-lg">
        <h2 className="text-lg font-semibold mb-2">样式规范</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 内边距: p-3</li>
          <li>• 圆角: rounded-xl</li>
          <li>• 背景色: bg-primary-500</li>
          <li>• 文字色: text-white</li>
          <li>• 悬停色: hover:bg-primary-600</li>
          <li>• 动画: transition-all duration-200</li>
          <li>• 图标尺寸: w-5 h-5</li>
        </ul>
      </div>
    </div>
  );
}
