#!/usr/bin/env bash
set -euo pipefail

PORT="${API_PORT:-8090}"

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "Stopping process(es) on port $PORT: $PIDS"
    kill $PIDS 2>/dev/null || true
    sleep 1
  else
    echo "Nothing running on port $PORT"
  fi
else
  echo "lsof not found — stop the API manually if needed"
fi
