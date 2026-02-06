#!/bin/bash
EMAIL="u$(date +%s)@test.com"
echo "Registering $EMAIL..."
RESP=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\", \"password\":\"password123\"}" http://localhost:5001/api/auth/register)
TOKEN=$(echo $RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "USER_ID: $USER_ID"

echo "--- 1. Create Profile ---"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"GamerOne", "region":"eu", "micEnabled": true, "languages": ["en"]}' \
  "http://localhost:5001/api/profile"
echo ""

echo "--- 2. Add Games (POST /api/user-games) ---"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "games": [
      {
        "gameId": "wot",
        "rank": "Good",
        "roles": ["Heavy"],
        "playstyle": "competitive",
        "platform": "pc",
        "isPrimary": true
      },
      {
        "gameId": "apex",
        "rank": "Gold",
        "roles": ["Assault"],
        "playstyle": "casual",
        "platform": "pc"
      }
    ]
  }' \
  "http://localhost:5001/api/user-games"
echo ""

echo "--- 3. GET /api/profile/$USER_ID (Full Profile Check) ---"
# We want to see if userGames are included in the profile response
curl -s -X GET -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5001/api/profile/$USER_ID"
echo ""
