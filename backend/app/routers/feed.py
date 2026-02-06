from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, not_
from app.database import get_db
from app.models import (
    User, Profile, UserGame, Game, Swipe, Block, AvailabilityWindow
)
from app.schemas import FeedResponse, FeedCandidate, GameInfo, AvailabilityWindowInfo
from app.auth import get_current_user
from typing import List

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=FeedResponse)
def get_feed(
    game: str = Query(..., description="Game name (required)"),
    region: str = Query(None),
    language: str = Query(None),
    platform: str = Query(None),
    rank_min: str = Query(None),
    rank_max: str = Query(None),
    cursor: str = Query(None),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get game
    game_obj = db.query(Game).filter(Game.name == game).first()
    if not game_obj:
        return FeedResponse(candidates=[], next_cursor=None)
    
    # Get users who play this game
    user_games_user_ids = [
        ug.user_id for ug in db.query(UserGame.user_id).filter(
            UserGame.game_id == game_obj.id
        ).all()
    ]
    
    # Exclude current user
    # Exclude blocked users
    blocked_user_ids = [
        b.blocked_user_id for b in db.query(Block.blocked_user_id).filter(
            Block.user_id == current_user.id
        ).all()
    ]
    blocked_by_user_ids = [
        b.user_id for b in db.query(Block.user_id).filter(
            Block.blocked_user_id == current_user.id
        ).all()
    ]
    
    # Exclude already swiped users
    swiped_user_ids = [
        s.to_user_id for s in db.query(Swipe.to_user_id).filter(
            Swipe.from_user_id == current_user.id
        ).all()
    ]
    
    # Build query
    excluded_ids = {current_user.id} | set(blocked_user_ids) | set(blocked_by_user_ids) | set(swiped_user_ids)
    query = db.query(Profile).join(User).filter(
        and_(
            Profile.user_id.in_(user_games_user_ids),
            ~Profile.user_id.in_(excluded_ids)
        )
    )
    
    # Apply filters
    if region:
        query = query.filter(Profile.region == region)
    if language:
        query = query.filter(Profile.language == language)
    if platform:
        query = query.filter(Profile.platforms.contains([platform]))
    
    # Cursor pagination
    if cursor:
        # Simple cursor based on profile id
        query = query.filter(Profile.id > cursor)
    
    # Order and limit
    query = query.order_by(Profile.id).limit(limit + 1)
    
    profiles = query.all()
    
    # Check if there's a next page
    has_next = len(profiles) > limit
    if has_next:
        profiles = profiles[:limit]
        next_cursor = profiles[-1].id
    else:
        next_cursor = None
    
    # Build response
    candidates: List[FeedCandidate] = []
    for profile in profiles:
        # Get user games
        user_games = db.query(UserGame).join(Game).filter(
            UserGame.user_id == profile.user_id
        ).all()
        
        games = [
            GameInfo(
                game=ug.game.name,
                rank=ug.rank,
                roles=ug.roles or []
            )
            for ug in user_games
        ]
        
        # Get availability
        availability_windows = db.query(AvailabilityWindow).filter(
            AvailabilityWindow.user_id == profile.user_id
        ).all()
        
        availability = [
            AvailabilityWindowInfo(
                day_of_week=aw.day_of_week,
                start_time=aw.start_time,
                end_time=aw.end_time,
                timezone=aw.timezone
            )
            for aw in availability_windows
        ]
        
        from app.schemas import ProfileResponse
        candidates.append(FeedCandidate(
            user_id=profile.user_id,
            profile=ProfileResponse.model_validate(profile),
            games=games,
            availability=availability
        ))
    
    return FeedResponse(candidates=candidates, next_cursor=next_cursor)

