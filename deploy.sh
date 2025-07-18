#!/usr/bin/env bash
set -euo pipefail

# Mute Foundry nightly warning
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

# ───────────────────────────────────────────────────────────────
# 1) Load environment variables
# ───────────────────────────────────────────────────────────────
if [ -f .env ]; then
  echo "🔑 Loading global .env"
  export $(grep -v '^\s*#' .env | xargs)
fi
if [ -f src/back/.env.backend ]; then
  echo "🔑 Loading backend .env.backend"
  export $(grep -v '^\s*#' src/back/.env.backend | xargs)
fi

: "${RPC_URL:=http://127.0.0.1:8545}"
: "${RPC_HOST:=127.0.0.1}"
: "${RPC_PORT:=8545}"
: "${PRIVATE_KEY:?PRIVATE_KEY must be set in .env or .env.backend}"

# ───────────────────────────────────────────────────────────────
# 2) Start Anvil via Docker Compose
# ───────────────────────────────────────────────────────────────
echo "🚀 Starting Anvil..."
docker compose up --build --force-recreate -d anvil

# ───────────────────────────────────────────────────────────────
# 3) Wait for Anvil RPC to be ready
# ───────────────────────────────────────────────────────────────
if ! command -v nc >/dev/null 2>&1; then
  echo "❌ netcat (nc) not found. Please install it." >&2
  exit 1
fi

echo "⌛ Waiting for Anvil RPC at ${RPC_URL}..."
timeout=30; interval=1; elapsed=0
while ! nc -z "${RPC_HOST}" "${RPC_PORT}"; do
  sleep "$interval"
  elapsed=$(( elapsed + interval ))
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "❌ Timeout waiting for Anvil RPC" >&2
    exit 1
  fi
done
echo "✅ Anvil is up!"

# ───────────────────────────────────────────────────────────────
# 4) Deploy ScoreBoard contract via compose-run
# ───────────────────────────────────────────────────────────────
echo "📦 Deploying ScoreBoard.sol with Forge via Docker Compose…"
docker compose run --rm deployer

echo "🚀 Deployment complete."

# ───────────────────────────────────────────────────────────────
# 5) Bring up rest of the stack
# ───────────────────────────────────────────────────────────────
echo "🔄 Starting backend, nginx, prometheus, grafana..."
docker compose up --build --force-recreate -d \
  backend nginx nginx-prometheus-exporter prometheus grafana

echo "🚀 All services are now running."