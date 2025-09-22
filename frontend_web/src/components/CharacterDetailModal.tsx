'use client';

import { useState } from 'react';
import { Character } from '@/types/character';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Star, Users, Calendar, Tag, MessageCircle, Heart, Brain, Palette } from 'lucide-react';

interface CharacterDetailModalProps {
  character: Character;
  onClose: () => void;
}

export default function CharacterDetailModal({ character, onClose }: CharacterDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const categoryNames = {
    literature: '文学',
    history: '历史',
    science: '科学',
    mythology: '神话',
    art: '艺术',
    philosophy: '哲学'
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      literature: MessageCircle,
      history: Calendar,
      science: Brain,
      mythology: Star,
      art: Palette,
      philosophy: Heart
    };
    return icons[category as keyof typeof icons] || MessageCircle;
  };

  const CategoryIcon = getCategoryIcon(character.category);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">角色详情</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* 角色头部信息 */}
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <div className="flex-shrink-0">
              <img
                src={character.avatar}
                alt={character.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-100"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/128x128/8B5CF6/FFFFFF?text=' + character.name.charAt(0);
                }}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{character.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon className="w-5 h-5 text-purple-600" />
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      {categoryNames[character.category as keyof typeof categoryNames]}
                    </Badge>
                    {character.isPopular && (
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        <Star className="w-3 h-3 mr-1" />
                        热门
                      </Badge>
                    )}
                    {character.isCustom && (
                      <Badge variant="outline" className="border-green-300 text-green-700">
                        自定义
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span>人气: {character.popularity}</span>
                  </div>
                  {character.createdAt && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>创建于 {new Date(character.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">{character.description}</p>
            </div>
          </div>

          {/* 标签 */}
          {character.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {character.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="border-purple-200 text-purple-700">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* 详细信息标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="personality">性格</TabsTrigger>
              <TabsTrigger value="background">背景</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    角色概览
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">基本信息</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">分类:</span>
                        <span className="ml-2 font-medium">{categoryNames[character.category as keyof typeof categoryNames]}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">人气值:</span>
                        <span className="ml-2 font-medium">{character.popularity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">状态:</span>
                        <span className="ml-2 font-medium">
                          {character.isPopular ? '热门角色' : '普通角色'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">类型:</span>
                        <span className="ml-2 font-medium">
                          {character.isCustom ? '自定义角色' : '预设角色'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {character.voiceStyle && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">语音风格</h4>
                      <p className="text-gray-700">{character.voiceStyle}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="personality" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-600" />
                    性格特点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{character.personality}</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="background" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    背景故事
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{character.background}</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              开始对话
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
