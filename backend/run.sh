#!/bin/bash
# Script to run backend locally

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run migrations
alembic upgrade head

# Seed database (optional, comment out if you don't want to reseed)
# python seed.py

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

