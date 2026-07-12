#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example — edit AWS_PROFILE and TF_STATE_BUCKET before scanning."
fi

if [ ! -d .venv ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

echo "Installing Python dependencies..."
.venv/bin/pip install --upgrade pip -q
.venv/bin/pip install -r requirements.txt -q

if [ ! -d web/node_modules ]; then
  echo "Installing web dependencies..."
  (cd web && npm install)
fi

echo ""
echo "Setup complete. Run in two terminals:"
echo "  ./scripts/start-api.sh"
echo "  ./scripts/start-web.sh"
