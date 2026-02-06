from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile, UserGame, Game, AvailabilityWindow
from app.schemas import ProfileCreate, ProfileUpdate, ProfileResponse
from app.auth import get_current_user

router = APIRouter(prefix="/me", tags=["profile"])


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get or create profile
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    
    if profile:
        # Update existing profile
        for key, value in profile_data.dict(exclude={"games", "availability"}).items():
            if value is not None:
                setattr(profile, key, value)
    else:
        # Create new profile
        profile_dict = profile_data.dict(exclude={"games", "availability"})
        profile = Profile(user_id=current_user.id, **profile_dict)
        db.add(profile)
    
    db.flush()
    
    # Update games
    if profile_data.games:
        # Delete existing games
        db.query(UserGame).filter(UserGame.user_id == current_user.id).delete()
        
        # Add new games
        for game_info in profile_data.games:
            # Get or create game
            game = db.query(Game).filter(Game.name == game_info.game).first()
            if not game:
                game = Game(name=game_info.game)
                db.add(game)
                db.flush()
            
            user_game = UserGame(
                user_id=current_user.id,
                game_id=game.id,
                rank=game_info.rank,
                roles=game_info.roles
            )
            db.add(user_game)
    
    # Update availability
    if profile_data.availability:
        # Delete existing availability
        db.query(AvailabilityWindow).filter(
            AvailabilityWindow.user_id == current_user.id
        ).delete()
        
        # Add new availability
        for avail in profile_data.availability:
            avail_window = AvailabilityWindow(
                user_id=current_user.id,
                day_of_week=avail.day_of_week,
                start_time=avail.start_time,
                end_time=avail.end_time,
                timezone=avail.timezone
            )
            db.add(avail_window)
    
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/profile", response_model=ProfileResponse)
def patch_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    update_data = profile_data.dict(exclude_unset=True, exclude={"games", "availability"})
    for key, value in update_data.items():
        if value is not None:
            setattr(profile, key, value)
    
    if profile_data.games is not None:
        db.query(UserGame).filter(UserGame.user_id == current_user.id).delete()
        for game_info in profile_data.games:
            game = db.query(Game).filter(Game.name == game_info.game).first()
            if not game:
                game = Game(name=game_info.game)
                db.add(game)
                db.flush()
            
            user_game = UserGame(
                user_id=current_user.id,
                game_id=game.id,
                rank=game_info.rank,
                roles=game_info.roles
            )
            db.add(user_game)
    
    if profile_data.availability is not None:
        db.query(AvailabilityWindow).filter(
            AvailabilityWindow.user_id == current_user.id
        ).delete()
        for avail in profile_data.availability:
            avail_window = AvailabilityWindow(
                user_id=current_user.id,
                day_of_week=avail.day_of_week,
                start_time=avail.start_time,
                end_time=avail.end_time,
                timezone=avail.timezone
            )
            db.add(avail_window)
    
    db.commit()
    db.refresh(profile)
    return profile

