#!/bin/bash

set -e

API_URL="http://localhost:8000"
USER1_EMAIL="player1@test.com"
USER1_PASS="password123"
USER2_EMAIL="player2@test.com"
USER2_PASS="password123"

echo "=== Testing Swipe Logic and Match Creation ==="
echo ""

# Login User 1
echo "1. Logging in User 1 ($USER1_EMAIL)..."
USER1_LOGIN=$(curl -sS -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER1_EMAIL\",\"password\":\"$USER1_PASS\"}")

USER1_TOKEN=$(echo "$USER1_LOGIN" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "   ✓ Token: ${USER1_TOKEN:0:20}..."

# Get User 1 info
echo ""
echo "2. Getting User 1 profile..."
USER1_INFO=$(curl -sS -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $USER1_TOKEN")

USER1_ID=$(echo "$USER1_INFO" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)
echo "   ✓ User 1 ID: $USER1_ID"

# Login User 2
echo ""
echo "3. Logging in User 2 ($USER2_EMAIL)..."
USER2_LOGIN=$(curl -sS -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$USER2_EMAIL\",\"password\":\"$USER2_PASS\"}")

USER2_TOKEN=$(echo "$USER2_LOGIN" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "   ✓ Token: ${USER2_TOKEN:0:20}..."

# Get User 2 info
echo ""
echo "4. Getting User 2 profile..."
USER2_INFO=$(curl -sS -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $USER2_TOKEN")

USER2_ID=$(echo "$USER2_INFO" | grep -o '"user_id":"[^"]*' | cut -d'"' -f4)
echo "   ✓ User 2 ID: $USER2_ID"

# User 1 swipes "like" on User 2
echo ""
echo "5. User 1 swipes LIKE on User 2..."
SWIPE1=$(curl -sS -X POST "$API_URL/swipe" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"to_user_id\":\"$USER2_ID\",\"type\":\"like\"}")

SWIPE1_MATCH=$(echo "$SWIPE1" | grep -o '"is_match":[^,}]*' | cut -d':' -f2)
echo "   Response: $SWIPE1"
echo "   is_match: $SWIPE1_MATCH"

# User 2 swipes "like" on User 1 (should create match)
echo ""
echo "6. User 2 swipes LIKE on User 1 (should create MATCH)..."
SWIPE2=$(curl -sS -X POST "$API_URL/swipe" \
  -H "Authorization: Bearer $USER2_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"to_user_id\":\"$USER1_ID\",\"type\":\"like\"}")

SWIPE2_MATCH=$(echo "$SWIPE2" | grep -o '"is_match":[^,}]*' | cut -d':' -f2)
echo "   Response: $SWIPE2"
echo "   is_match: $SWIPE2_MATCH"

if [ "$SWIPE2_MATCH" = "true" ]; then
  echo ""
  echo "✓✓✓ SUCCESS! Match was created when User 2 swiped like on User 1 ✓✓✓"
else
  echo ""
  echo "✗✗✗ FAILED! Match was NOT created ✗✗✗"
fi

# Get matches for User 1
echo ""
echo "7. Checking User 1's matches..."
USER1_MATCHES=$(curl -sS -X GET "$API_URL/matches" \
  -H "Authorization: Bearer $USER1_TOKEN")
echo "   Matches: $USER1_MATCHES"

# Get matches for User 2
echo ""
echo "8. Checking User 2's matches..."
USER2_MATCHES=$(curl -sS -X GET "$API_URL/matches" \
  -H "Authorization: Bearer $USER2_TOKEN")
echo "   Matches: $USER2_MATCHES"
