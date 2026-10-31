#!/usr/bin/env bash
# Deploy frontend SvelteKit ke VPS (Docker + Nginx Proxy Manager)
# Usage: ./deploy.sh            -> git pull + build + up
#        ./deploy.sh --no-pull  -> tanpa git pull
set -euo pipefail

cd "$(dirname "$0")"

SERVICE="dessertbyfir-web"
CONTAINER="dessertbyfir_web"
NETWORK="nginx_proxy"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null || fail "docker belum terinstall"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin belum terinstall"

[ -f .env ] || fail ".env tidak ditemukan. Copy dari .env.example lalu isi PUBLIC_API_BASE_URL & ORIGIN"
grep -qE '^PUBLIC_API_BASE_URL=.+' .env || fail "PUBLIC_API_BASE_URL belum diisi di .env"

if ! docker network inspect "$NETWORK" >/dev/null 2>&1; then
  log "Network $NETWORK belum ada, membuat..."
  docker network create "$NETWORK"
fi

if [ "${1:-}" != "--no-pull" ] && [ -d .git ]; then
  log "git pull"
  git pull --ff-only
fi

log "Build image"
docker compose build --pull "$SERVICE"

log "Start container"
docker compose up -d --remove-orphans "$SERVICE"

log "Menunggu container healthy..."
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "unknown")
  if [ "$status" = "healthy" ]; then
    log "Container healthy ✅"
    break
  fi
  if [ "$i" -eq 30 ]; then
    docker compose logs --tail=50 "$SERVICE"
    fail "Container tidak healthy (status: $status)"
  fi
  sleep 3
done

log "Bersihkan image lama"
docker image prune -f >/dev/null

docker compose ps "$SERVICE"
log "Deploy selesai. Arahkan Nginx Proxy Manager ke http://$CONTAINER:3000"
