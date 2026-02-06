#!/bin/bash
EMAIL="u$(date +%s)@test.com"
echo "Registering $EMAIL..."
RESP=$(curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\", \"password\":\"password123\"}" http://localhost:5001/api/auth/register)
TOKEN=$(echo $RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo $RESP | grep -o '"id":"[^"]*' | cut -d'"' -f4)

echo "USER_ID: $USER_ID"

echo "--- 1. Testing PUT (Update) on non-existent profile ---"
curl -s -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"UpdNick", "region":"eu", "micEnabled": true, "languages": ["en"]}' \
  "http://localhost:5001/api/profile/$USER_ID"
echo ""

echo "--- 2. Testing POST (Create) ---"
curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"NewNick", "region":"na", "micEnabled": true, "languages": ["en"]}' \
  "http://localhost:5001/api/profile"
echo ""

echo "--- 3. Testing PUT (Update) after Create ---"
curl -s -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"UpdNick2", "region":"eu", "micEnabled": false, "languages": ["fr"]}' \
  "http://localhost:5001/api/profile/$USER_ID"
echo ""

echo "--- 4. Testing Incorrect URL ---"
curl -s -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"nickname":"UpdNick3", "region":"eu"}' \
  "http://localhost:5001/api/api/profile/$USER_ID"
echo ""
