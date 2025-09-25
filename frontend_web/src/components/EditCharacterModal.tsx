'use client';

import { useState, useEffect } from 'react';
import { Character } from '@/types/character';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Upload, Plus, X as XIcon } from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import { apiService } from '@/services/apiService';

interface EditCharacterModalProps {
  character: Character;
  onClose: () => void;
  onSubmit: (characterData: Partial<Character> & { referenceAudio?: File }) => void;
}

export default function EditCharacterModal({ character, onClose, onSubmit }: EditCharacterModalProps) {
  const [formData, setFormData] = useState({
    name: character.name,
    description: character.description,
    avatar: character.avatar,
    personality: character.personality,
    background: character.background,
    voiceStyle: character.voice_style,
    category: character.category,
    tags: character.tags,
    popularity: character.popularity,
    isPopular: character.is_popular || false,
    referenceAudio: undefined as File | undefined,
    referenceAudioText: character.reference_audio_text || '',
    referenceAudioLanguage: character.reference_audio_language || 'zh',
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [asrProcessing, setAsrProcessing] = useState(false);

  const categories = [
    { id: 'literature', name: '文学' },
    { id: 'history', name: '历史' },
    { id: 'science', name: '科学' },
    { id: 'mythology', name: '神话' },
    { id: 'art', name: '艺术' },
    { id: 'philosophy', name: '哲学' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        avatar: formData.avatar,
        personality: formData.personality,
        background: formData.background,
        voice_style: formData.voiceStyle,
        category: formData.category,
        tags: formData.tags,
        popularity: formData.popularity,
        is_popular: formData.isPopular,
        referenceAudio: formData.referenceAudio, // 添加音频文件
        reference_audio_text: formData.referenceAudioText,
        reference_audio_language: formData.referenceAudioLanguage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 检查文件类型
      if (!file.type.startsWith('audio/')) {
        alert('请选择音频文件');
        return;
      }
      
      // 检查文件大小 (限制为10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('音频文件大小不能超过10MB');
        return;
      }
      
      setFormData(prev => ({ ...prev, referenceAudio: file }));
      
      // 创建音频预览URL
      const audioUrl = URL.createObjectURL(file);
      setAudioPreview(audioUrl);
      
      // 自动进行ASR转录
      await handleAutoTranscribe(file);
    }
  };

  const handleAutoTranscribe = async (audioFile: File) => {
    if (!audioFile) return;
    
    setAsrProcessing(true);
    try {
      const result = await apiService.transcribeAudio(audioFile, formData.referenceAudioLanguage);
      
      if (result.success && result.transcribed_text) {
        setFormData(prev => ({ 
          ...prev, 
          referenceAudioText: result.transcribed_text 
        }));
        console.log('ASR转录成功:', result.transcribed_text);
      } else {
        console.log('ASR转录失败:', result.message);
      }
    } catch (error) {
      console.error('ASR转录错误:', error);
    } finally {
      setAsrProcessing(false);
    }
  };

  const removeAudio = () => {
    setFormData(prev => ({ ...prev, referenceAudio: undefined, referenceAudioText: '' }));
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview);
      setAudioPreview(null);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">编辑角色</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">角色名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="输入角色名称"
                required
              />
            </div>
            <div>
              <Label htmlFor="category">分类 *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 头像 */}
          <div>
            <Label htmlFor="avatar">头像URL</Label>
            <div className="flex gap-2">
              <Input
                id="avatar"
                value={formData.avatar}
                onChange={(e) => handleInputChange('avatar', e.target.value)}
                placeholder="输入头像图片URL"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                上传
              </Button>
            </div>
            {formData.avatar && (
              <div className="mt-2">
                <img
                  src={formData.avatar}
                  alt="头像预览"
                  className="w-16 h-16 rounded-full object-cover border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* 描述 */}
          <div>
            <Label htmlFor="description">角色描述 *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="描述角色的基本信息和特点"
              rows={3}
              required
            />
          </div>

          {/* 性格 */}
          <div>
            <Label htmlFor="personality">性格特点 *</Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => handleInputChange('personality', e.target.value)}
              placeholder="描述角色的性格特征"
              rows={2}
              required
            />
          </div>

          {/* 背景 */}
          <div>
            <Label htmlFor="background">背景故事 *</Label>
            <Textarea
              id="background"
              value={formData.background}
              onChange={(e) => handleInputChange('background', e.target.value)}
              placeholder="描述角色的背景故事和经历"
              rows={3}
              required
            />
          </div>

          {/* 语音风格 */}
          <div>
            <Label htmlFor="voiceStyle">语音风格</Label>
            <Input
              id="voiceStyle"
              value={formData.voiceStyle}
              onChange={(e) => handleInputChange('voiceStyle', e.target.value)}
              placeholder="描述角色的语音特点，如：年轻、充满活力、英国口音"
            />
          </div>

          {/* 参考音频上传 */}
          <div>
            <Label>参考音频</Label>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('audio-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  上传音频
                </Button>
                {formData.referenceAudio && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeAudio}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    删除音频
                  </Button>
                )}
              </div>
              
              {formData.referenceAudio && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    已选择: {formData.referenceAudio.name} ({(formData.referenceAudio.size / 1024 / 1024).toFixed(2)}MB)
                  </div>
                  
                  {audioPreview && (
                    <div>
                      <Label>音频预览</Label>
                      <audio controls className="w-full">
                        <source src={audioPreview} type={formData.referenceAudio.type} />
                        您的浏览器不支持音频播放。
                      </audio>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="referenceAudioText">音频文本</Label>
                    {asrProcessing && (
                      <div className="text-sm text-blue-600 mb-2">
                        🔄 正在自动识别音频内容...
                      </div>
                    )}
                    <Textarea
                      id="referenceAudioText"
                      value={formData.referenceAudioText}
                      onChange={(e) => handleInputChange('referenceAudioText', e.target.value)}
                      placeholder="请输入音频中说的内容，用于语音合成训练（系统会自动识别）"
                      rows={2}
                    />
                    {formData.referenceAudioText && !asrProcessing && (
                      <div className="text-xs text-green-600 mt-1">
                        ✅ 音频文本已自动识别
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="referenceAudioLanguage">音频语言</Label>
                    <Select 
                      value={formData.referenceAudioLanguage} 
                      onValueChange={(value) => handleInputChange('referenceAudioLanguage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择语言" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh">中文</SelectItem>
                        <SelectItem value="en">英文</SelectItem>
                        <SelectItem value="ja">日文</SelectItem>
                        <SelectItem value="ko">韩文</SelectItem>
                        <SelectItem value="yue">粤语</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 音频录制 */}
          <div>
            <AudioRecorder
              onAudioRecorded={(audioBlob) => {
                // 将录制的音频转换为File对象（现在是WAV格式）
                const file = new File([audioBlob], `recording_${Date.now()}.wav`, {
                  type: 'audio/wav'
                });
                setFormData(prev => ({ ...prev, referenceAudio: file }));
                
                // 创建音频预览
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioPreview(audioUrl);
              }}
              onAudioText={(text) => {
                setFormData(prev => ({ ...prev, referenceAudioText: text }));
              }}
              language={formData.referenceAudioLanguage}
            />
          </div>

          {/* 标签 */}
          <div>
            <Label>标签</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入标签"
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-purple-600"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 高级设置 */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-900">高级设置</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="popularity">人气值</Label>
                <Input
                  id="popularity"
                  type="number"
                  value={formData.popularity}
                  onChange={(e) => handleInputChange('popularity', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular}
                  onCheckedChange={(checked) => handleInputChange('isPopular', checked)}
                />
                <Label htmlFor="isPopular">设为热门角色</Label>
              </div>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? '保存中...' : '保存更改'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
