#!/bin/bash

API_URL=${1:-"http://localhost:4000"}

echo "=== DemoForge Smoke Test ==="
echo "Target: $API_URL"
echo ""

# a. Hits /api/health
echo "[1/5] Checking health..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/health)
if [ "$HEALTH_STATUS" -ne 200 ]; then
  echo "❌ Health check failed with status $HEALTH_STATUS"
  exit 1
fi
echo "✅ Health check passed (Status: 200)"
echo ""

# b. POSTs /api/auth/register with test credentials
echo "[2/5] Registering test user..."
TIMESTAMP=$(date +%s)
EMAIL="test_${TIMESTAMP}@example.com"
REGISTER_RES=$(curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test User\",\"email\":\"$EMAIL\",\"password\":\"Test@1234\"}")

# Basic check if it contains the email
if echo "$REGISTER_RES" | grep -q "$EMAIL"; then
  echo "✅ User registered successfully ($EMAIL)"
else
  echo "❌ Registration failed"
  echo "Response: $REGISTER_RES"
  exit 1
fi
echo ""

# c. POSTs /api/auth/login -> captures token
echo "[3/5] Logging in..."
LOGIN_RES=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test@1234\"}")
TOKEN=$(echo "$LOGIN_RES" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login and extract token"
  echo "Response: $LOGIN_RES"
  exit 1
fi
echo "✅ Logged in successfully. Token acquired."
echo ""

# d. POSTs /api/jobs with https://example.com + modern-saas
echo "[4/5] Creating demo job..."
JOB_RES=$(curl -s -X POST $API_URL/api/jobs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","templateId":"modern-saas"}')
JOB_ID=$(echo "$JOB_RES" | grep -o '"jobId":"[^"]*' | grep -o '[^"]*$')

if [ -z "$JOB_ID" ]; then
  echo "❌ Failed to create job"
  echo "Response: $JOB_RES"
  exit 1
fi
echo "✅ Job created with ID: $JOB_ID"
echo ""

# e. Polls GET /api/jobs/:id every 5s until status=DONE or FAILED (timeout 10min)
echo "[5/5] Polling job status (timeout 10 min)..."
TIMEOUT=600
ELAPSED=0
STATUS=""

while [ $ELAPSED -lt $TIMEOUT ]; do
  JOB_STATUS_RES=$(curl -s -X GET "$API_URL/api/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")
  
  STATUS=$(echo "$JOB_STATUS_RES" | grep -o '"status":"[^"]*' | grep -o '[^"]*$')
  
  if [ "$STATUS" = "DONE" ]; then
    VIDEO_URL=$(echo "$JOB_STATUS_RES" | grep -o '"publicUrl":"[^"]*' | grep -o '[^"]*$')
    echo "✅ [${ELAPSED}s] Job completed successfully!"
    echo "🎥 Video URL: $VIDEO_URL"
    exit 0
  elif [ "$STATUS" = "FAILED" ]; then
    ERROR_MSG=$(echo "$JOB_STATUS_RES" | grep -o '"errorMessage":"[^"]*' | grep -o '[^"]*$')
    echo "❌ [${ELAPSED}s] Job failed!"
    echo "Error: $ERROR_MSG"
    exit 1
  fi

  echo "⏳ [${ELAPSED}s] Current status: $STATUS"
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo "❌ Job timed out after 10 minutes"
exit 1
