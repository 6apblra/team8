from fastapi import WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Match, Message
from app.auth import get_current_user
from jose import JWTError, jwt
import os
import json
from typing import Dict, Set

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Store active connections: {user_id: Set[WebSocket]}
active_connections: Dict[str, Set[WebSocket]] = {}


async def get_user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        user = db.query(User).filter(User.id == user_id).first()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return user
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


async def websocket_endpoint(websocket: WebSocket, token: str, db: Session):
    await websocket.accept()
    
    try:
        user = await get_user_from_token(token, db)
        
        # Add connection
        if user.id not in active_connections:
            active_connections[user.id] = set()
        active_connections[user.id].add(websocket)
        
        await websocket.send_json({
            "type": "connected",
            "message": "WebSocket connected"
        })
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "send_message":
                # Handle send message
                match_id = data.get("match_id")
                text = data.get("text")
                
                if not match_id or not text:
                    await websocket.send_json({
                        "type": "error",
                        "message": "match_id and text are required"
                    })
                    continue
                
                # Verify user is part of match
                match = db.query(Match).filter(Match.id == match_id).first()
                if not match or (match.user1_id != user.id and match.user2_id != user.id):
                    await websocket.send_json({
                        "type": "error",
                        "message": "Match not found or unauthorized"
                    })
                    continue
                
                # Create message
                message = Message(
                    match_id=match_id,
                    sender_id=user.id,
                    text=text
                )
                db.add(message)
                from sqlalchemy import func
                match.last_message_at = func.now()
                db.commit()
                db.refresh(message)
                
                # Broadcast to other user
                other_user_id = match.user2_id if match.user1_id == user.id else match.user1_id
                if other_user_id in active_connections:
                    message_data = {
                        "type": "new_message",
                        "message": {
                            "id": message.id,
                            "match_id": message.match_id,
                            "sender_id": message.sender_id,
                            "text": message.text,
                            "created_at": message.created_at.isoformat()
                        }
                    }
                    for conn in active_connections[other_user_id]:
                        try:
                            await conn.send_json(message_data)
                        except:
                            pass
                
                # Confirm to sender
                await websocket.send_json({
                    "type": "message_sent",
                    "message": {
                        "id": message.id,
                        "match_id": message.match_id,
                        "sender_id": message.sender_id,
                        "text": message.text,
                        "created_at": message.created_at.isoformat()
                    }
                })
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_json({
            "type": "error",
            "message": str(e)
        })
    finally:
        # Remove connection
        if user.id in active_connections:
            active_connections[user.id].discard(websocket)
            if not active_connections[user.id]:
                del active_connections[user.id]

