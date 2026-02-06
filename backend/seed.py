#!/usr/bin/env python3
"""
Seed script to populate database with test data
"""
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import (
    User, Profile, Game, UserGame, AvailabilityWindow
)
from app.auth import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

# Games
games_data = [
    {"name": "Valorant", "icon": "valorant"},
    {"name": "CS2", "icon": "cs2"},
    {"name": "Dota2", "icon": "dota2"},
    {"name": "Fortnite", "icon": "fortnite"},
    {"name": "LoL", "icon": "lol"},
]

games = {}
for game_data in games_data:
    game = db.query(Game).filter(Game.name == game_data["name"]).first()
    if not game:
        game = Game(**game_data)
        db.add(game)
        db.flush()
    games[game_data["name"]] = game

# Test users
test_users = [
    {
        "email": "player1@test.com",
        "password": "password123",
        "profile": {
            "nickname": "ProGamer",
            "bio": "Looking for competitive teammates. Rank: Immortal",
            "region": "EU",
            "language": "en",
            "platforms": ["PC"],
            "playstyle": "competitive",
            "mic": True,
        },
        "games": [
            {"game": "Valorant", "rank": "Immortal", "roles": ["Duelist", "Initiator"]},
        ],
        "availability": [
            {"day_of_week": 1, "start_time": "18:00", "end_time": "23:00", "timezone": "UTC+1"},
            {"day_of_week": 3, "start_time": "18:00", "end_time": "23:00", "timezone": "UTC+1"},
            {"day_of_week": 5, "start_time": "18:00", "end_time": "23:00", "timezone": "UTC+1"},
        ],
    },
    {
        "email": "player2@test.com",
        "password": "password123",
        "profile": {
            "nickname": "CasualPlayer",
            "bio": "Just want to have fun and chill",
            "region": "EU",
            "language": "en",
            "platforms": ["PC", "PS"],
            "playstyle": "chill",
            "mic": True,
        },
        "games": [
            {"game": "Valorant", "rank": "Gold", "roles": ["Support"]},
            {"game": "CS2", "rank": "Gold Nova", "roles": ["Support"]},
        ],
        "availability": [
            {"day_of_week": 0, "start_time": "14:00", "end_time": "20:00", "timezone": "UTC+1"},
            {"day_of_week": 6, "start_time": "14:00", "end_time": "20:00", "timezone": "UTC+1"},
        ],
    },
    {
        "email": "player3@test.com",
        "password": "password123",
        "profile": {
            "nickname": "FlexGamer",
            "bio": "Flexible player, can adapt to any role",
            "region": "NA",
            "language": "en",
            "platforms": ["PC"],
            "playstyle": "flex",
            "mic": True,
        },
        "games": [
            {"game": "Dota2", "rank": "Legend", "roles": ["Carry", "Support"]},
            {"game": "LoL", "rank": "Platinum", "roles": ["Top", "Jungle"]},
        ],
        "availability": [
            {"day_of_week": 2, "start_time": "19:00", "end_time": "01:00", "timezone": "UTC-5"},
            {"day_of_week": 4, "start_time": "19:00", "end_time": "01:00", "timezone": "UTC-5"},
        ],
    },
    {
        "email": "player4@test.com",
        "password": "password123",
        "profile": {
            "nickname": "RusGamer",
            "bio": "Ищу тиммейтов для игры",
            "region": "EU",
            "language": "ru",
            "platforms": ["PC"],
            "playstyle": "competitive",
            "mic": True,
        },
        "games": [
            {"game": "CS2", "rank": "Global Elite", "roles": ["AWPer", "Entry"]},
        ],
        "availability": [
            {"day_of_week": 1, "start_time": "20:00", "end_time": "02:00", "timezone": "UTC+3"},
            {"day_of_week": 3, "start_time": "20:00", "end_time": "02:00", "timezone": "UTC+3"},
        ],
    },
    {
        "email": "player5@test.com",
        "password": "password123",
        "profile": {
            "nickname": "FortnitePro",
            "bio": "Fortnite competitive player",
            "region": "NA",
            "language": "en",
            "platforms": ["PC", "XBOX"],
            "playstyle": "competitive",
            "mic": True,
        },
        "games": [
            {"game": "Fortnite", "rank": "Champion", "roles": ["Fragger"]},
        ],
        "availability": [
            {"day_of_week": 1, "start_time": "17:00", "end_time": "22:00", "timezone": "UTC-8"},
            {"day_of_week": 3, "start_time": "17:00", "end_time": "22:00", "timezone": "UTC-8"},
            {"day_of_week": 5, "start_time": "17:00", "end_time": "22:00", "timezone": "UTC-8"},
        ],
    },
]

for user_data in test_users:
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data["email"]).first()
    if existing_user:
        print(f"User {user_data['email']} already exists, skipping...")
        continue
    
    # Create user
    user = User(
        email=user_data["email"],
        password_hash=get_password_hash(user_data["password"])
    )
    db.add(user)
    db.flush()
    
    # Create profile
    profile_data = user_data["profile"]
    profile = Profile(
        user_id=user.id,
        **profile_data
    )
    db.add(profile)
    db.flush()
    
    # Create user games
    for game_info in user_data["games"]:
        game = games[game_info["game"]]
        user_game = UserGame(
            user_id=user.id,
            game_id=game.id,
            rank=game_info["rank"],
            roles=game_info["roles"]
        )
        db.add(user_game)
    
    # Create availability windows
    for avail in user_data["availability"]:
        avail_window = AvailabilityWindow(
            user_id=user.id,
            day_of_week=avail["day_of_week"],
            start_time=avail["start_time"],
            end_time=avail["end_time"],
            timezone=avail["timezone"]
        )
        db.add(avail_window)
    
    print(f"Created user: {user_data['email']}")

db.commit()
print("\nSeed data created successfully!")
db.close()

