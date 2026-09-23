#!/usr/bin/env bash
# Starts the backend and the admin dashboard together, and keeps them together:
# Ctrl+C stops both, so neither is left running or silently stopped on its own.
#
#   ./start.sh
#
# The Expo app is separate on purpose — it wants an interactive terminal:
#   cd app && npx expo start

set -u
cd "$(dirname "$0")"

API_PORT="$(grep -E '^PORT=' backend/.env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')"
API_PORT="${API_PORT:-5050}"

port_busy() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

if port_busy "$API_PORT"; then
  echo "⚠️  Port $API_PORT is already in use — the backend may already be running."
  echo "   Stop it first, or change PORT in backend/.env."
  exit 1
fi

pids=()
cleanup() {
  echo ""
  echo "Stopping…"
  for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "Starting backend on :$API_PORT…"
( cd backend && npm run dev ) & pids+=($!)

# Wait for the API before starting Vite, so the first page load never hits a dead proxy.
for _ in $(seq 1 60); do
  curl -sf "http://localhost:$API_PORT/api/health" >/dev/null 2>&1 && break
  sleep 1
done

if ! curl -sf "http://localhost:$API_PORT/api/health" >/dev/null 2>&1; then
  echo "❌ Backend did not come up. Check the output above — usually MONGODB_URI."
  echo "   Diagnose it with: cd backend && npm run db:check"
  cleanup
fi

echo "✅ API ready at http://localhost:$API_PORT"
echo "Starting admin dashboard…"
( cd admin && npm run dev ) & pids+=($!)

echo ""
echo "  Admin : http://localhost:5173"
echo "  API   : http://localhost:$API_PORT"
echo "  App   : cd app && npx expo start   (separate terminal)"
echo ""
echo "Ctrl+C stops both."
wait
