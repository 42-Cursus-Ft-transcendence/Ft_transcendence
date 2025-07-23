#!/usr/bin/env sh
set -euo pipefail

: "${RPC_URL:?Error: RPC_URL must be set}"

echo "⏳ Waiting for Anvil RPC at $RPC_URL ..."
until curl -s --connect-timeout 1 "$RPC_URL" >/dev/null; do
  sleep 1
done

echo "✅ Anvil RPC is ready — starting backend"
exec "$@"
