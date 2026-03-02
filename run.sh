#!/usr/bin/env bash
set -euo pipefail

# Usage: ./run.sh [port]
# Starts an HTTP server in this folder (so example.ttl can be fetched).

PORT="${1:-8000}"

cd "$(dirname "$0")"

echo "Serving: $(pwd)"
echo "URL: http://localhost:${PORT}"
echo

if command -v python3 >/dev/null 2>&1; then
  echo "Using python3 http.server..."
  python3 -m http.server "${PORT}"
elif command -v python >/dev/null 2>&1; then
  echo "Using python http.server..."
  python -m http.server "${PORT}"
elif command -v node >/dev/null 2>&1; then
  echo "Using npx http-server..."
  npx http-server -p "${PORT}" -c-1
else
  echo "No Python or Node found."
  echo "Install Python (recommended) or Node.js, then rerun."
  exit 1
fi

