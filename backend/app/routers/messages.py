from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models import User, Match, Message
from app.schemas import MessageCreate, MessageResponse, MessagesResponse
from app.auth import get_current_user
from typing import List

router = APIRouter(prefix="/matches", tags=["messages"])


@router.get("/{match_id}/messages", response_model=MessagesResponse)
def get_messages(
    match_id: str,
    cursor: str = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user is part of this match
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    if match.user1_id != current_user.id and match.user2_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this match"
        )
    
    # Get messages
    query = db.query(Message).filter(Message.match_id == match_id)
    
    if cursor:
        query = query.filter(Message.id > cursor)
    
    messages = query.order_by(Message.created_at.desc()).limit(limit + 1).all()
    
    # Reverse to get chronological order
    messages = list(reversed(messages))
    
    # Check if there's more
    has_next = len(messages) > limit
    if has_next:
        messages = messages[:limit]
        next_cursor = messages[-1].id
    else:
        next_cursor = None
    
    return MessagesResponse(
        messages=[MessageResponse.model_validate(m) for m in messages],
        next_cursor=next_cursor
    )


@router.post("/{match_id}/messages", response_model=MessageResponse)
def create_message(
    match_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify user is part of this match
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    if match.user1_id != current_user.id and match.user2_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to send messages in this match"
        )
    
    # Create message
    message = Message(
        match_id=match_id,
        sender_id=current_user.id,
        text=message_data.text
    )
    db.add(message)
    
    # Update match last_message_at
    from sqlalchemy import func
    match.last_message_at = func.now()
    
    db.commit()
    db.refresh(message)
    
    return MessageResponse.model_validate(message)

