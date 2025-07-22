#!/usr/bin/env bash
set -euo pipefail

echo "🔐 Bootstrapping user_setup.sh start"
# Load environment variables from .env
set -o allexport
source "${ENV_FILE}"
set +o allexport


: "${ELASTIC_PASSWORD:?Need ELASTIC_PASSWORD to be set in ${ENV_FILE}}"

echo "🔐 Bootstrapping ${ENV_FILE} Generating Kibana User & Logstash User…"
[ -f "${ENV_FILE}" ] && echo "DEBUG: ${ENV_FILE} exists" || echo "DEBUG: ${ENV_FILE} does NOT exist"

# Function to update or add variables in .env file
upsert() {
  local var=$1 val=$2
  if grep -q "^${var}=" "${ENV_FILE}"; then
    if sed --version >/dev/null 2>&1; then
      sed -i "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    else
      sed -i '' "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    fi
  else
    echo "${var}=${val}" >> "${ENV_FILE}"
  fi
}

# Generate passwords if not exist
if ! grep -q '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" || [ -z "$(grep '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  KIBANA_PASS=$(openssl rand -hex 16)
  upsert KIBANA_SYSTEM_PASSWORD "$KIBANA_PASS"
  echo "• Generated KIBANA_SYSTEM_PASSWORD"
else
  KIBANA_PASS=$(grep '^KIBANA_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)
  echo "• KIBANA_SYSTEM_PASSWORD exists, skipping"
fi

if ! grep -q '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" || [ -z "$(grep '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)" ]; then
  LOGSTASH_PASS=$(openssl rand -hex 16)
  upsert LOGSTASH_SYSTEM_PASSWORD "$LOGSTASH_PASS"
  echo "• Generated LOGSTASH_SYSTEM_PASSWORD"
else
  LOGSTASH_PASS=$(grep '^LOGSTASH_SYSTEM_PASSWORD=' "${ENV_FILE}" | cut -d'=' -f2-)
  echo "• LOGSTASH_SYSTEM_PASSWORD exists, skipping"
fi

# Function to create a user in Elasticsearch if not exists
create_user() {
  local username=$1
  local password=$2
  local role=$3

  echo "Creating user $username..."
  if docker compose exec -T elasticsearch sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -s -o /dev/null -w '%{http_code}' https://localhost:9200/_security/user/${username}" | grep -q '^200$'; then
    echo "User $username already exists, skipping."
  else
    docker compose exec -T elasticsearch sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -X POST https://localhost:9200/_security/user/${username} -H 'Content-Type: application/json' -d '{
      \"password\": \"${password}\",
      \"roles\": [\"${role}\"],
      \"full_name\": \"${username} user\",
      \"enabled\": true
    }'"
    echo "User $username creation requested."
  fi

  echo "Waiting for user $username to be fully created..."
  until status=$(docker compose exec -T elasticsearch sh -c "curl -k -u elastic:${ELASTIC_PASSWORD} -s -o /dev/null -w '%{http_code}' https://localhost:9200/_security/user/${username}") && [ "$status" = "200" ]; do
    printf "."
    sleep 2
  done
  echo "User $username confirmed."
}

# Create Kibana and Logstash users
create_user kibana_system "$KIBANA_PASS" kibana_system
create_user logstash_system "$LOGSTASH_PASS" logstash_system

echo "✅ Elasticsearch users created and passwords stored in .env"
