'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import OCRUpload from '@/components/OCRUpload';

export default function OCRTestPage() {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTextRecognized = (text: string) => {
    setRecognizedText(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg p-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            OCR文字识别测试
          </h1>
          
          <div className="space-y-6">
            {/* OCR上传组件 */}
            <div className="flex justify-center">
              <OCRUpload
                onTextRecognized={handleTextRecognized}
                disabled={isLoading}
              />
            </div>
            
            {/* 识别结果显示 */}
            {recognizedText && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-lg p-4"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  识别结果：
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                    {recognizedText}
                  </pre>
                </div>
              </motion.div>
            )}
            
            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                使用说明：
              </h3>
              <ul className="text-blue-700 space-y-1 text-sm">
                <li>• 支持上传图片文件（JPG、PNG、GIF等）和PDF文档</li>
                <li>• 文件大小限制：10MB</li>
                <li>• 识别完成后，文字内容会自动填入聊天输入框</li>
                <li>• 支持批量上传和识别</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
