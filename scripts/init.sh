#!/usr/bin/env bash
set -euo pipefail

# Load .env variables
set -o allexport
source "${ENV_FILE:-.env}"
set +o allexport

: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD must be set in ${ENV_FILE}}"

echo "Starting ELK stack setup..."

# 1) Wait for Elasticsearch to be healthy
echo "Waiting for Elasticsearch to be healthy..."
until docker compose ${COMPOSE_FILES} exec -T elasticsearch \
  sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} 'https://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=1s' >/dev/null 2>&1"
do
  printf "."
  sleep 2
done
echo "Elasticsearch is ready."

# 2) Generate certs (if missing)
./scripts/cert_generation.sh

# 3) Create Elasticsearch users and wait for confirmation
./scripts/user_setup.sh "${ENV_FILE}"

echo "✅ ELK stack setup completed."
