'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Camera, Trash2, User, Crop } from 'lucide-react';
import AvatarCropper from './AvatarCropper';

interface AvatarUploadProps {
  avatar?: string;
  onAvatarChange: (file: File | null) => void;
  className?: string;
}

export default function AvatarUpload({ avatar, onAvatarChange, className = "" }: AvatarUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // 验证图片文件
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片文件大小不能超过5MB');
      return;
    }
    
    // 显示裁剪器
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setShowCropper(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const removeAvatar = () => {
    onAvatarChange(null);
  };

  const handleCrop = (croppedImageUrl: string) => {
    // 将裁剪后的图片转换为File对象
    fetch(croppedImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'avatar.png', { type: 'image/png' });
        onAvatarChange(file);
        setShowCropper(false);
        URL.revokeObjectURL(tempImageUrl);
      });
  };

  const handleCancelCrop = () => {
    setShowCropper(false);
    URL.revokeObjectURL(tempImageUrl);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 头像预览 */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200 flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt="角色头像"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-gray-400" />
            )}
          </div>
          
          {avatar && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={removeAvatar}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>

      {/* 上传区域 */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        
        <div className="space-y-3">
          <div className="flex justify-center">
            {isDragging ? (
              <Camera className="w-8 h-8 text-primary-500" />
            ) : (
              <Image className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? '松开鼠标上传' : '拖拽图片到此处'}
            </p>
            <p className="text-xs text-gray-500 mt-1">或</p>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm flex items-center gap-2"
          >
            <Crop className="w-4 h-4" />
            选择并裁剪图片
          </button>
          
          <p className="text-xs text-gray-500">
            支持 JPG、PNG、GIF 格式，文件大小不超过 5MB
          </p>
        </div>
      </div>

      {/* 头像裁剪器 */}
      {showCropper && (
        <AvatarCropper
          imageUrl={tempImageUrl}
          onCrop={handleCrop}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
}
