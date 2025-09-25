'use client';

import { useState } from 'react';
import { Upload, Download, Trash2, FileText, Cloud, HardDrive } from 'lucide-react';

interface FileInfo {
  filename: string;
  key: string;
  url: string;
  size: number;
  storage: 'qiniu' | 'local';
}

interface StorageConfig {
  qiniu_enabled: boolean;
  max_file_size: number;
  upload_dir: string;
  server_url: string;
}

export default function StorageTest() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [useQiniu, setUseQiniu] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 获取存储配置
  const fetchConfig = async () => {
    try {
      console.log('正在请求存储配置...');
      const response = await fetch('/api/storage/config');
      console.log('响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('配置数据:', data);
      
      if (data.success) {
        setConfig(data.data);
        setUseQiniu(data.data.qiniu_enabled);
      } else {
        console.error('配置获取失败:', data.message);
      }
    } catch (error) {
      console.error('获取配置失败:', error);
      alert(`获取配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('use_qiniu', useQiniu.toString());

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFiles(prev => [...prev, data.data]);
        setSelectedFile(null);
        alert('文件上传成功！');
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

  // 批量上传文件
  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('use_qiniu', useQiniu.toString());

      const response = await fetch('/api/storage/upload-multiple', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setFiles(prev => [...prev, ...data.data.filter((item: any) => item.success)]);
        alert(`批量上传完成！成功上传 ${data.data.filter((item: any) => item.success).length} 个文件`);
      } else {
        alert(`批量上传失败: ${data.message}`);
      }
    } catch (error) {
      console.error('批量上传失败:', error);
      alert('批量上传失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  // 删除文件
  const handleDelete = async (key: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      const response = await fetch(`/api/storage/delete?key=${encodeURIComponent(key)}&use_qiniu=${useQiniu}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setFiles(prev => prev.filter(file => file.key !== key));
        alert('文件删除成功！');
      } else {
        alert(`删除失败: ${data.message}`);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查网络连接');
    }
  };

  // 获取文件列表
  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/storage/list?use_qiniu=${useQiniu}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.data.files || []);
      }
    } catch (error) {
      console.error('获取文件列表失败:', error);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Cloud className="w-8 h-8 text-blue-500" />
          七牛云存储测试
        </h1>

        {/* 配置信息 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">存储配置</h2>
          {config ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">七牛云状态:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  config.qiniu_enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {config.qiniu_enabled ? '已启用' : '未启用'}
                </span>
              </div>
              <div>
                <span className="font-medium">最大文件大小:</span>
                <span className="ml-2">{formatFileSize(config.max_file_size)}</span>
              </div>
              <div>
                <span className="font-medium">上传目录:</span>
                <span className="ml-2">{config.upload_dir}</span>
              </div>
              <div>
                <span className="font-medium">服务器URL:</span>
                <span className="ml-2">{config.server_url}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={fetchConfig}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              获取配置信息
            </button>
          )}
        </div>

        {/* 存储选择 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">存储选择</h2>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="storage"
                checked={useQiniu}
                onChange={() => setUseQiniu(true)}
                disabled={!config?.qiniu_enabled}
              />
              <Cloud className="w-5 h-5 text-blue-500" />
              <span>七牛云存储</span>
              {!config?.qiniu_enabled && <span className="text-red-500 text-sm">(未配置)</span>}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="storage"
                checked={!useQiniu}
                onChange={() => setUseQiniu(false)}
              />
              <HardDrive className="w-5 h-5 text-gray-500" />
              <span>本地存储</span>
            </label>
          </div>
        </div>

        {/* 文件上传 */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">文件上传</h2>
          <div className="space-y-4">
            {/* 单文件上传 */}
            <div>
              <label className="block text-sm font-medium mb-2">选择文件</label>
              <div className="flex gap-4">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || loading}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                >
                  {loading ? '上传中...' : '上传文件'}
                </button>
              </div>
            </div>

            {/* 批量上传 */}
            <div>
              <label className="block text-sm font-medium mb-2">批量上传</label>
              <input
                type="file"
                multiple
                onChange={handleBatchUpload}
                className="w-full p-2 border rounded"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* 文件列表 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">文件列表</h2>
            <button
              onClick={fetchFiles}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              刷新列表
            </button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无文件</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {file.storage === 'qiniu' ? (
                        <Cloud className="w-5 h-5 text-blue-500" />
                      ) : (
                        <HardDrive className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="font-medium">{file.filename}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(file.size)} | {file.storage}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-500 hover:bg-blue-100 rounded"
                      title="下载文件"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.key)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded"
                      title="删除文件"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-semibold mb-2">使用说明</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 七牛云存储需要配置 AccessKey、SecretKey、Bucket 和域名</li>
            <li>• 本地存储文件会保存在服务器的 static/uploads 目录</li>
            <li>• 支持的文件类型：图片、音频、视频、文档等</li>
            <li>• 文件大小限制：{config ? formatFileSize(config.max_file_size) : '10MB'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
