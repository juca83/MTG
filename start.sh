#!/bin/bash
# MTG Collection Manager - Start Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting MTG Collection Manager..."
echo ""

# Start backend
echo "[1/2] Starting FastAPI backend on http://localhost:8000"
cd "$SCRIPT_DIR/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2

# Start frontend
echo "[2/2] Starting Vite dev server on http://localhost:3000"
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "App running at:"
echo "  Local:   http://localhost:3000"
echo "  Network: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "API docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
