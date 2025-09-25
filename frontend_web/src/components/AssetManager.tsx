'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, Trash2, FileText, Cloud, HardDrive, Folder, Image, Music, Video, File } from 'lucide-react';

interface AssetInfo {
  key: string;
  size: number;
  mimeType: string;
  putTime: number;
}

interface StorageInfo {
  use_qiniu: boolean;
  max_file_size: number;
  upload_dir: string;
  server_url: string;
  folder_structure: Record<string, string>;
}

const ASSET_TYPES = {
  avatars: { name: '角色头像', icon: Image, color: 'text-blue-500' },
  reference_audios: { name: '参考音频', icon: Music, color: 'text-green-500' },
  generated_voices: { name: '生成语音', icon: Music, color: 'text-purple-500' },
  chat_audios: { name: '聊天音频', icon: Music, color: 'text-orange-500' },
  user_uploads: { name: '用户上传', icon: File, color: 'text-gray-500' },
  temp_files: { name: '临时文件', icon: FileText, color: 'text-yellow-500' },
  system_files: { name: '系统文件', icon: FileText, color: 'text-red-500' }
};

export default function AssetManager() {
  const [assets, setAssets] = useState<AssetInfo[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('avatars');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subfolder, setSubfolder] = useState('');

  // 获取存储信息
  const fetchStorageInfo = async () => {
    try {
      const response = await fetch('/api/assets/info');
      const data = await response.json();
      if (data.success) {
        setStorageInfo(data.data);
      }
    } catch (error) {
      console.error('获取存储信息失败:', error);
    }
  };

  // 获取资源列表
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/list?asset_type=${selectedAssetType}`);
      const data = await response.json();
      if (data.success) {
        setAssets(data.data.files || []);
      }
    } catch (error) {
      console.error('获取资源列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 上传资源
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('asset_type', selectedAssetType);
      if (subfolder) {
        formData.append('subfolder', subfolder);
      }

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        alert('资源上传成功！');
        setSelectedFile(null);
        setSubfolder('');
        fetchAssets();
      } else {
        alert(`上传失败: ${data.message}`);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 删除资源
  const handleDelete = async (key: string) => {
    if (!confirm('确定要删除这个资源吗？')) return;

    try {
      const response = await fetch(`/api/assets/delete?key=${encodeURIComponent(key)}&asset_type=${selectedAssetType}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        alert('资源删除成功！');
        fetchAssets();
      } else {
        alert(`删除失败: ${data.message}`);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查网络连接');
    }
  };

  // 获取资源URL
  const getAssetUrl = async (key: string, is_private: boolean = false) => {
    try {
      const response = await fetch(`/api/assets/url?key=${encodeURIComponent(key)}&is_private=${is_private}`);
      const data = await response.json();
      if (data.success) {
        return data.data.url;
      }
    } catch (error) {
      console.error('获取URL失败:', error);
    }
    return null;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp / 10000).toLocaleString();
  };

  // 获取文件图标
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.startsWith('video/')) return Video;
    return File;
  };

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [selectedAssetType]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Folder className="w-8 h-8 text-blue-500" />
          静态资源管理
        </h1>

        {/* 存储信息 */}
        {storageInfo && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">存储配置</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">存储类型:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  storageInfo.use_qiniu ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {storageInfo.use_qiniu ? '七牛云存储' : '本地存储'}
                </span>
              </div>
              <div>
                <span className="font-medium">最大文件大小:</span>
                <span className="ml-2">{formatFileSize(storageInfo.max_file_size)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 资源类型选择 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">资源类型</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ASSET_TYPES).map(([type, info]) => {
              const IconComponent = info.icon;
              return (
                <button
                  key={type}
                  onClick={() => setSelectedAssetType(type)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedAssetType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className={`w-6 h-6 mx-auto mb-2 ${info.color}`} />
                  <div className="text-sm font-medium">{info.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 上传区域 */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">上传资源</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">选择文件</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">子文件夹 (可选)</label>
              <input
                type="text"
                value={subfolder}
                onChange={(e) => setSubfolder(e.target.value)}
                placeholder="例如: character_123"
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? '上传中...' : '上传资源'}
            </button>
          </div>
        </div>

        {/* 资源列表 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {ASSET_TYPES[selectedAssetType as keyof typeof ASSET_TYPES]?.name} 列表
            </h2>
            <button
              onClick={fetchAssets}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              刷新列表
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无资源</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assets.map((asset, index) => {
                const IconComponent = getFileIcon(asset.mimeType);
                return (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <IconComponent className="w-6 h-6 text-gray-500" />
                      <div>
                        <div className="font-medium">{asset.key}</div>
                        <div className="text-sm text-gray-500">
                          {formatFileSize(asset.size)} | {asset.mimeType} | {formatTime(asset.putTime)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          const url = await getAssetUrl(asset.key);
                          if (url) {
                            window.open(url, '_blank');
                          }
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-100 rounded"
                        title="下载文件"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.key)}
                        className="p-2 text-red-500 hover:bg-red-100 rounded"
                        title="删除文件"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">使用说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 支持七牛云存储和本地存储自动切换</li>
            <li>• 资源按类型分类管理，支持子文件夹</li>
            <li>• 支持图片、音频、视频、文档等多种文件类型</li>
            <li>• 文件大小限制: {storageInfo ? formatFileSize(storageInfo.max_file_size) : '10MB'}</li>
            <li>• 七牛云存储提供CDN加速和全球访问</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
