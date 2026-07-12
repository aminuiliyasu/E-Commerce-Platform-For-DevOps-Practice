#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"

if [ ! -d node_modules ]; then
  echo "Run ./scripts/setup.sh first"
  exit 1
fi

exec npm run dev
