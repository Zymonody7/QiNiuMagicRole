# 奇牛幻角（Qiniu MagicRole）

## 项目概述

奇牛幻角是一个基于AI技术的智能角色扮演平台，用户可以与历史人物、文学角色、科学家等AI角色进行语音对话，并且可以一键将对话的内容导出为访谈播客。项目采用现代化的技术栈，支持实时语音交互、智能对话生成、角色技能系统等核心功能。[演示视频](https://www.bilibili.com/video/BV1tFnozGExX/)
### 1. 你计划将这个网页面向什么类型的用户？这些类型的用户他们面临什么样的痛点，你设想的用户故事是什么样呢？
> 面向访谈类节目自媒体创作者或传媒类学生，由于现在语音合成技术非常流行，很多ai配音作品不断涌现出来。但与历史或神话中的人物面对面沟通的访谈播客类的却比较少。B站邀请过[余华](https://www.bilibili.com/video/BV1GbpiegEYg)、[蔡徐坤](https://www.bilibili.com/video/BV17eKBzKEuZ)以及B站up主等做过访谈，从播放量可以见得这类节目的受众还是很多的。于是我们添加了“一键导出访谈博客”功能。该功能可以一键将语音聊天记录导出为访谈播客并且可以一键插入用户自定义的音乐，直接将自己的对话内容生成一个可用于媒体创作的语音素材。

### 2. 你认为这个网页需要哪些功能？这些功能各自的优先级是什么？你计划本次开发哪些功能？
> 创建自己喜欢的角色，与喜欢的角色文字或语音进行深入交流，可以将聊天的结果导出为音频或者视频，直接发布到B站、抖音等创作平台，起名“对话苏格拉底，探讨勇气的本质”，便可以将有深度的与苏格拉底的访谈发布出来。
>> P0
>>> 1. **角色搜索与浏览** - 支持按类别、标签搜索角色
>>> 2. **智能对话系统** - 基于角色性格的AI对话
>>> 3. **语音交互** - 语音输入输出，实时语音聊天
>>> 4. **角色管理** - 创建、编辑、删除自定义角色

>> P1
>>> 1. **情感设定** - 可调整虚拟角色的情绪来调整对话氛围
>>> 2. **知识问答** - 角色专业知识问答能力
>>> 3. **语音克隆** - 基于参考音频生成角色声音
>>> 4. **访谈导出** - 导出音频或者PDF\Word

>> P2
>>> 1. **对话记忆** - 长期对话记忆和上下文理解
>>> 2. **角色关系** - 多角色互动场景
>>> 3. **内容生成** - 生成角色相关的故事、诗歌等
>>> 4. **语音视频通话** - 实时与角色语音\视频通话
>>> 5. **导出视频** - 导出与角色的访谈视频

### 3. 你计划采纳哪家公司的哪个 LLM 模型能力？你对比了哪些，你为什么选择用该 LLM 模型？
LLM模型选择：七牛云 x-ai/grok-4-fast 模型
1. **中文优化**：专门针对中文场景优化，角色扮演效果更好
2. **成本效益**：相比GPT-4成本更低，适合大规模部署
3. **响应速度**：fast版本响应快，提升用户体验，七牛云国内服务，访问稳定
4. **项目集成**：当前项目已集成七牛云服务，技术栈统一
TTS模型选择：七牛云TTS服务和GPT-SoVITS
1. **降级服务**: 由于七牛云的TTS服务不支持自定义音色克隆，遂在本地部署了GPT-SoVITS服务，担当GPT-SoVITS崩了之后，还可以try-catch到七牛云实现流程。
2. **响应速度**: 通过对比其他TTS大模型（如Index TTS,CosyVoice）等，GPT-SoVITS效果较好且更轻量一些，即使在我的渣渣机上，运行的也相对较快。

### 4. 你期望 AI 角色除了语音聊天外还应该有哪些技能？
1. 有各自的技能，可以深度带入自己的角色
2. 有自己的音色和情感，让用户有代入感一些

## 项目技术栈
### 前端技术栈
```
Web端（Next.js）
框架: Next.js 14 (App Router)
语言: TypeScript 5.2+
样式: Tailwind CSS 3.3+
UI组件: Radix UI + 自定义组件
状态管理: React Context + Custom Hooks
动画: Framer Motion 10.16+
图标: Lucide React 0.292+
语音处理: Web Speech API + React Speech Kit
音频处理: 原生Web Audio API
```
### 后端技术栈
```
框架: FastAPI
语言: Python 3.9+
数据库: MySQL 8.0 + SQLAlchemy 2.0+
缓存: Redis 6.0
异步处理: asyncio + httpx
文件处理: aiofiles
音频处理: pydub
文档生成: python-docx, reportlab
对象存储: 七牛云对象存储服务
```
### 大模型
```
LLM: 七牛云免费的Grok
OCR: 七牛云提供的ocr服务https://developer.qiniu.com/aitokenapi/12983/orc-api
ASR: 七牛云提供的ASR服务https://developer.qiniu.com/aitokenapi/12981/asr-tts-ocr-api
TTS: GPT-SoVITS和七牛云提供的TTS服务https://developer.qiniu.com/aitokenapi/12981/asr-tts-ocr-api
实时通话: 阿里云的aicall
```

## 数据流图

#### 1. 角色对话流程
```
用户输入 → 前端验证 → API Gateway → AI服务 → 七牛云LLM → 角色回复生成 → TTS服务 → 语音合成 → 前端播放
```

#### 2. 语音交互流程
```
语音录制 → ASR识别 → 文本处理 → LLM对话 → TTS合成 → 音频播放
```

## 部署架构

### 开发环境
```
本地开发 → 本地数据库 → 七牛云服务
```

### 快速开始
```bash
# 克隆项目
git clone <repository-url>
cd QiNiuMagicRole

# 安装依赖
cd frontend_web && pnpm install
cd ../server && pip install -r requirements.txt

# 配置环境变量
cp server/env.example server/.env

# 启动服务
# 后端
cd server && python run.py

# 前端
cd frontend_web && pnpm dev
```

### 项目结构
```
QiNiuMagicRole/
├── frontend_web/          # Web前端
├── server/                 # 后端服务
└── llm_server/             # GPT-SoVITS
```
