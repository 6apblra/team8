from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.database import get_db
from app.models import User, Swipe, Match
from app.schemas import SwipeCreate, SwipeResponse
from app.auth import get_current_user

router = APIRouter(prefix="/swipe", tags=["swipe"])


@router.post("", response_model=SwipeResponse)
def create_swipe(
    swipe_data: SwipeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if trying to swipe on self
    if current_user.id == swipe_data.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot swipe on yourself"
        )
    
    # Check if target user exists
    target_user = db.query(User).filter(User.id == swipe_data.to_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )
    
    # Check if already swiped
    existing_swipe = db.query(Swipe).filter(
        and_(
            Swipe.from_user_id == current_user.id,
            Swipe.to_user_id == swipe_data.to_user_id
        )
    ).first()
    
    if existing_swipe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already swiped on this user"
        )
    
    # Create swipe
    swipe = Swipe(
        from_user_id=current_user.id,
        to_user_id=swipe_data.to_user_id,
        swipe_type=swipe_data.type
    )
    db.add(swipe)
    db.flush()
    
    # Check for match (mutual like)
    is_match = False
    if swipe_data.type in ["like", "superlike"]:
        mutual_swipe = db.query(Swipe).filter(
            and_(
                Swipe.from_user_id == swipe_data.to_user_id,
                Swipe.to_user_id == current_user.id,
                Swipe.swipe_type.in_(["like", "superlike"])
            )
        ).first()
        
        if mutual_swipe:
            is_match = True
            # Create match (ensure user1_id < user2_id for consistency)
            user1_id = min(current_user.id, swipe_data.to_user_id)
            user2_id = max(current_user.id, swipe_data.to_user_id)
            
            # Check if match already exists
            existing_match = db.query(Match).filter(
                and_(
                    Match.user1_id == user1_id,
                    Match.user2_id == user2_id
                )
            ).first()
            
            if not existing_match:
                match = Match(user1_id=user1_id, user2_id=user2_id)
                db.add(match)
                db.flush()
    
    db.commit()
    db.refresh(swipe)
    
    # Build response with is_match flag
    return SwipeResponse(
        id=swipe.id,
        from_user_id=swipe.from_user_id,
        to_user_id=swipe.to_user_id,
        swipe_type=swipe.swipe_type,
        created_at=swipe.created_at,
        is_match=is_match
    )

