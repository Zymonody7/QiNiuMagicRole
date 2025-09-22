# Qiniu Magic Role 
一个基于Next.js的AI角色扮演网站，用户可以搜索感兴趣的角色（如哈利·波特、苏格拉底等）并与其进行语音聊天。

## 功能特性
- 🎭 **丰富角色库**: 涵盖文学、历史、科学、神话等各个领域的知名人物
- 💬 **智能对话**: 基于AI技术的自然语言对话体验
- 🎤 **语音交互**: 支持语音输入和输出，让对话更加生动自然
- 📞 **语音通话**: 实时语音通话功能，与角色进行语音对话
- ⚙️ **角色配置**: 自定义角色，录制或上传音频，设置个性化提示词
- 🔍 **智能搜索**: 快速搜索和筛选角色
- 📱 **响应式设计**: 完美适配桌面端和移动端
- 🎨 **现代化UI**: 美观的用户界面和流畅的动画效果

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **开发语言**: TypeScript
- **样式框架**: Tailwind CSS
- **动画库**: Framer Motion
- **图标库**: Lucide React
- **语音功能**: Web Speech API

## 快速开始
### 环境要求

- Node.js 18.0 或更高版本
- npm 或 yarn 或 pnpm

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 项目结构

```
frontend_web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API路由
│   │   ├── chat/[id]/      # 聊天页面
│   │   ├── globals.css     # 全局样式
│   │   ├── layout.tsx      # 根布局
│   │   └── page.tsx        # 首页
│   ├── components/         # React组件
│   │   ├── CharacterCard.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── CategoryFilter.tsx
│   │   └── SearchBar.tsx
│   ├── hooks/              # 自定义Hooks
│   │   ├── useVoice.ts
│   │   └── useTextToSpeech.ts
│   ├── data/               # 数据文件
│   │   └── characters.ts
│   ├── services/           # 服务层
│   │   └── chatService.ts
│   └── types/              # TypeScript类型定义
│       └── character.ts
├── public/                 # 静态资源
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## 主要功能

### 角色浏览
- 首页展示热门角色
- 按类别筛选角色
- 搜索功能支持角色名称、描述、标签等

### 聊天功能
- 与选定角色进行文本对话
- 支持语音输入（需要浏览器支持）
- AI自动生成符合角色性格的回复
- 聊天记录本地保存

### 语音交互
- 语音转文字输入
- 文字转语音输出
- 支持多种语音设置

### 语音通话
- 实时语音通话功能
- 录音和播放控制
- 通话状态显示
- 语音消息传输

### 角色配置
- 自定义角色创建
- 语音录制和上传
- 个性化提示词设置
- 音色特征提取

## 角色数据

当前支持的角色包括：

### 文学类
- 哈利·波特
- 赫敏·格兰杰
- 夏洛克·福尔摩斯
- 威廉·莎士比亚

### 历史类
- 苏格拉底
- 克利奥帕特拉

### 科学类
- 阿尔伯特·爱因斯坦
- 玛丽·居里

### 神话类
- 赫拉克勒斯

### 艺术类
- 列奥纳多·达·芬奇

## 开发指南

### 添加新角色

1. 在 `src/data/characters.ts` 中添加新角色数据
2. 确保角色数据包含所有必需字段
3. 为新角色选择合适的头像图片