#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────
# Mirror — Start all dev services with one command
# Usage: ./scripts/dev.sh          (all services)
#        ./scripts/dev.sh --skip-docker  (skip Docker, assume DB/Redis running)
# ──────────────────────────────────────────────────────────
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKIP_DOCKER=false
PIDS=()


for arg in "$@"; do
  case "$arg" in
    --skip-docker) SKIP_DOCKER=true ;;
  esac
done

cleanup() {
  echo ""
  echo "Shutting down..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[mirror]${NC} $*"; }
warn() { echo -e "${YELLOW}[mirror]${NC} $*"; }
err()  { echo -e "${RED}[mirror]${NC} $*"; }

# ── 1. Docker (PostgreSQL + Redis) ──────────────────────
if [ "$SKIP_DOCKER" = false ]; then
  if docker info >/dev/null 2>&1; then
    log "Starting PostgreSQL + Redis via Docker..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d postgres redis

    log "Waiting for PostgreSQL..."
    for i in $(seq 1 30); do
      if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T postgres pg_isready -U mirror -q 2>/dev/null; then
        break
      fi
      sleep 1
    done
    log "PostgreSQL ready."

    log "Waiting for Redis..."
    for i in $(seq 1 15); do
      if docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        break
      fi
      sleep 1
    done
    log "Redis ready."
  else
    warn "Docker is not running — skipping PostgreSQL + Redis."
    warn "Start Docker Desktop or use: ./scripts/dev.sh --skip-docker"
    warn "Backend API may fail DB/Redis connections but frontend will still work."
  fi
else
  warn "Skipping Docker (--skip-docker flag)"
fi

# ── 2. Database migrations ──────────────────────────────
cd "$ROOT_DIR/backend"
if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

log "Running database migrations..."
if alembic upgrade head 2>&1 | tail -3; then
  log "Migrations complete."
else
  warn "Migrations failed (database may not be reachable). Continuing anyway..."
fi

# ── 3. Backend API ──────────────────────────────────────
log "Starting backend API on :8000..."
cd "$ROOT_DIR/backend"
uvicorn app.main:app --reload --port 8000 2>&1 | sed "s/^/${BLUE}[backend]${NC} /" &
PIDS+=($!)

# Give backend a moment to start
sleep 2

# ── 4. arq Worker (processes study jobs) ────────────────
MAGENTA='\033[0;35m'
log "Starting arq worker..."
cd "$ROOT_DIR/backend"
python scripts/dev_worker.py 2>&1 | sed "s/^/${MAGENTA}[worker]${NC}  /" &
PIDS+=($!)

sleep 1

# ── 5. Frontend ─────────────────────────────────────────
log "Starting frontend on :3000..."
cd "$ROOT_DIR/frontend"
npm run dev 2>&1 | sed "s/^/${YELLOW}[frontend]${NC} /" &
PIDS+=($!)

sleep 2

# ── Ready ───────────────────────────────────────────────
echo ""
log "================================================"
log "  Mirror is running!"
log "  Frontend:  http://localhost:3000"
log "  Backend:   http://localhost:8000"
log "  API docs:  http://localhost:8000/docs"
log "  Worker:    arq (processing study jobs)"
log "================================================"
echo ""
log "Press Ctrl+C to stop all services."
echo ""

# Wait for any child to exit
wait
