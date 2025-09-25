import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.voice_chat_service import voice_chat_service

router = APIRouter()

@router.get("/test-websocket")
async def test_websocket():
    """测试WebSocket端点是否可访问"""
    return {"message": "WebSocket端点可访问", "status": "ok"}

@router.websocket("/ws/voice-chat")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点用于实时语音聊天"""
    client_id = str(uuid.uuid4())
    
    try:
        # 建立连接
        await websocket.accept()
        print(f"WebSocket连接已建立: {client_id}")
        
        # 初始化语音聊天服务
        await voice_chat_service.connect(websocket, client_id)
        
        while True:
            # 接收消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理消息
            await voice_chat_service.handle_message(websocket, client_id, message)
            
    except WebSocketDisconnect:
        print(f"客户端断开连接: {client_id}")
    except Exception as e:
        print(f"WebSocket错误: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        # 清理连接
        await voice_chat_service.disconnect(client_id)
