from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel
import json

"""
Backeend for running the websocket server and creating api endpoints
"""
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection manager from documentation
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: Dict):
        message_json = json.dumps(message, default=str)
        for connection in self.active_connections:
            await connection.send_text(message_json)

# Message model
class Message(BaseModel):
    id: int
    text: str
    sender: str
    timestamp: datetime

class MessageRequest(BaseModel):
    sender: str = "user"
    text: str

manager = ConnectionManager()

message_storage: List[Message] = []

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.get("/api/messages", response_model=List[Message])
async def get_messages():
    return message_storage

# Message creation endpoint - only place where messages are added to the message storage
@app.post("/api/messages", response_model=Message)
async def create_message(message_request: MessageRequest):
    new_message = Message(
        id=len(message_storage) + 1,
        text=message_request.text,
        sender=message_request.sender,
        timestamp=datetime.now()
    )
    message_storage.append(new_message)

    # Broadcast stored message to all connected clients
    await manager.broadcast({
        "type": "message",
        "message": new_message.model_dump()
    })
    return new_message

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Websocket endpoint 
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            payload = await websocket.receive_json()
            if payload["type"] == "typing":
                await manager.broadcast({
                    "type": "typing",
                    "sender": payload["sender"],
                    "timestamp": datetime.now().isoformat()
                })
            elif payload["type"] == "message":
                # Broadcast ephemeral message without storing
                # Only POST /api/messages stores to database
                await manager.broadcast({
                    "type": "message",
                    "text": payload.get("text"),
                    "sender": payload.get("sender"),
                    "timestamp": datetime.now().isoformat(),
                    "ephemeral": True  # Flag to indicate this wasn't stored
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast({
            "type": "user_left",
            "sender": websocket.client.host
        })