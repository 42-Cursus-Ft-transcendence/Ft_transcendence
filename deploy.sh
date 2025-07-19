#!/usr/bin/env bash
set -euo pipefail

# ───────────────────────────────────────────────────────────────
# 0) Mute Foundry nightly warning
# ───────────────────────────────────────────────────────────────
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

# ───────────────────────────────────────────────────────────────
# 1) Load environment variables from .env files
# ───────────────────────────────────────────────────────────────
if [ -f src/back/.env.backend ]; then
  echo "🔑 Loading backend .env.backend"
  set -a; source src/back/.env.backend; set +a
fi

# Default RPC endpoint and require PRIVATE_KEY
: "${RPC_URL:?Error: RPC_URL must be set in .env.backend}"
: "${PRIVATE_KEY:?Error: PRIVATE_KEY must be set in .env.backend}"

# ───────────────────────────────────────────────────────────────
# 2) Start Anvil via Docker Compose
# ───────────────────────────────────────────────────────────────
echo "🚀 Starting Anvil service..."
docker compose up --build --force-recreate -d anvil

# ───────────────────────────────────────────────────────────────
# 3) Wait until Anvil RPC is ready inside the network
# ───────────────────────────────────────────────────────────────
echo "🔧 Installing curl in Anvil container (as root)..."
docker compose exec -T --user root anvil sh -c \
	'apt-get update -qq && apt-get install -qq -y curl >/dev/null 2>&1'
echo "⌛ Waiting for Anvil RPC inside container (localhost:8545)..."
until docker compose exec -T anvil sh -c 'curl -s --connect-timeout 1 http://localhost:8545 >/dev/null'; do
  sleep 1
done
echo "✅ Anvil RPC is up!"

# ───────────────────────────────────────────────────────────────
# 4 & 5) Compile & Deploy via Foundry in a single container
# ───────────────────────────────────────────────────────────────
echo "🔨 Compiling and deploying via Foundry..."
docker compose run --rm deployer
echo "🚀 Compilation and deployment complete!"

# ───────────────────────────────────────────────────────────────
# 6) Bring up the rest of the services
# ───────────────────────────────────────────────────────────────
echo "🔄 Starting backend, nginx, Prometheus, Grafana..."
docker compose up --build --force-recreate -d \
  backend nginx nginx-prometheus-exporter prometheus grafana
echo "✅ All services are now running!"

