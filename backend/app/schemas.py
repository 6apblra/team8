from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime


# Auth schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Profile schemas
class GameInfo(BaseModel):
    game: str
    rank: Optional[str] = None
    roles: List[str] = []


class AvailabilityWindowInfo(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str
    end_time: str
    timezone: Optional[str] = None


class ProfileCreate(BaseModel):
    nickname: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=300)
    region: str
    language: str
    platforms: List[str] = []
    games: List[GameInfo] = []
    availability: List[AvailabilityWindowInfo] = []
    playstyle: Optional[str] = None
    mic: bool = True


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=300)
    region: Optional[str] = None
    language: Optional[str] = None
    platforms: Optional[List[str]] = None
    games: Optional[List[GameInfo]] = None
    availability: Optional[List[AvailabilityWindowInfo]] = None
    playstyle: Optional[str] = None
    mic: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: str
    user_id: str
    nickname: str
    avatar_url: Optional[str]
    bio: Optional[str]
    region: str
    language: Optional[str]
    platforms: List[str]
    playstyle: Optional[str]
    mic: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Feed schemas
class FeedFilters(BaseModel):
    game: str
    region: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    rank_min: Optional[str] = None
    rank_max: Optional[str] = None
    cursor: Optional[str] = None
    limit: int = Field(default=10, ge=1, le=50)


class FeedCandidate(BaseModel):
    user_id: str
    profile: ProfileResponse
    games: List[GameInfo]
    availability: List[AvailabilityWindowInfo]


class FeedResponse(BaseModel):
    candidates: List[FeedCandidate]
    next_cursor: Optional[str] = None


# Swipe schemas
class SwipeCreate(BaseModel):
    to_user_id: str
    type: str = Field(..., pattern="^(like|pass|superlike)$")


class SwipeResponse(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str
    swipe_type: str
    created_at: datetime
    is_match: bool = False

    class Config:
        from_attributes = True


# Match schemas
class MatchResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    matched_at: datetime
    last_message_at: Optional[datetime]
    other_user: ProfileResponse

    class Config:
        from_attributes = True


# Message schemas
class MessageCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class MessageResponse(BaseModel):
    id: str
    match_id: str
    sender_id: str
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessagesResponse(BaseModel):
    messages: List[MessageResponse]
    next_cursor: Optional[str] = None


# Block/Report schemas
class BlockCreate(BaseModel):
    user_id: str


class ReportCreate(BaseModel):
    user_id: str
    reason: str
    details: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    reporter_id: str
    reported_user_id: str
    reason: str
    details: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

