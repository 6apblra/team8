from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, 
    ForeignKey, Index, UniqueConstraint, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    email = Column(Text, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False)
    user_games = relationship("UserGame", back_populates="user", cascade="all, delete-orphan")
    availability_windows = relationship("AvailabilityWindow", back_populates="user", cascade="all, delete-orphan")
    sent_swipes = relationship("Swipe", foreign_keys="Swipe.from_user_id", back_populates="from_user")
    received_swipes = relationship("Swipe", foreign_keys="Swipe.to_user_id", back_populates="to_user")
    matches_as_user1 = relationship("Match", foreign_keys="Match.user1_id", back_populates="user1")
    matches_as_user2 = relationship("Match", foreign_keys="Match.user2_id", back_populates="user2")
    sent_messages = relationship("Message", back_populates="sender")
    blocks_initiated = relationship("Block", foreign_keys="Block.user_id", back_populates="user")
    blocks_received = relationship("Block", foreign_keys="Block.blocked_user_id", back_populates="blocked_user")
    reports_made = relationship("Report", foreign_keys="Report.reporter_id", back_populates="reporter")
    reports_received = relationship("Report", foreign_keys="Report.reported_user_id", back_populates="reported_user")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    nickname = Column(Text, nullable=False)
    avatar_url = Column(Text)
    bio = Column(Text)
    region = Column(Text, nullable=False, index=True)
    language = Column(Text, index=True)
    platforms = Column(JSON, default=list)  # ["PC", "PS", "XBOX", "MOBILE"]
    playstyle = Column(Text)  # "chill", "competitive", "flex"
    mic = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    name = Column(Text, unique=True, nullable=False)
    icon = Column(Text)

    user_games = relationship("UserGame", back_populates="game")


class UserGame(Base):
    __tablename__ = "user_games"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_id = Column(String, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    rank = Column(Text)
    roles = Column(JSON, default=list)

    user = relationship("User", back_populates="user_games")
    game = relationship("Game", back_populates="user_games")

    __table_args__ = (
        Index("idx_user_game", "user_id", "game_id"),
    )


class AvailabilityWindow(Base):
    __tablename__ = "availability_windows"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Monday-Sunday)
    start_time = Column(Text, nullable=False)  # "HH:MM"
    end_time = Column(Text, nullable=False)  # "HH:MM"
    timezone = Column(Text)

    user = relationship("User", back_populates="availability_windows")


class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    from_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    to_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    swipe_type = Column(Text, nullable=False)  # "like", "pass", "superlike"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="sent_swipes")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="received_swipes")

    __table_args__ = (
        UniqueConstraint("from_user_id", "to_user_id", name="unique_swipe"),
        Index("idx_swipe_from_to", "from_user_id", "to_user_id"),
    )


class Match(Base):
    __tablename__ = "matches"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    user1_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    matched_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True))

    user1 = relationship("User", foreign_keys=[user1_id], back_populates="matches_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], back_populates="matches_as_user2")
    messages = relationship("Message", back_populates="match", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="unique_match"),
        Index("idx_match_users", "user1_id", "user2_id"),
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    match_id = Column(String, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    match = relationship("Match", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")

    __table_args__ = (
        Index("idx_message_match_created", "match_id", "created_at"),
    )


class Block(Base):
    __tablename__ = "blocks"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blocked_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="blocks_initiated")
    blocked_user = relationship("User", foreign_keys=[blocked_user_id], back_populates="blocks_received")

    __table_args__ = (
        Index("idx_block_user", "user_id"),
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, server_default="gen_random_uuid()")
    reporter_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Text, nullable=False)
    details = Column(Text)
    status = Column(Text, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reports_made")
    reported_user = relationship("User", foreign_keys=[reported_user_id], back_populates="reports_received")

