# 七牛幻角后端
## 1 安装Python依赖
```bash
cd server
pip install -r requirements.txt
```
## 2 配置环境变量
```bash
# 复制环境变量模板
cp env.example .env

# 编辑.env文件，设置以下关键配置：
# DATABASE_URL=postgresql://username:password@localhost/ai_roleplay
# OPENAI_API_KEY=your_openai_api_key_here
# SECRET_KEY=your-secret-key-here
```
## 3 创建数据库
```bash
python create_mysql_db.py
``` 
## 4 运行项目
```bash
python run.py
```