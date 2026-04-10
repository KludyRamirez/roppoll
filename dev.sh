#!/usr/bin/env bash
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Cleanup on exit ───────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${RESET}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo -e "${GREEN}Done.${RESET}"
}
trap cleanup EXIT INT TERM

# ── 1. PostgreSQL ─────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/3] PostgreSQL${RESET}"
if brew services list | grep -q "postgresql@17.*started"; then
  echo -e "  ${GREEN}already running${RESET}"
else
  echo -e "  ${CYAN}starting...${RESET}"
  brew services start postgresql@17
  sleep 2
fi

# ── 2. Backend ────────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/3] Backend${RESET}"
if lsof -ti :5001 >/dev/null 2>&1; then
  echo -e "  ${YELLOW}port 5001 in use — killing old process${RESET}"
  lsof -ti :5001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

(cd "$ROOT/backend" && dotnet run) &>/tmp/roppoll-backend.log &
PIDS+=($!)
echo -e "  ${CYAN}waiting for http://localhost:5001...${RESET}"
for i in $(seq 1 30); do
  curl -sf http://localhost:5001/api/polls >/dev/null 2>&1 && break
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo -e "  ${RED}Backend failed to start. Check /tmp/roppoll-backend.log${RESET}"
    exit 1
  fi
done
echo -e "  ${GREEN}ready${RESET}"

# ── 3. Frontend ───────────────────────────────────────────────────────────────
echo -e "${BOLD}[3/3] Frontend${RESET}"
if lsof -ti :5173 >/dev/null 2>&1; then
  echo -e "  ${YELLOW}port 5173 in use — killing old process${RESET}"
  lsof -ti :5173 | xargs kill -9 2>/dev/null || true
  sleep 1
fi
(cd "$ROOT/frontend" && npm run dev) &>/tmp/roppoll-frontend.log &
PIDS+=($!)
echo -e "  ${CYAN}waiting for http://localhost:5173...${RESET}"
for i in $(seq 1 30); do
  curl -sf http://localhost:5173 >/dev/null 2>&1 && break
  sleep 1
  if [ "$i" -eq 30 ]; then
    echo -e "  ${RED}Frontend failed to start. Check /tmp/roppoll-frontend.log${RESET}"
    exit 1
  fi
done
echo -e "  ${GREEN}ready${RESET}"

# ── Ready ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}RopPoll is running!${RESET}"
echo -e "  App      → ${CYAN}http://localhost:5173${RESET}"
echo -e "  API      → ${CYAN}http://localhost:5001${RESET}"
echo -e "  Logs     → /tmp/roppoll-backend.log  /tmp/roppoll-frontend.log"
echo -e "\nPress ${BOLD}Ctrl+C${RESET} to stop all servers."
echo ""

# ── Tail both logs ────────────────────────────────────────────────────────────
tail -f /tmp/roppoll-backend.log /tmp/roppoll-frontend.log &
PIDS+=($!)

wait
