#!/bin/bash

# LLM Council - Start script
# Backend only mode (no GUI needed for OpenCode integration)

echo "Starting LLM Council..."
echo ""

# Source bash_secrets for API keys
if [ -f ~/.bash_secrets ]; then
    source ~/.bash_secrets
    echo "Loaded API keys from bash_secrets"
fi

# Start backend
echo "Starting backend on http://localhost:8800..."
uv run python -m backend.main &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 2

echo ""
echo "LLM Council is running!"
echo "  Backend:  http://localhost:8800"
echo "  Health:   http://localhost:8800/health"
echo ""
echo "Test with:"
echo '  curl -X POST http://localhost:8800/api/council \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"query": "What is 2+2?", "final_only": true}'\'''
echo ""
echo "Press Ctrl+C to stop"

# Wait for Ctrl+C
trap "kill $BACKEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
