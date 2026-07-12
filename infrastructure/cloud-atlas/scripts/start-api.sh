#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${API_PORT:-8090}"

if [ ! -d .venv ]; then
  echo "Run ./scripts/setup.sh first"
  exit 1
fi

if command -v lsof >/dev/null 2>&1 && lsof -ti :"$PORT" >/dev/null 2>&1; then
  echo "Port $PORT is already in use (likely a previous Cloud Atlas API)."
  echo "Run: ./scripts/stop-api.sh"
  echo "Or:  lsof -ti :$PORT | xargs kill"
  exit 1
fi

export PYTHONPATH="$ROOT"
echo "Starting API on http://localhost:$PORT"
exec .venv/bin/python -m api.main
