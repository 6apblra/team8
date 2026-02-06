#!/bin/bash
EMAIL="u$(date +%s)@test.com"
echo "Registering $EMAIL..."
RESP=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\", \"password\":\"password123\"}" http://localhost:5001/api/auth/register)
TOKEN=$(echo $RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "USER_ID: $USER_ID"

echo "--- 1. POST /api/user-games (Set games) ---"
# Note: /api/user-games expects { games: [...] }
curl -s -v -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "games": [
      {
        "gameId": "valorant",
        "rank": "Gold",
        "roles": ["Duelist"],
        "playstyle": "competitive",
        "platform": "pc",
        "isPrimary": true
      }
    ]
  }' \
  "http://localhost:5001/api/user-games"
echo ""

echo "--- 2. GET /api/user-games/$USER_ID (Verify) ---"
curl -s -v -X GET -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/user-games/$USER_ID"
echo ""
