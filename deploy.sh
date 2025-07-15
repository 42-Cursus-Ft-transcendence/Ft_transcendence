#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Starting Anvil via Docker Compose..."
docker compose -f src/docker/docker-compose.yml \
  up --build --force-recreate -d anvil

echo "⌛ Waiting for Anvil RPC at http://127.0.0.1:8545..."
for i in {1..10}; do
  if nc -z 127.0.0.1 8545; then
    break
  fi
  sleep 1
done

echo "🌐 Exporting RPC_URL and PRIVATE_KEY..."
export RPC_URL="http://127.0.0.1:8545"
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

echo "📦 Deploying ScoreBoard.sol with Forge…"
pushd contracts > /dev/null
forge create \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  src/ScoreBoard.sol:ScoreBoard
popd > /dev/null

echo "✅ Deployment complete. Check the above logs for the deployed address."
