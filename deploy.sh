#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$SCRIPT_DIR"

# ───────────────────────────────────────────────────────────────
# 1) Determine architecture and store in env
# ───────────────────────────────────────────────────────────────
ARCH=$(uname -m)
export ARCH
# Persist ARCH in .env if desired
if grep -q '^ARCH=' .env; then
  sed -i "s/^ARCH=.*/ARCH=$ARCH/" .env
else
  echo "ARCH=$ARCH" >> .env
fi

echo "Detected architecture: $ARCH"

COMPOSE_FILES="-f docker-compose.yml"
EXTRA_FLAGS=""
if [ "$ARCH" = "aarch64" ]; then
  echo "Using ARM64 override compose file"
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.aarch64.yml"
  EXTRA_FLAGS="--remove-orphans"
else
  echo "Using default compose file"
fi
# ───────────────────────────────────────────────────────────────
# 2) Load environment variables from .env files
# ───────────────────────────────────────────────────────────────
if [ -f src/back/.env.backend ]; then
  echo "🔑 Loading backend .env.backend"
  set -a; source src/back/.env.backend; set +a
fi

# Default RPC endpoint and require PRIVATE_KEY
: "${RPC_URL:?Error: RPC_URL must be set in .env.backend}"
: "${PRIVATE_KEY:?Error: PRIVATE_KEY must be set in .env.backend}"

# Forcefully remove stale ARM containers (e.g., anvil, transcendence) by killing their PIDs if needed.
CONTAINERS_TO_CLEAN=("anvil" "transcendence")

for NAME in "${CONTAINERS_TO_CLEAN[@]}"; do
  if docker ps -a --format '{{.Names}}' | grep -q "^$NAME$"; then
    echo "ARM detected. Checking '$NAME' container state..."

    PID=$(docker inspect --format '{{.State.Pid}}' "$NAME")
    if [ "$PID" -ne 0 ]; then
      echo "Killing PID $PID ($NAME container)..."
      sudo kill -9 "$PID"
      sleep 1
    fi

    echo "Removing '$NAME' container..."
    docker rm -f "$NAME" || {
      echo "Still failed. Restarting Docker..."
      sudo systemctl restart docker
      docker rm -f "$NAME"
    }
  fi
done
# ───────────────────────────────────────────────────────────────
# 3) Start Anvil via Docker Compose
# ───────────────────────────────────────────────────────────────
echo "🚀 Starting Anvil service..."
docker compose $COMPOSE_FILES up --build --force-recreate $EXTRA_FLAGS -d anvil

# ───────────────────────────────────────────────────────────────
# 4) Wait until Anvil RPC is ready inside the network
# ───────────────────────────────────────────────────────────────
echo "🔧 Installing curl in Anvil container (as root)..."
docker compose $COMPOSE_FILES exec -T --user root anvil sh -c \
	'apt-get update -qq && apt-get install -qq -y curl >/dev/null 2>&1'
echo "⌛ Waiting for Anvil RPC inside container (localhost:8545)..."
until docker compose $COMPOSE_FILES exec -T anvil sh -c 'curl -s --connect-timeout 1 http://localhost:8545 >/dev/null'; do
  sleep 1
done
echo "✅ Anvil RPC is up!"

# ───────────────────────────────────────────────────────────────
# 5) Compile & Deploy via Foundry in a single container
# ───────────────────────────────────────────────────────────────
echo "🔨 Compiling and deploying via Foundry ($ARCH)..."
docker compose $COMPOSE_FILES up --build --force-recreate $EXTRA_FLAGS deployer
echo "🚀 Compilation and deployment complete!"

# ───────────────────────────────────────────────────────────────
# 6) Bring up the rest of the services
# ───────────────────────────────────────────────────────────────
echo "🔄 Starting backend, nginx, Prometheus, Grafana..."
docker compose $COMPOSE_FILES  up --build --force-recreate $EXTRA_FLAGS -d \
  backend nginx nginx-prometheus-exporter prometheus grafana
echo "✅ All services are now running!"

