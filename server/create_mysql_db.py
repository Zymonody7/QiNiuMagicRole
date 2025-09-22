"""
创建MySQL数据库脚本
"""

import pymysql
from app.core.config import settings

def create_database():
    """创建MySQL数据库"""
    # 解析数据库URL
  
    print(f"数据库URL: {settings.DATABASE_URL}")
    
    url_parts = settings.DATABASE_URL.split('://')[1]
    print(f"URL部分: {url_parts}")
    
    auth_host, database = url_parts.split('/') 
    print(f"认证主机: {auth_host}, 数据库: {database}")
    
    auth, host_port = auth_host.split('@') 
    print(f"认证: {auth}, 主机端口: {host_port}")
    
    username, password = auth.split(':', 1) 
    print(f"用户名: {username}, 密码: {password}")
    
    # 处理端口号
    if ':' in host_port:
        host, port = host_port.split(':') 
    else:
        host = host_port
        port = '3306'
    
    print(f"主机: {host}, 端口: {port}")
    
    try:
        # 连接到MySQL服务器（不指定数据库）
        connection = pymysql.connect(
            host=host,
            port=int(port),
            user=username,
            password=password,
            charset='utf8mb4'
        )
        
        cursor = connection.cursor()
        
        # 创建数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"数据库 {database} 创建成功")
        
        # 创建测试数据库
        test_database = settings.DATABASE_URL_TEST.split('/')[-1]
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {test_database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print(f"测试数据库 {test_database} 创建成功")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"创建数据库失败: {e}")
        print("请确保MySQL服务正在运行，并且用户名和密码正确")

if __name__ == "__main__":
    create_database()
