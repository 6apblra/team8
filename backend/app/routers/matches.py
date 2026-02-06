from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.database import get_db
from app.models import User, Match, Profile
from app.schemas import MatchResponse, ProfileResponse
from app.auth import get_current_user
from typing import List

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("", response_model=List[MatchResponse])
def get_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get all matches where user is user1 or user2
    matches = db.query(Match).filter(
        or_(
            Match.user1_id == current_user.id,
            Match.user2_id == current_user.id
        )
    ).order_by(Match.matched_at.desc()).all()
    
    result: List[MatchResponse] = []
    for match in matches:
        # Get other user's profile
        other_user_id = match.user2_id if match.user1_id == current_user.id else match.user1_id
        other_profile = db.query(Profile).filter(Profile.user_id == other_user_id).first()
        
        if other_profile:
            from app.schemas import ProfileResponse
            match_dict = {
                "id": match.id,
                "user1_id": match.user1_id,
                "user2_id": match.user2_id,
                "matched_at": match.matched_at,
                "last_message_at": match.last_message_at,
                "other_user": ProfileResponse.model_validate(other_profile)
            }
            result.append(MatchResponse(**match_dict))
    
    return result

