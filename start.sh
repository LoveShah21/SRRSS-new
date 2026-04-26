#!/bin/bash
set -e

echo "Starting AI Service on port 8000..."
cd /app/ai-service
# Run uvicorn in the background
python -m uvicorn app:app --host 127.0.0.1 --port 8000 &
AI_PID=$!

echo "Starting Node.js Backend..."
cd /app/backend
# Start the node server in the foreground
npm start

# If the node server exits, kill the AI service
kill $AI_PID
