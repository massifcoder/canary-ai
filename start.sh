#!/bin/bash
# Start both Canary servers for demo
set -e

echo "🐤 Starting Canary..."

# Kill existing servers
kill $(lsof -ti :8000) 2>/dev/null || true
kill $(lsof -ti :3001) 2>/dev/null || true
sleep 1

# Start backend
cd "$(dirname "$0")"
source .venv/bin/activate
echo "  Starting backend on :8000..."
uvicorn backend.api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
sleep 2

# Start frontend
echo "  Starting frontend on :3001..."
cd frontend
npx next dev --port 3001 &
FRONTEND_PID=$!
sleep 3

echo ""
echo "🐤 Canary is running!"
echo "   Demo UI:    http://localhost:3001"
echo "   Dashboard:  http://localhost:3001/dashboard"
echo "   API:        http://localhost:8000/api/health"
echo ""
echo "   Auto-start: http://localhost:3001/?auto=on   (protected)"
echo "               http://localhost:3001/?auto=off  (unprotected)"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
