'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Image, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OCRUploadProps {
  onTextRecognized: (text: string) => void;
  disabled?: boolean;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'pdf';
}

export default function OCRUpload({ onTextRecognized, disabled = false }: OCRUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      // 检查文件类型
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';
      
      if (!isImage && !isPDF) {
        setError('只支持图片和PDF文件');
        return;
      }

      // 检查文件大小 (10MB限制)
      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }

      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let preview = '';
      if (isImage) {
        preview = URL.createObjectURL(file);
      } else if (isPDF) {
        preview = '/pdf-icon.svg'; // 使用默认PDF图标
      }

      newFiles.push({
        id: fileId,
        file,
        preview,
        type: isImage ? 'image' : 'pdf'
      });
    });

    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [disabled, handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file && file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const uploadToServer = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    // 使用Next.js代理，直接调用相对路径
    const response = await fetch(`/api/storage/upload?use_qiniu=true`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '文件上传失败');
    }

    const result = await response.json();
    return result.data.url;
  };

  const recognizeText = async (imageUrl: string): Promise<string> => {
    const { apiService } = await import('@/services/apiService');
    const result = await apiService.recognizeText(imageUrl);
    
    if (!result.success) {
      throw new Error(result.message || 'OCR识别失败');
    }
    
    return result.text;
  };

  const processFile = async (uploadedFile: UploadedFile) => {
    try {
      setProcessingFile(uploadedFile.id);
      setIsProcessing(true);
      setError(null);

      // 上传文件到服务器
      const imageUrl = await uploadToServer(uploadedFile.file);
      
      // 调用OCR识别
      const recognizedText = await recognizeText(imageUrl);
      
      if (recognizedText.trim()) {
        onTextRecognized(recognizedText);
        // 处理成功后移除文件
        removeFile(uploadedFile.id);
      } else {
        setError('未识别到文字内容');
      }
    } catch (err) {
      console.error('OCR处理失败:', err);
      setError(err instanceof Error ? err.message : 'OCR处理失败');
    } finally {
      setIsProcessing(false);
      setProcessingFile(null);
    }
  };

  const processAllFiles = async () => {
    if (uploadedFiles.length === 0) return;

    for (const file of uploadedFiles) {
      await processFile(file);
    }
  };

  const clearAllFiles = () => {
    uploadedFiles.forEach(file => {
      if (file.preview && file.preview.startsWith('blob:')) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setUploadedFiles([]);
    setError(null);
  };

  return (
    <>
      {/* 触发按钮 */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`p-3 rounded-xl transition-all duration-200 ${
          disabled 
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
            : 'bg-primary-500 text-white hover:bg-primary-600'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
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

      {/* 上传区域 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          >
            <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">OCR文字识别</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* 拖拽上传区域 */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  disabled
                    ? 'border-gray-200 bg-gray-50'
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={disabled}
                />
                
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-blue-500 mx-auto" />
                  <p className="text-sm text-gray-600">
                    拖拽文件到此处或
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled}
                      className="text-blue-600 hover:text-blue-700 underline ml-1"
                    >
                      点击选择
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    支持图片和PDF，最大10MB
                  </p>
                </div>
              </div>

              {/* 已上传文件列表 */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      已选择 {uploadedFiles.length} 个文件
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={processAllFiles}
                        disabled={isProcessing}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isProcessing ? '处理中...' : '全部识别'}
                      </button>
                      <button
                        onClick={clearAllFiles}
                        disabled={isProcessing}
                        className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <div className="flex-shrink-0">
                          {file.type === 'image' ? (
                            <Image className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">
                            {file.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {processingFile === file.id && (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          )}
                          <button
                            onClick={() => processFile(file)}
                            disabled={isProcessing}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"
                            title="识别此文件"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeFile(file.id)}
                            disabled={isProcessing}
                            className="p-1 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
                            title="删除此文件"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700">{error}</span>
                </motion.div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
