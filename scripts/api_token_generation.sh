#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=${ENV_FILE:-.env}

# Load environment variables from .env
set -o allexport
source "$ENV_FILE"
set +o allexport

: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD must be set in ${ENV_FILE}}"

# Function to insert or update a variable in the .env file
upsert() {
  local var=$1 val=$2
  if grep -q "^${var}=" "${ENV_FILE}"; then
    # Replace existing line
    if sed --version >/dev/null 2>&1; then
      sed -i "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    else
      sed -i '' "s|^${var}=.*|${var}=${val}|" "${ENV_FILE}"
    fi
  else
    # Append new line
    echo "${var}=${val}" >> "${ENV_FILE}"
  fi
}

docker compose exec -T elasticsearch sh -euo<<'EOS'
  # ---- create or recreate Kibana token -------------------------------
  API_JSON=$(curl -s -u "elastic:${ELASTIC_PASSWORD}" -k \
      --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
      -X POST "https://localhost:9200/_security/service/elastic/kibana/credential/token/kibana-token")
  # 409 error, delete and regenerate existing token
  if echo "$API_JSON" | grep -q '"status":409'; then
    echo "⚠️  Existing token conflict detected, deleting and recreating..."
    curl -s -u "elastic:${ELASTIC_PASSWORD}" -k \
      --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
      -X DELETE "https://localhost:9200/_security/service/elastic/kibana/credential/token/kibana-token"

    API_JSON=$(curl -s -u "elastic:${ELASTIC_PASSWORD}" -k \
      --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
      -X POST "https://localhost:9200/_security/service/elastic/kibana/credential/token/kibana-token")
  fi

  # Extracting token.value from JSON
  TOKEN=$(echo "$API_JSON" | sed -n 's/.*"value"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  if [ -z "$TOKEN" ]; then
    echo "❌ token generation failed: $API_JSON" >&2
    exit 1
  fi

  # ---- write to shared volume ----------------------------------------
  CLEAN_TOKEN=$(printf "%s" "$TOKEN" | tr -d "\r\n")
  DEST=/usr/share/elasticsearch/config/shared/tokens/kibana
  mkdir -p "$DEST"
  printf "%s" "$CLEAN_TOKEN" > "$DEST/service.token"
  chmod 600 "$DEST/service.token"
  echo "✔ Kibana service token saved to shared/tokens/kibana/service.token in es container"
EOS



docker compose exec -T elasticsearch sh -euo <<'EOS'
  echo "🔍 [DEBUG] Fetching Kibana service account credentials list..."
  RESPONSE=$(curl -s -u "elastic:${ELASTIC_PASSWORD}" -k \
       --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
       -X GET "https://localhost:9200/_security/service/elastic/kibana/credential?pretty")
  STATUS=$?
  echo "🔍 [DEBUG] curl exit code: $STATUS"
  echo "🔍 [DEBUG] Response body:"
  echo "$RESPONSE"
  echo "🔍 [DEBUG] Parsing count field..."
  COUNT=$(echo "$RESPONSE" | sed -n 's/.*"count"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p')
  echo "🔍 [DEBUG] count = $COUNT"
  echo "🔍 [DEBUG] Finished debug run."
EOS

# 2) Read the persisted token on elastic container and update .env
if TOKEN_VALUE=$(docker compose exec -T elasticsearch \
    sh -c 'cat /usr/share/elasticsearch/config/shared/tokens/kibana/service.token' 2>/dev/null); then

  # get current value from .env (or empty if not set)
  CURRENT_VALUE=$(grep -E '^KIBANA_SERVICE_TOKEN=' "${ENV_FILE}" | cut -d= -f2- || true)

  if [ "$TOKEN_VALUE" != "$CURRENT_VALUE" ]; then
    upsert KIBANA_SERVICE_TOKEN "$TOKEN_VALUE"
    echo "✔ Updated KIBANA_SERVICE_TOKEN in .env"
  else
    echo "✔ KIBANA_SERVICE_TOKEN unchanged"
  fi

else
  echo "❌ Token file not found in elasticsearch container" >&2
  exit 1
fi

# 2) Always (re‑)generate Logstash API key
echo "• Generating Logstash API key..."
API_JSON=$(docker exec -i es sh -c '\
  curl -s -u elastic:'"${ELASTIC_PASSWORD}"' -k \
    --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
    -X POST "https://localhost:9200/_security/api_key" \
    -H "Content-Type: application/json" \
    -d '\''{
      "name": "logstash_api_key",
      "role_descriptors": {
        "logstash_writer": {
          "cluster": ["monitor", "manage_index_templates", "manage_ilm"],
          "index": [
            {
              "names": ["ft_transcende-logs", "ft_transcende-logs-*"],
              "privileges": ["create","create_index","write", "manage"]
            }
          ]
        }
      }
    }'\'' \
')

if echo "$API_JSON" | jq -e 'has("error")' >/dev/null; then
  echo "❌ Main Logstash API key Creating Failure:"
  echo "$API_JSON" | jq .
  exit 1
fi

ID=$(printf '%s' "$API_JSON" \
       | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
KEY=$(printf '%s' "$API_JSON" \
        | sed -n 's/.*"api_key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

upsert LOGSTASH_API_KEY "${ID}:${KEY}"
echo "✔ Logstash API key stored in .env"

# 3) Always (re‑)generate Logstash Monitoring API key
echo "• Generating Logstash Monitoring API key..."
API_JSON=$(docker exec -i es sh -c '\
  curl -s -u elastic:'"${ELASTIC_PASSWORD}"' -k \
    --cacert /usr/share/elasticsearch/config/shared/ca/ca.crt \
    -X POST "https://localhost:9200/_security/api_key" \
    -H "Content-Type: application/json" \
    -d '\''{
      "name": "logstash_monitoring_key",
      "role_descriptors": {
        "logstash_monitoring": {
          "cluster": ["monitor", "manage"],
          "indices": [
            {
              "names": [".monitoring-*"],
              "privileges": ["read","write","create_index","indices:admin/mapping/put"]
            }
          ]
        }
      }
    }'\'' \
')

if echo "$API_JSON" | jq -e 'has("error")' >/dev/null; then
  echo "❌ Monitoring API key Creating Failure:"
  echo "$API_JSON" | jq .
  exit 1
fi

ID=$(printf '%s' "$API_JSON" \
       | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
KEY=$(printf '%s' "$API_JSON" \
        | sed -n 's/.*"api_key"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

upsert LOGSTASH_MONITORING_API_KEY "${ID}:${KEY}"
echo "✔ Logstash Monitoring API key stored in .env"


echo "✅ All tokens and API keys have been written to $ENV_FILE"